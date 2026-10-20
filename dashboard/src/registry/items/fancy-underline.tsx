import { FancyUnderline, type FancyUnderlineProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type Variant = NonNullable<FancyUnderlineProps["variant"]>;

type DemoProps = {
  text: string;
  variant: Variant;
  color: "primary" | "foreground" | "chart-2" | "chart-4" | "highlight";
  thickness: number;
  offset: number;
  active: boolean;
};

const defaults: DemoProps = { text: "Read the launch post", variant: "draw", color: "primary", thickness: 2, offset: 2, active: false };

const colorValue: Record<DemoProps["color"], string> = {
  primary: "var(--pui-primary)",
  foreground: "var(--pui-foreground)",
  "chart-2": "var(--pui-chart-2)",
  "chart-4": "var(--pui-chart-4)",
  highlight: "var(--pui-highlight)",
};

const VARIANTS: Variant[] = ["draw", "center", "slide", "marker", "squiggle"];

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 40 },
  { type: "select", prop: "variant", label: "Variant", options: VARIANTS },
  { type: "select", prop: "color", label: "Color", options: ["primary", "foreground", "chart-2", "chart-4", "highlight"] },
  { type: "number", prop: "thickness", label: "Thickness (px)", min: 1, max: 6, step: 0.25 },
  { type: "number", prop: "offset", label: "Offset (px)", min: 0, max: 10, step: 1 },
  { type: "boolean", prop: "active", label: "Active" },
];

function Preview({ props }: { props: DemoProps }) {
  const { text, color, ...rest } = props;
  // Marker reads best with the translucent highlight token; keep the picker honest for the others.
  const resolved = rest.variant === "marker" && color === "primary" ? undefined : colorValue[color];
  return (
    <div className="flex w-full flex-col items-center gap-3 py-12">
      <p className="m-0 text-3xl font-semibold tracking-tight text-pui-foreground">
        <FancyUnderline href="#/text/fancy-underline" {...rest} color={resolved} onClick={(e) => e.preventDefault()}>
          {text}
        </FancyUnderline>
      </p>
      <p className="m-0 text-xs text-pui-muted-foreground">Hover it, or Tab to it.</p>
    </div>
  );
}

function GalleryDemo() {
  return (
    <ul className="m-0 grid w-full list-none gap-4 p-0 sm:grid-cols-2">
      {VARIANTS.map((variant) => (
        <li key={variant} className="m-0 flex items-center justify-between gap-3 rounded-pui-lg border border-pui-border bg-pui-surface px-4 py-3">
          <FancyUnderline
            as="button"
            variant={variant}
            className="text-lg font-semibold text-pui-surface-foreground"
          >
            {variant[0]?.toUpperCase() + variant.slice(1)}
          </FancyUnderline>
          <code className="font-pui-mono text-xs text-pui-muted-foreground">variant="{variant}"</code>
        </li>
      ))}
    </ul>
  );
}

const NAV = ["Product", "Pricing", "Docs", "Changelog"];

function NavDemo() {
  const [current, setCurrent] = useState("Pricing");
  return (
    <nav aria-label="Demo" className="flex w-full items-center justify-between rounded-pui-xl border border-pui-border bg-pui-surface px-5 py-3 shadow-pui-sm">
      <span className="font-pui-display text-base font-bold text-pui-surface-foreground">acme</span>
      <ul className="m-0 flex list-none gap-5 p-0 text-sm font-medium">
        {NAV.map((label) => (
          <li key={label} className="m-0">
            <FancyUnderline
              href={`#/text/fancy-underline`}
              active={current === label}
              aria-current={current === label ? "page" : undefined}
              thickness={2}
              offset={4}
              onClick={(e) => {
                e.preventDefault();
                setCurrent(label);
              }}
              className={current === label ? "text-pui-foreground" : "text-pui-muted-foreground hover:text-pui-foreground"}
            >
              {label}
            </FancyUnderline>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ArticleDemo() {
  return (
    <article className="max-w-xl text-base leading-relaxed text-pui-foreground">
      <h3 className="m-0 mb-3 font-pui-display text-3xl font-bold tracking-tight">
        Designing for{" "}
        <FancyUnderline variant="squiggle" active color="var(--pui-chart-4)" thickness={2.25} offset={1}>
          delight
        </FancyUnderline>
      </h3>
      <p className="m-0 text-pui-muted-foreground">
        Good motion is{" "}
        <FancyUnderline variant="marker" active>
          felt more than seen
        </FancyUnderline>
        . Read our{" "}
        <FancyUnderline href="#/text/fancy-underline" variant="slide" onClick={(e) => e.preventDefault()} className="text-pui-foreground">
          motion guidelines
        </FancyUnderline>{" "}
        or browse the{" "}
        <FancyUnderline href="#/text/fancy-underline" variant="center" color="var(--pui-chart-2)" onClick={(e) => e.preventDefault()} className="text-pui-foreground">
          component gallery
        </FancyUnderline>
        .
      </p>
    </article>
  );
}

function Mini() {
  return (
    <span className="text-2xl font-semibold text-pui-foreground">
      <FancyUnderline variant="squiggle" active thickness={2}>
        Underline
      </FancyUnderline>
    </span>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ text, color, ...props }) =>
    toJsx<Record<string, unknown>>(
      "FancyUnderline",
      { href: "/blog/launch", ...props, color: color === "primary" ? undefined : colorValue[color] },
      { variant: "draw", thickness: 2, offset: 2, active: false },
      text,
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<FancyUnderlineProps>()([
    { name: "children", type: "ReactNode", description: "The link or heading text.", required: true },
    { name: "as", type: '"a" | "button" | "span" | "strong" | "em" | "h1".."h4"', default: '"span" ("a" with href)', description: "Rendered tag; links and buttons keep native behavior." },
    { name: "variant", type: '"draw" | "center" | "slide" | "marker" | "squiggle"', default: '"draw"', description: "Underline style and motion." },
    { name: "color", type: "string", default: '"var(--pui-primary)"', description: "Line color (marker defaults to --pui-highlight)." },
    { name: "thickness", type: "number", default: "2", description: "Line thickness in px (squiggle 1.75)." },
    { name: "offset", type: "number", default: "2", description: "Gap below the text in px." },
    { name: "active", type: "boolean", default: "false", description: "Keep the underline shown, e.g. for the current page." },
  ]),
  keyboard: [{ keys: "Tab", action: "Keyboard focus shows the underline like hover" }],
  a11y: [
    "Renders the native a or button, so links stay links; the line is aria-hidden.",
    "focus-visible triggers the same underline as hover, next to the normal focus ring.",
  ],
  reducedMotion: "The underline is drawn statically and does not animate.",
  examples: [
    { title: "All variants", description: "Five styles as buttons; hover or Tab through them.", Demo: GalleryDemo, wide: true },
    { title: "Navigation", description: "active marks the current page, with aria-current.", Demo: NavDemo, wide: true },
    { title: "Editorial", description: "A squiggle heading, a marker phrase and inline links.", Demo: ArticleDemo, wide: true },
  ],
};
export default item;
