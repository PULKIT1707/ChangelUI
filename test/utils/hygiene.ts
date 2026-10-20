// Static source checks for src/ (design 11.2 hygiene row, 5.8, 5.10 naming rule, 5.12 reset rule).
// Every check is a pure function over (fileName, source) returning failure messages, so the test
// can run it over the real tree and over inline passing/failing snippets.
import ts from "typescript";

/** Closed list of SVG-internal tags exempt from the reset rule (mirrors design 5.12 exactly). */
export const SVG_INTERNAL_TAGS: ReadonlySet<string> = new Set([
  // shapes and structure
  "g",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "defs",
  "symbol",
  "use",
  "marker",
  "pattern",
  "mask",
  "clipPath",
  "foreignObject",
  // paint
  "linearGradient",
  "radialGradient",
  "stop",
  // text and metadata
  "text",
  "tspan",
  "textPath",
  "title",
  "desc",
  // filters
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
]);

export const RESET_CONSTANTS = ["controlReset", "blockReset", "listReset"] as const;
type ResetName = (typeof RESET_CONSTANTS)[number];

/** Directories whose files always need "use client" (design 5.8), plus top-level chart entries. */
const CLIENT_DIRS = /(^|\/)src\/(?:(components|text|effects|backgrounds|hooks)\/|charts\/[^/]+\.tsx$)/;
/** Files that must never carry the directive (server-safe entries). */
const NO_DIRECTIVE = /(^|\/)src\/(lib\/(cn|theme-script)|charts\/chart-scales)\.ts$/;
/** Chart core: the directive is required if and only if the file value-imports react or motion. */
const CHART_CORE = /(^|\/)src\/charts\/core\//;
const CLIENT_SPECIFIER = /^(react|react-dom|motion)(\/|$)/;

export function parse(fileName: string, source: string): ts.SourceFile {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
}

function where(sf: ts.SourceFile, node: ts.Node): string {
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `${sf.fileName}:${line + 1}`;
}

function isValueImport(statement: ts.ImportDeclaration): boolean {
  const clause = statement.importClause;
  if (!clause) return true; // side-effect import
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  const bindings = clause.namedBindings;
  if (!bindings) return false;
  if (ts.isNamespaceImport(bindings)) return true;
  return bindings.elements.length === 0 || bindings.elements.some((element) => !element.isTypeOnly);
}

function hasDirectiveFirst(sf: ts.SourceFile): boolean {
  const first = sf.statements[0];
  return (
    first !== undefined &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use client"
  );
}

/** "use client" is the first statement where 5.8 requires it, and absent from cn/theme-script. */
export function checkUseClient(fileName: string, source: string): string[] {
  const sf = parse(fileName, source);
  if (NO_DIRECTIVE.test(fileName)) {
    return source.includes("use client") ? [`${fileName}: must not contain "use client"`] : [];
  }
  const importsClient = sf.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      CLIENT_SPECIFIER.test(s.moduleSpecifier.text) &&
      isValueImport(s),
  );
  const needs = CLIENT_DIRS.test(fileName) || importsClient;
  if (CHART_CORE.test(fileName) && !needs && hasDirectiveFirst(sf)) {
    return [`${fileName}: pure chart core modules must not contain "use client" (keeps chart-scales server-safe)`];
  }
  return needs && !hasDirectiveFirst(sf) ? [`${fileName}: "use client" must be the first statement`] : [];
}

/** Every module specifier a file imports or re-exports (static, dynamic and require). */
export function moduleSpecifiers(sf: ts.SourceFile): Array<{ node: ts.Node; text: string }> {
  const out: Array<{ node: ts.Node; text: string }> = [];
  walk(sf, (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      out.push({ node, text: node.moduleSpecifier.text });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      out.push({ node, text: node.arguments[0].text });
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      out.push({ node, text: node.argument.literal.text });
    }
  });
  return out;
}

/** Charts are dependency-free: nothing under src/ may import d3. */
export function checkNoD3(fileName: string, source: string): string[] {
  const sf = parse(fileName, source);
  return moduleSpecifiers(sf)
    .filter((s) => /^d3(-[\w-]+)?(\/|$)/.test(s.text))
    .map((s) => `${where(sf, s.node)}: imports "${s.text}" (charts add no dependencies)`);
}

/**
 * Charts add zero runtime dependencies: files under src/charts/ import only relative modules and
 * the existing peers (react, react-dom, motion).
 */
export function checkChartImports(fileName: string, source: string): string[] {
  if (!/(^|\/)src\/charts\//.test(fileName)) return [];
  const sf = parse(fileName, source);
  return moduleSpecifiers(sf)
    .filter((s) => !s.text.startsWith(".") && !CLIENT_SPECIFIER.test(s.text))
    .map((s) => `${where(sf, s.node)}: chart code imports "${s.text}"; charts must stay dependency-free`);
}

/** No default exports (C1). */
export function checkNoDefaultExport(fileName: string, source: string): string[] {
  const sf = parse(fileName, source);
  const failures: string[] = [];
  for (const statement of sf.statements) {
    const isDefaultAssignment = ts.isExportAssignment(statement) && !statement.isExportEquals;
    const modifiers = ts.canHaveModifiers(statement) ? (ts.getModifiers(statement) ?? []) : [];
    const isDefaultDeclaration = modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    const isDefaultSpecifier =
      ts.isExportDeclaration(statement) &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.some((e) => e.name.text === "default");
    if (isDefaultAssignment || isDefaultDeclaration || isDefaultSpecifier) {
      failures.push(`${where(sf, statement)}: export default is banned`);
    }
  }
  return failures;
}

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;

/** No hard-coded colors outside theme.css, unless the line carries pui-allow-color. */
export function checkColorLiterals(fileName: string, source: string): string[] {
  return source
    .split("\n")
    .flatMap((line, i) =>
      COLOR_LITERAL.test(line) && !line.includes("pui-allow-color") ? [`${fileName}:${i + 1}: color literal`] : [],
    );
}

/** Text of every string-like literal (StringLiteral, NoSubstitutionTemplateLiteral, template parts). */
function stringLiterals(sf: ts.SourceFile): Array<{ node: ts.Node; text: string }> {
  const out: Array<{ node: ts.Node; text: string }> = [];
  walk(sf, (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      out.push({ node, text: node.text });
    }
  });
  return out;
}

const PALETTE =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|accent|caret|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const PALETTE_BW =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|accent|caret|shadow)-(?:white|black)\b/;
const DARK_VARIANT = /(?:^|[\s:])dark:/;

/** No Tailwind palette classes and no dark: variants (dark mode is token-swapped). */
export function checkClassVocabulary(fileName: string, source: string): string[] {
  const sf = parse(fileName, source);
  const failures: string[] = [];
  for (const { node, text } of stringLiterals(sf)) {
    if (PALETTE.test(text) || PALETTE_BW.test(text)) failures.push(`${where(sf, node)}: palette class in "${text}"`);
    if (DARK_VARIANT.test(text)) failures.push(`${where(sf, node)}: dark: variant in "${text}"`);
  }
  return failures;
}

function isCnCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cn";
}

/** No template literals with substitutions inside className or cn() arguments. */
export function checkClassTemplates(fileName: string, source: string): string[] {
  const sf = parse(fileName, source);
  const failures: string[] = [];
  const scan = (root: ts.Node) =>
    walk(root, (node) => {
      if (ts.isTemplateExpression(node)) failures.push(`${where(sf, node)}: template literal builds a class name`);
    });
  walk(sf, (node) => {
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === "className" && node.initializer) scan(node.initializer);
    else if (isCnCall(node)) node.arguments.forEach(scan);
  });
  return [...new Set(failures)];
}

/** No module-level `.displayName =` assignments (they defeat tree-shaking). */
export function checkDisplayName(fileName: string, source: string): string[] {
  const sf = parse(fileName, source);
  return sf.statements.flatMap((s) =>
    ts.isExpressionStatement(s) &&
    ts.isBinaryExpression(s.expression) &&
    s.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isPropertyAccessExpression(s.expression.left) &&
    s.expression.left.name.text === "displayName"
      ? [`${where(sf, s)}: module-level displayName assignment`]
      : [],
  );
}

/** No inline eslint-disable comments; rule disables live in eslint.config.js only. */
export function checkEslintDisable(fileName: string, source: string): string[] {
  return source
    .split("\n")
    .flatMap((line, i) => (/eslint-disable/.test(line) ? [`${fileName}:${i + 1}: inline eslint-disable`] : []));
}

type TagKind = { kind: "intrinsic"; tag: string } | { kind: "dynamic"; tag: string } | { kind: "skip" };

/** Classifies a JSX tag name (design 5.12 Enforcement step 1). */
export function classifyTag(tagName: ts.JsxTagNameExpression): TagKind {
  if (ts.isIdentifier(tagName)) {
    const name = tagName.text;
    if (/^[a-z]/.test(name)) return SVG_INTERNAL_TAGS.has(name) ? { kind: "skip" } : { kind: "intrinsic", tag: name };
    if (/(?:Comp|Tag)$/.test(name)) return { kind: "dynamic", tag: name };
    return { kind: "skip" };
  }
  if (
    ts.isPropertyAccessExpression(tagName) &&
    ts.isIdentifier(tagName.expression) &&
    tagName.expression.text === "motion"
  ) {
    const name = tagName.name.text;
    return SVG_INTERNAL_TAGS.has(name) ? { kind: "skip" } : { kind: "intrinsic", tag: name };
  }
  return { kind: "skip" };
}

export function requiredReset(tag: string): ResetName {
  if (tag === "button" || tag === "input" || tag === "textarea" || tag === "select") return "controlReset";
  if (tag === "ol" || tag === "ul") return "listReset";
  return "blockReset";
}

function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function resetName(node: ts.Expression | undefined): ResetName | null {
  if (!node) return null;
  const inner = unwrap(node);
  return ts.isIdentifier(inner) && (RESET_CONSTANTS as readonly string[]).includes(inner.text)
    ? (inner.text as ResetName)
    : null;
}

function countResetRefs(root: ts.Node): number {
  let count = 0;
  walk(root, (node) => {
    if (ts.isIdentifier(node) && (RESET_CONSTANTS as readonly string[]).includes(node.text)) count++;
  });
  return count;
}

/** The reset rule: every intrinsic element's className starts with exactly one reset constant. */
export function checkResets(fileName: string, source: string): string[] {
  if (!fileName.endsWith(".tsx")) return [];
  const sf = parse(fileName, source);
  const failures: string[] = [];
  walk(sf, (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    const kind = classifyTag(node.tagName);
    if (kind.kind === "skip") return;
    const label = `${where(sf, node)}: <${node.tagName.getText(sf)}>`;
    const attr = node.attributes.properties.find(
      (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(sf) === "className",
    );
    const expr =
      attr?.initializer && ts.isJsxExpression(attr.initializer) ? attr.initializer.expression : undefined;
    if (!expr) {
      failures.push(`${label} needs className={<reset>} or className={cn(<reset>, ...)}`);
      return;
    }
    const call = unwrap(expr);
    const first = isCnCall(call) ? call.arguments[0] : call;
    if (kind.kind === "intrinsic") {
      const required = requiredReset(kind.tag);
      if (resetName(first) !== required) failures.push(`${label} must start its className with ${required}`);
      else if (countResetRefs(expr) !== 1) failures.push(`${label} must reference exactly one reset constant`);
      return;
    }
    // dynamic tag
    const direct = resetName(first);
    if (direct === "controlReset" || direct === "blockReset") return;
    const cond = first ? unwrap(first) : undefined;
    if (cond && ts.isConditionalExpression(cond) && resetName(cond.whenTrue) && resetName(cond.whenFalse)) return;
    failures.push(
      `${label} (dynamic tag) must start with controlReset, blockReset or a conditional between reset constants`,
    );
  });
  return failures;
}

const PSEUDO_SIZING = (pseudo: "before" | "after") =>
  new RegExp(`(?:^|[\\s:])${pseudo}:(?:w-|h-|size-|min-|max-|p[xytrblse]?-|border)`);

/** Literals that size, pad or border before:/after: content must also contain <pseudo>:box-border. */
export function checkPseudoBoxBorder(fileName: string, source: string): string[] {
  const sf = parse(fileName, source);
  const failures: string[] = [];
  for (const { node, text } of stringLiterals(sf)) {
    for (const pseudo of ["before", "after"] as const) {
      if (PSEUDO_SIZING(pseudo).test(text) && !text.includes(`${pseudo}:box-border`)) {
        failures.push(`${where(sf, node)}: "${text}" sizes ${pseudo}: content without ${pseudo}:box-border`);
      }
    }
  }
  return failures;
}

/** Every --pui-* custom property name declared in a stylesheet. */
export function declaredCssVars(css: string): Set<string> {
  return new Set([...css.matchAll(/(--pui-[\w-]+)\s*:/g)].map((m) => m[1] as string));
}

/** --pui-* keys set through style objects or style.setProperty in source. */
export function styleVarKeys(fileName: string, source: string): string[] {
  const sf = parse(fileName, source);
  const keys: string[] = [];
  walk(sf, (node) => {
    if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
      const name = node.name;
      let text: string | undefined;
      if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) text = name.text;
      else if (ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) text = name.expression.text;
      if (text?.startsWith("--pui-")) keys.push(text);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "setProperty"
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteralLike(arg) && arg.text.startsWith("--pui-")) keys.push(arg.text);
    }
  });
  return keys;
}

/** Per-instance --pui-<component>-<param> variables never reuse a global token name (5.10). */
export function checkStyleVarNames(fileName: string, source: string, themeVars: ReadonlySet<string>): string[] {
  return styleVarKeys(fileName, source)
    .filter((key) => themeVars.has(key))
    .map((key) => `${fileName}: style key ${key} is a global token defined in theme.css`);
}

/** Runs every check over one source file. */
export function checkFile(fileName: string, source: string, themeVars: ReadonlySet<string>): string[] {
  return [
    ...checkUseClient(fileName, source),
    ...checkNoDefaultExport(fileName, source),
    ...checkColorLiterals(fileName, source),
    ...checkClassVocabulary(fileName, source),
    ...checkClassTemplates(fileName, source),
    ...checkDisplayName(fileName, source),
    ...checkEslintDisable(fileName, source),
    ...checkResets(fileName, source),
    ...checkPseudoBoxBorder(fileName, source),
    ...checkStyleVarNames(fileName, source, themeVars),
    ...checkNoD3(fileName, source),
    ...checkChartImports(fileName, source),
  ];
}
