import { motion } from "motion/react";
import { springs, useElementSize, usePrefersReducedMotion, type UseElementSizeOptions } from "changelui";
import { useRef } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { box: NonNullable<UseElementSizeOptions["box"]>; barWidth: number };
const defaults: DemoProps = { box: "content-box", barWidth: 22 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "box", label: "Box", options: ["content-box", "border-box"] },
  { type: "number", prop: "barWidth", label: "Bar slot (px)", min: 12, max: 48, step: 2 },
];

// Deterministic heights so server and client agree.
const HEIGHTS = Array.from({ length: 64 }, (_, i) => 0.25 + 0.7 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));

/** A box you can resize (drag the corner); the chart inside adds bars as it gets wider. */
function ResponsiveChart({ box, barWidth }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref, { box });
  const reduced = usePrefersReducedMotion();
  const bars = Math.max(1, Math.floor(width / barWidth));
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        ref={ref}
        className="relative h-44 w-full max-w-md min-w-40 resize overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface p-4 shadow-pui-sm"
        style={{ maxWidth: "100%", minHeight: 96, maxHeight: 280 }}
      >
        <div className="flex h-full items-end gap-1" aria-hidden="true">
          {HEIGHTS.slice(0, bars).map((h, i) => (
            <motion.span
              key={i}
              layout={!reduced}
              initial={reduced ? false : { scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={springs.smooth}
              className="flex-1 origin-bottom rounded-t-pui-sm bg-pui-primary/80"
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <span className="pointer-events-none absolute right-2 bottom-1 text-[10px] text-pui-muted-foreground">drag ⇲</span>
      </div>
      <p className="m-0 font-mono text-sm text-pui-foreground" aria-live="polite">
        {width} × {height} px · {bars} bars
      </p>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return <ResponsiveChart {...props} />;
}

function Mini() {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  return (
    <div ref={ref} className="flex h-16 w-36 items-center justify-center rounded-pui-md border border-dashed border-pui-border">
      <span className="font-mono text-xs text-pui-muted-foreground">
        {width} × {height}
      </span>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    [
      "const ref = useRef<HTMLDivElement>(null);",
      `const { width, height } = useElementSize(ref${props.box === "border-box" ? ', { box: "border-box" }' : ""});`,
      "",
      `const bars = Math.floor(width / ${props.barWidth});`,
      "return <div ref={ref}>{/* render for the measured size */}</div>;",
    ].join("\n"),
  propsTable: [
    { name: "ref", type: "RefObject<Element | null>", description: "The element to measure.", required: true },
    ...propDocs<UseElementSizeOptions>()([
      { name: "box", type: '"content-box" | "border-box"', default: '"content-box"', description: "Measure without or with padding and border." },
      { name: "round", type: "boolean", default: "true", description: "Whole pixels, so sub-pixel jitter doesn't re-render." },
    ]),
  ],
  a11y: ["Measurement only; nothing is rendered by the hook."],
  reducedMotion: "The demo adds and removes bars without the grow animation.",
};
export default item;
