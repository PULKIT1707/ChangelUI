import type { ControlSpec } from "../registry/types";

function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function formatProp(name: string, value: unknown): string | null {
  if (value === undefined) return null;
  if (value === true) return name;
  if (value === false) return `${name}={false}`;
  if (typeof value === "number") return `${name}={${value}}`;
  if (typeof value === "string") return value.includes('"') ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`;
  return `${name}={${JSON.stringify(value)}}`;
}

/** Splits `name="a" b={f({ x: "}" })} c` into attributes, respecting quotes, template literals and nested braces. */
function splitAttrs(text: string): string[] | null {
  const out: string[] = [];
  let start = -1;
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (start < 0) {
      if (/\s/.test(ch)) continue;
      start = i;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (/\s/.test(ch) && depth === 0) {
      out.push(text.slice(start, i));
      start = -1;
    }
    if (depth < 0) return null;
  }
  if (quote || depth !== 0) return null;
  if (start >= 0) out.push(text.slice(start));
  return out;
}

/**
 * Prettier-style wrap for usage snippets: any single-line opening tag longer than `width`
 * (`<Name a b c />` or `<Name a b>`) gets one attribute per line. Other lines are untouched.
 */
export function wrapJsx(code: string, width = 80): string {
  return code
    .split("\n")
    .map((line) => {
      if (line.length <= width) return line;
      const match = /^(\s*)<([A-Za-z][\w.]*)\s+(.*?)\s*(\/?>)$/.exec(line);
      if (!match) return line;
      const [, indent = "", name, body = "", close] = match;
      const attrs = splitAttrs(body);
      if (!attrs || attrs.length < 2) return line;
      const inner = attrs.map((attr) => `${indent}  ${attr}`).join("\n");
      return `${indent}<${name}\n${inner}\n${indent}${close}`;
    })
    .join("\n");
}

/**
 * Generates a JSX snippet that lists only non-default props (design 10.2), in ControlSpec order
 * (remaining props follow in insertion order). Children are indented by 2 spaces.
 */
export function toJsx<P extends Record<string, unknown>>(
  name: string,
  props: P,
  defaults: P,
  children?: string,
  controls: readonly ControlSpec<P>[] = [],
): string {
  const order = controls.map((c) => c.prop as string);
  const keys = Object.keys(props).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
  });
  const attrs = keys
    .filter((key) => !isEqual(props[key], defaults[key]))
    .map((key) => formatProp(key, props[key]))
    .filter((attr): attr is string => attr !== null);
  const open = attrs.length > 0 ? `<${name} ${attrs.join(" ")}` : `<${name}`;
  if (children === undefined || children === "") return `${open} />`;
  const body = children
    .split("\n")
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join("\n");
  return `${open}>\n${body}\n</${name}>`;
}
