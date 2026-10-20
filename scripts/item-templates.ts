// Pure templates for `npm run new` (scripts/new-item.ts). One starter per category, written to the
// item conventions (design 7.0 C1-C16, 5.12, 6): "use client" first, named exports, forwardRef with a
// named function, `{...props}` before `className={cn(<reset>, ..., className)}`, pui tokens only,
// data-* state attributes and the reduced-motion outcome of the category. Generated code contains
// no backticks and no "${", so nothing here needs escaping.
import type { Category } from "./entries.ts";

export interface ItemNames {
  /** kebab-case: file basename, subpath and dashboard slug. */
  name: string;
  category: Category;
  /** The export (and ENTRIES title): "SamplePanel" or "useSampleToggle". */
  title: string;
  /** "SamplePanelProps", or "UseSampleToggleOptions" for hooks. */
  props: string;
  /** Hooks only: "UseSampleToggleResult". */
  result?: string;
  /** Every public identifier the item adds. */
  identifiers: string[];
  /** Repo-relative paths of the three new files. */
  file: string;
  testFile: string;
  itemFile: string;
  /** Meta keywords: the name's segments without "use". */
  keywords: string[];
}

/**
 * Names the generated files declare or import themselves. A title equal to one of them would clash
 * inside the new source, test, fixture or registry item file.
 */
export const TEMPLATE_IDENTIFIERS: ReadonlySet<string> = new Set([
  "React",
  "MotionConfig",
  "MotionTag",
  "Preview",
  "Mini",
  "Demo",
  "DemoProps",
  "ItemModule",
  "ControlSpec",
  "Fixture",
  "useCallback",
  "useEffect",
  "useMemo",
  "useRef",
  "useState",
  // chart starter constants
  "WIDTH",
  "PAD",
]);

const pascal = (segments: readonly string[]): string =>
  segments.map((s) => (s[0] ?? "").toUpperCase() + s.slice(1)).join("");

/** Derives every name from a valid kebab-case name (validation lives in item-scaffold.ts). */
export function deriveNames(name: string, category: Category): ItemNames {
  const segments = name.split("-");
  const ext = category === "hooks" ? ".ts" : ".tsx";
  const paths = {
    file: `src/${category}/${name}${ext}`,
    testFile: `test/${category}/${name}.test.tsx`,
    itemFile: `dashboard/src/registry/items/${name}.tsx`,
  };
  if (category === "hooks") {
    const type = pascal(segments);
    const title = `use${pascal(segments.slice(1))}`;
    const props = `${type}Options`;
    const result = `${type}Result`;
    return {
      name,
      category,
      title,
      props,
      result,
      identifiers: [title, props, result],
      ...paths,
      keywords: segments.slice(1),
    };
  }
  const title = pascal(segments);
  const props = `${title}Props`;
  return { name, category, title, props, identifiers: [title, props], ...paths, keywords: segments };
}

const description = (n: ItemNames): string => `Describe ${n.title} in one sentence.`;

// ---------------------------------------------------------------------------------------------
// Source files

function componentSource(n: ItemNames): string {
  return `"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { Tone } from "../lib/types";

export interface ${n.props} extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "neutral". */
  tone?: Tone;
  /** Default "md". */
  size?: "sm" | "md";
}

const sizes = {
  sm: "gap-1.5 px-2.5 py-1.5 text-xs",
  md: "gap-2 px-3 py-2 text-sm",
} as const;

/** ${description(n)} */
export const ${n.title} = React.forwardRef<HTMLDivElement, ${n.props}>(function ${n.title}(
  { tone = "neutral", size = "md", className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-tone={tone}
      data-size={size}
      {...props}
      className={cn(
        blockReset,
        "flex items-center rounded-pui-md border border-(--pui-tone)/30 bg-(--pui-tone)/12 text-(--pui-tone-text)",
        sizes[size],
        toneClasses[tone],
        className,
      )}
    />
  );
});
`;
}

function textSource(n: ItemNames): string {
  return `"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { easings } from "../lib/motion";
import { motionTagMap } from "../lib/motion-tags";
import { blockReset } from "../lib/styles";
import type { TextBaseProps } from "../lib/types";
import { useInViewTrigger } from "../lib/use-in-view-trigger";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ${n.props} extends TextBaseProps {
  children: React.ReactNode;
  /** Seconds. Default 0.5. */
  duration?: number;
}

const hidden = { opacity: 0, y: 8 };
const visible = { opacity: 1, y: 0 };

/** ${description(n)} */
export const ${n.title} = React.forwardRef<HTMLElement, ${n.props}>(function ${n.title}(
  { as = "span", trigger = "inView", once = true, delay = 0, duration = 0.5, className, ...props },
  ref,
) {
  const localRef = React.useRef<HTMLElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const active = useInViewTrigger(localRef, { trigger, once });
  const reduced = usePrefersReducedMotion();
  const shown = active || reduced;
  const MotionTag = motionTagMap[as];
  return (
    <MotionTag
      ref={mergedRef}
      data-state={shown ? "visible" : "hidden"}
      initial={reduced ? false : hidden}
      animate={shown ? visible : hidden}
      transition={reduced ? { duration: 0 } : { duration, delay, ease: easings.out }}
      {...props}
      className={cn(blockReset, "inline-block", className)}
    />
  );
});
`;
}

function effectSource(n: ItemNames): string {
  return `"use client";

import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ${n.props} extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Seconds per cycle. Default 3. */
  duration?: number;
  /** Travel in px. Default 6. */
  distance?: number;
}

/** ${description(n)} */
export const ${n.title} = React.forwardRef<HTMLDivElement, ${n.props}>(function ${n.title}(
  { duration = 3, distance = 6, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      ref={ref}
      data-state={reduced ? "static" : "animated"}
      animate={reduced ? { y: 0 } : { y: [0, -distance, 0] }}
      transition={reduced ? { duration: 0 } : { duration, repeat: Infinity, ease: "easeInOut" }}
      {...props}
      className={cn(blockReset, "inline-block", className)}
    />
  );
});
`;
}

function backgroundSource(n: ItemNames): string {
  return `"use client";

import * as React from "react";
import { backgroundBase, patternMasks } from "../lib/backgrounds";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import type { PatternMask } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ${n.props} extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "radial". */
  mask?: PatternMask;
}

/** ${description(n)} */
export const ${n.title} = React.forwardRef<HTMLDivElement, ${n.props}>(function ${n.title}(
  { mask = "radial", className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-mask={mask}
      data-state={reduced ? "static" : "animated"}
      {...props}
      className={cn(blockReset, backgroundBase, "overflow-hidden", patternMasks[mask], className)}
    >
      <div
        className={cn(
          blockReset,
          "absolute inset-0 bg-[radial-gradient(circle_at_center,var(--pui-primary),transparent_70%)] opacity-30",
          !reduced && "motion-safe:animate-pulse",
        )}
      />
    </div>
  );
});
`;
}

function chartSource(n: ItemNames): string {
  return `"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { categoricalColor, withOpacity } from "./core/color";
import { areaToBaseline, linePath } from "./core/path";
import { scaleLinear } from "./core/scale";
import { extent } from "./core/stats";
import { summarizeSeries } from "./core/summary";

export interface ${n.props} extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Values, left to right. */
  data: readonly number[];
  /** Series name for the accessible summary. Default "Trend". */
  label?: string;
  /** viewBox height in px (the width is 320 and scales with the container). Default 120. */
  height?: number;
}

const WIDTH = 320;
const PAD = 8;

/** ${description(n)} */
export const ${n.title} = React.forwardRef<HTMLElement, ${n.props}>(function ${n.title}(
  { data, label = "Trend", height = 120, className, ...props },
  ref,
) {
  const { line, area, summary } = React.useMemo(() => {
    const [lo, hi] = extent(data) ?? [0, 1];
    const x = scaleLinear([0, Math.max(1, data.length - 1)], [PAD, WIDTH - PAD]);
    const y = scaleLinear([lo, hi], [height - PAD, PAD], { nice: 4 });
    const points = data.map((v, i) => [x(i), y(v)] as const);
    return {
      line: linePath(points, { curve: "monotone" }),
      area: areaToBaseline(points, height - PAD, { curve: "monotone" }),
      summary: summarizeSeries({ label, xs: data.map((_, i) => "point " + (i + 1)), ys: data }),
    };
  }, [data, height, label]);
  const color = categoricalColor(0);
  return (
    <figure ref={ref} data-points={data.length} {...props} className={cn(blockReset, "m-0", className)}>
      <svg
        viewBox={"0 0 " + WIDTH + " " + height}
        role="img"
        aria-label={summary}
        preserveAspectRatio="none"
        className={cn(blockReset, "block h-auto w-full overflow-visible")}
      >
        <path d={area} fill={withOpacity(color, 0.14)} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </figure>
  );
});
`;
}

function hookSource(n: ItemNames): string {
  return `"use client";

import { useCallback, useState } from "react";

export interface ${n.props} {
  /** Initial value. Default false. */
  defaultValue?: boolean;
}

export interface ${n.result ?? ""} {
  value: boolean;
  /** Flips the value. Stable across renders. */
  toggle: () => void;
  /** Sets the value. Stable across renders. */
  set: (value: boolean) => void;
}

/** ${description(n)} SSR-safe: no window access. */
export function ${n.title}({ defaultValue = false }: ${n.props} = {}): ${n.result ?? ""} {
  const [value, set] = useState(defaultValue);
  const toggle = useCallback(() => set((current) => !current), []);
  return { value, toggle, set };
}
`;
}

export function sourceFile(n: ItemNames): string {
  switch (n.category) {
    case "components":
      return componentSource(n);
    case "text":
      return textSource(n);
    case "effects":
      return effectSource(n);
    case "backgrounds":
      return backgroundSource(n);
    case "charts":
      return chartSource(n);
    case "hooks":
      return hookSource(n);
  }
}

// ---------------------------------------------------------------------------------------------
// Test files

const modulePath = (n: ItemNames): string => `../../src/${n.category}/${n.name}`;

function componentTest(n: ItemNames): string {
  return `import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ${n.title} } from "${modulePath(n)}";

describe("${n.title}", () => {
  it("renders a div with defaults, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <${n.title} ref={ref} className="mt-4">
        Content
      </${n.title}>,
    );
    const root = screen.getByText("Content");
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe("DIV");
    expect(root).toHaveAttribute("data-tone", "neutral");
    expect(root).toHaveAttribute("data-size", "md");
    expect(root.className).toContain("box-border");
    expect(root.className).toContain("mt-4");
  });

  it("passes ARIA attributes through (a11y)", () => {
    render(
      <${n.title} role="status" aria-label="Saved" tone="success" size="sm">
        Saved
      </${n.title}>,
    );
    const status = screen.getByRole("status", { name: "Saved" });
    expect(status).toHaveAttribute("data-tone", "success");
    expect(status).toHaveAttribute("data-size", "sm");
  });

  it("renders on the server", () => {
    expect(renderToString(<${n.title}>Server</${n.title}>)).toContain("Server");
  });
});
`;
}

function textTest(n: ItemNames): string {
  return `import { render, screen, waitFor } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ${n.title} } from "${modulePath(n)}";

describe("${n.title}", () => {
  it("renders the requested tag, merges className, forwards the ref and enters in view", async () => {
    const ref = createRef<HTMLElement>();
    render(
      <${n.title} ref={ref} as="h2" className="mt-4">
        Hello
      </${n.title}>,
    );
    const root = screen.getByText("Hello");
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe("H2");
    expect(root.className).toContain("box-border");
    expect(root.className).toContain("mt-4");
    await waitFor(() => expect(root).toHaveAttribute("data-state", "visible"));
  });

  it("keeps the text in the accessibility tree (a11y)", () => {
    render(<${n.title} trigger="mount">Readable</${n.title}>);
    const text = screen.getByText("Readable");
    expect(text.closest("[aria-hidden='true']")).toBeNull();
    expect(text).toHaveAttribute("data-state", "visible");
  });

  it("shows the final state at once under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <${n.title}>Calm</${n.title}>
      </MotionConfig>,
    );
    const text = screen.getByText("Calm");
    expect(text).toHaveAttribute("data-state", "visible");
    expect(text.style.opacity).toBe("1");
  });

  it("renders the hidden pre-trigger state on the server", () => {
    const html = renderToString(<${n.title}>Server</${n.title}>);
    expect(html).toContain("Server");
    expect(html).toContain('data-state="hidden"');
  });
});
`;
}

function effectTest(n: ItemNames): string {
  return `import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ${n.title} } from "${modulePath(n)}";

describe("${n.title}", () => {
  it("renders a div, merges className, forwards the ref and animates", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <${n.title} ref={ref} className="mt-4">
        Float
      </${n.title}>,
    );
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("DIV");
    expect(root).toHaveAttribute("data-state", "animated");
    expect(root?.className).toContain("box-border");
    expect(root?.className).toContain("mt-4");
  });

  it("keeps interactive children reachable (a11y)", () => {
    render(
      <${n.title}>
        <button type="button">Go</button>
      </${n.title}>,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeVisible();
  });

  it("stops under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <${n.title}>Still</${n.title}>
      </MotionConfig>,
    );
    expect(container.firstElementChild).toHaveAttribute("data-state", "static");
  });

  it("renders on the server", () => {
    expect(renderToString(<${n.title}>Server</${n.title}>)).toContain('data-state="animated"');
  });
});
`;
}

function backgroundTest(n: ItemNames): string {
  return `import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ${n.title} } from "${modulePath(n)}";

describe("${n.title}", () => {
  it("renders a decorative layer, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<${n.title} ref={ref} className="opacity-50" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-mask", "radial");
    expect(root).toHaveAttribute("data-state", "animated");
    expect(root?.className).toContain("opacity-50");
    expect(root?.firstElementChild?.className).toContain("motion-safe:animate-pulse");
  });

  it("is hidden from assistive technology (a11y)", () => {
    const { container } = render(<${n.title} mask="none" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveAttribute("data-mask", "none");
  });

  it("is static under reduced motion", () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <${n.title} />
      </MotionConfig>,
    );
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("data-state", "static");
    expect(root?.firstElementChild?.className).not.toContain("animate");
  });

  it("renders on the server", () => {
    expect(renderToString(<${n.title} />)).toContain('aria-hidden="true"');
  });
});
`;
}

function chartTest(n: ItemNames): string {
  return `import { render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ${n.title} } from "${modulePath(n)}";

const data = [3, 5, 4, 8, 6, 9];

describe("${n.title}", () => {
  it("renders a figure with a smooth line, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<${n.title} ref={ref} data={data} className="max-w-sm" />);
    const root = container.firstElementChild;
    expect(ref.current).toBe(root);
    expect(root?.tagName).toBe("FIGURE");
    expect(root).toHaveAttribute("data-points", "6");
    expect(root?.className).toContain("max-w-sm");
    const line = container.querySelector('path[fill="none"]');
    expect(line?.getAttribute("d")?.startsWith("M8,")).toBe(true);
    expect(line?.getAttribute("d")).toContain("C");
  });

  it("names the chart with a generated summary (a11y)", () => {
    render(<${n.title} data={data} label="Signups" />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Signups rises 200% from 3 (point 1) to 9 (point 6). Peak 9 in point 6; low 3 in point 1.",
    );
  });

  it("is a static chart, identical under reduced motion", () => {
    const plain = render(<${n.title} data={data} />).container.innerHTML;
    const reduced = render(
      <MotionConfig reducedMotion="always">
        <${n.title} data={data} />
      </MotionConfig>,
    ).container.innerHTML;
    expect(reduced).toBe(plain);
  });

  it("renders the final chart on the server, and copes with no data", () => {
    const html = renderToString(<${n.title} data={data} height={90} />);
    expect(html).toContain('viewBox="0 0 320 90"');
    expect(html).toContain('d="M8,');
    expect(renderToString(<${n.title} data={[]} />)).toContain("Trend: no data.");
  });
});
`;
}

function hookTest(n: ItemNames): string {
  return `import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ${n.title} } from "${modulePath(n)}";

describe("${n.title}", () => {
  it("toggles and sets the value", () => {
    const { result } = renderHook(() => ${n.title}());
    expect(result.current.value).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.value).toBe(true);
    act(() => result.current.set(false));
    expect(result.current.value).toBe(false);
  });

  it("keeps toggle stable across renders", () => {
    const { result, rerender } = renderHook(() => ${n.title}({ defaultValue: true }));
    const first = result.current.toggle;
    expect(result.current.value).toBe(true);
    rerender();
    act(() => result.current.toggle());
    expect(result.current.value).toBe(false);
    expect(result.current.toggle).toBe(first);
  });

  it("renders its default value on the server", () => {
    function Probe() {
      return createElement("span", null, String(${n.title}({ defaultValue: true }).value));
    }
    expect(renderToString(createElement(Probe))).toContain("true");
  });
});
`;
}

export function testFile(n: ItemNames): string {
  switch (n.category) {
    case "components":
      return componentTest(n);
    case "text":
      return textTest(n);
    case "effects":
      return effectTest(n);
    case "backgrounds":
      return backgroundTest(n);
    case "charts":
      return chartTest(n);
    case "hooks":
      return hookTest(n);
  }
}

// ---------------------------------------------------------------------------------------------
// Dashboard registry item

function componentItem(n: ItemNames): string {
  return `import { ${n.title}, type ${n.props} } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  tone: NonNullable<${n.props}["tone"]>;
  size: NonNullable<${n.props}["size"]>;
  label: string;
};

const defaults: DemoProps = { tone: "neutral", size: "md", label: "${n.title}" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
  { type: "text", prop: "label", label: "Label", maxLength: 40 },
];

function Preview({ props }: { props: DemoProps }) {
  const { label, ...rest } = props;
  return <${n.title} {...rest}>{label}</${n.title}>;
}

function Mini() {
  return (
    <${n.title} tone="primary" size="sm">
      ${n.title}
    </${n.title}>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ label, ...props }) => toJsx<Record<string, unknown>>("${n.title}", props, { tone: "neutral", size: "md" }, label),
  propsTable: propDocs<${n.props}>()([
    { name: "tone", type: "Tone", default: '"neutral"', description: "Semantic color." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Padding and text size." },
  ]),
};

export default item;
`;
}

function textItem(n: ItemNames): string {
  return `import { ${n.title}, type ${n.props} } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { duration: number; text: string };

const defaults: DemoProps = { duration: 0.5, text: "Hello from ${n.title}" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "duration", label: "Duration (s)", min: 0.25, max: 2, step: 0.25 },
  { type: "text", prop: "text", label: "Text", maxLength: 60 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <${n.title} as="p" duration={props.duration} className="text-2xl font-semibold text-pui-foreground">
      {props.text}
    </${n.title}>
  );
}

function Mini() {
  return (
    <${n.title} trigger="mount" className="text-lg font-semibold text-pui-foreground">
      ${n.title}
    </${n.title}>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, ...props }) => toJsx<Record<string, unknown>>("${n.title}", props, { duration: 0.5 }, text),
  propsTable: propDocs<${n.props}>()([
    { name: "as", type: "TextTag", default: '"span"', description: "Rendered tag." },
    { name: "duration", type: "number", default: "0.5", description: "Entrance duration in seconds." },
    { name: "delay", type: "number", default: "0", description: "Start delay in seconds." },
    { name: "trigger", type: '"mount" | "inView"', default: '"inView"', description: "When the entrance starts." },
    { name: "once", type: "boolean", default: "true", description: "Run once, or every time it enters the viewport." },
  ]),
  a11y: ["The text stays in the accessibility tree while it animates."],
  reducedMotion: "Shows the final state at once.",
};

export default item;
`;
}

function effectItem(n: ItemNames): string {
  return `import { ${n.title}, type ${n.props} } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { duration: number; distance: number };

const defaults: DemoProps = { duration: 3, distance: 6 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "duration", label: "Duration (s)", min: 1, max: 8, step: 0.5 },
  { type: "number", prop: "distance", label: "Distance (px)", min: 2, max: 24, step: 1 },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <${n.title} {...props}>
      <div className="rounded-pui-lg border border-pui-border bg-pui-surface px-6 py-4 text-sm font-medium text-pui-surface-foreground shadow-pui-md">
        ${n.title}
      </div>
    </${n.title}>
  );
}

function Mini() {
  return (
    <${n.title}>
      <div className="rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2 text-xs text-pui-surface-foreground">
        ${n.title}
      </div>
    </${n.title}>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("${n.title}", props, defaults, "...", controls),
  propsTable: propDocs<${n.props}>()([
    { name: "duration", type: "number", default: "3", description: "Seconds per cycle." },
    { name: "distance", type: "number", default: "6", description: "Travel in px." },
  ]),
  a11y: ["Children keep their roles and stay focusable while they move."],
  reducedMotion: "Stays still.",
};

export default item;
`;
}

function backgroundItem(n: ItemNames): string {
  return `import { ${n.title}, type ${n.props} } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { mask: NonNullable<${n.props}["mask"]> };

const defaults: DemoProps = { mask: "radial" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "mask", label: "Mask", options: ["none", "radial", "fade-x", "fade-y", "fade-bottom"] },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="relative isolate flex h-64 w-full max-w-lg items-center justify-center overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <${n.title} {...props} />
      <p className="relative m-0 text-xl font-semibold text-pui-foreground">${n.title}</p>
    </div>
  );
}

function Mini() {
  return (
    <div className="relative isolate h-20 w-36 overflow-hidden rounded-pui-lg">
      <${n.title} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("${n.title}", props, defaults, undefined, controls),
  propsTable: propDocs<${n.props}>()([
    { name: "mask", type: "PatternMask", default: '"radial"', description: "Edge mask." },
  ]),
  a11y: ["Decorative and aria-hidden."],
  reducedMotion: "The glow stops pulsing.",
};

export default item;
`;
}

function chartItem(n: ItemNames): string {
  return `import { ${n.title}, type ${n.props} } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { points: number; label: string; height: number };

const defaults: DemoProps = { points: 16, label: "Signups", height: 120 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "points", label: "Points", min: 2, max: 60, step: 1 },
  { type: "text", prop: "label", label: "Label", maxLength: 40 },
  { type: "number", prop: "height", label: "Height (px)", min: 60, max: 240, step: 10 },
];

/** Deterministic sample data (the same on the server and the client). */
function sample(points: number): number[] {
  return Array.from({ length: points }, (_, i) => Math.round(40 + 18 * Math.sin(i / 2.3) + i * 3));
}

function Preview({ props }: { props: DemoProps }) {
  return <${n.title} data={sample(props.points)} label={props.label} height={props.height} className="w-full max-w-lg" />;
}

function Mini() {
  return <${n.title} data={sample(12)} height={60} className="w-36" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ points, ...props }) =>
    toJsx<Record<string, unknown>>("${n.title}", { data: sample(points), ...props }, { label: "Trend", height: 120 }),
  propsTable: propDocs<${n.props}>()([
    { name: "data", type: "readonly number[]", description: "Values, left to right." },
    { name: "label", type: "string", default: '"Trend"', description: "Series name for the accessible summary." },
    { name: "height", type: "number", default: "120", description: "viewBox height in px." },
  ]),
  a11y: ["role=img, named by a generated summary of the trend, peak and low."],
  reducedMotion: "Static: nothing animates.",
};

export default item;
`;
}

function hookItem(n: ItemNames): string {
  return `import { Button, ${n.title}, type ${n.props} } from "changelui";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { defaultValue: boolean };

function Demo({ defaultValue }: DemoProps) {
  const { value, toggle } = ${n.title}({ defaultValue });
  return (
    <div className="flex flex-col items-center gap-3 text-sm">
      <span data-state={value ? "on" : "off"} className="rounded-pui-full bg-pui-muted px-3 py-1 font-medium text-pui-foreground">
        {value ? "on" : "off"}
      </span>
      <Button size="sm" variant="outline" onClick={toggle}>
        Toggle
      </Button>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  // defaultValue only seeds the state, so remount the demo when it changes.
  return <Demo key={String(props.defaultValue)} defaultValue={props.defaultValue} />;
}

function Mini() {
  return <span className="font-mono text-xs text-pui-muted-foreground">${n.title}()</span>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults: { defaultValue: false },
  controls: [{ type: "boolean", prop: "defaultValue", label: "Default value" }],
  snippet: (props) =>
    "const { value, toggle, set } = ${n.title}(" + (props.defaultValue ? "{ defaultValue: true }" : "") + ");",
  propsTable: propDocs<${n.props}>()([
    { name: "defaultValue", type: "boolean", default: "false", description: "Initial value." },
  ]),
};

export default item;
`;
}

export function registryItemFile(n: ItemNames): string {
  switch (n.category) {
    case "components":
      return componentItem(n);
    case "text":
      return textItem(n);
    case "effects":
      return effectItem(n);
    case "backgrounds":
      return backgroundItem(n);
    case "charts":
      return chartItem(n);
    case "hooks":
      return hookItem(n);
  }
}

// ---------------------------------------------------------------------------------------------
// Lines spliced into existing files (each ends with a newline)

/** A dashboard/src/registry/meta.ts row. */
export function metaBlock(n: ItemNames, indent = "  "): string {
  const lines = [
    "{",
    `  slug: "${n.name}",`,
    `  title: "${n.title}",`,
    `  category: "${n.category}",`,
    `  description: "${description(n)}",`,
    `  keywords: [${n.keywords.map((k) => `"${k}"`).join(", ")}],`,
    `  exports: ["${n.title}"],`,
    `  replayable: ${n.category === "text" ? "true" : "false"},`,
    "  isNew: true,",
    "},",
  ];
  return lines.map((line) => `${indent}${line}\n`).join("");
}

/** A scripts/entries.ts row, using the file's component()/item()/hook() helpers. */
export function entryRow(n: ItemNames, indent = "  "): string {
  if (n.category === "components") return `${indent}component("${n.name}", "${n.title}"),\n`;
  if (n.category === "hooks") return `${indent}hook("${n.name}", "${n.title}"),\n`;
  return `${indent}item("${n.category}", "${n.name}", "${n.title}"),\n`;
}

/** The src/index.ts line. */
export function barrelLine(n: ItemNames, indent = ""): string {
  return `${indent}export * from "./${n.category}/${n.name}";\n`;
}

const rootElement: Record<Exclude<Category, "hooks">, string> = {
  components: "HTMLDivElement",
  text: "HTMLElement",
  effects: "HTMLDivElement",
  backgrounds: "HTMLDivElement",
  charts: "HTMLElement",
};

/** A test/fixtures.tsx fixture (non-hooks). */
export function fixtureBlock(n: ItemNames, indent = "  "): string {
  if (n.category === "hooks") throw new Error("fixtureBlock: hooks get a probe");
  const el = rootElement[n.category];
  const element =
    n.category === "backgrounds"
      ? `<${n.title} ref={asRef<${el}>(ref)} />`
      : n.category === "charts"
        ? `<${n.title} ref={asRef<${el}>(ref)} data={[3, 5, 4, 8]} />`
        : `<${n.title} ref={asRef<${el}>(ref)}>Sample</${n.title}>`;
  const lines = ["{", `  name: "${n.title}",`, `  covers: ["${n.title}"],`, `  element: (ref) => ${element},`, "},"];
  return lines.map((line) => `${indent}${line}\n`).join("");
}

/** A test/fixtures.tsx hookProbes property. */
export function hookProbeLine(n: ItemNames, indent = "  "): string {
  return `${indent}${n.title}: () => ${n.title}(),\n`;
}

/** A specifier line in test/fixtures.tsx's import from "../src/index". */
export function importSpecifierLine(n: ItemNames, indent = "  "): string {
  return `${indent}${n.title},\n`;
}
