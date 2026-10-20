import { motion, useTransform } from "motion/react";
import { usePrefersReducedMotion, useScrollVelocity } from "changelui";
import { useRef } from "react";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { smooth: boolean; maxSkew: number };
const defaults: DemoProps = { smooth: true, maxSkew: 12 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "smooth", label: "Smooth (spring)" },
  { type: "number", prop: "maxSkew", label: "Max skew (deg)", min: 0, max: 30, step: 1 },
];

const rows = ["Momentum", "Velocity", "Inertia", "Kinetic", "Flow", "Drift", "Glide", "Rush"];

function Readout({ smooth, maxSkew }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const velocity = useScrollVelocity({ container: ref, smooth: smooth ? undefined : false });
  const reduced = usePrefersReducedMotion();
  const skewX = useTransform(velocity, (v) => (reduced ? 0 : Math.max(-maxSkew, Math.min(maxSkew, -v / 80))));
  const meter = useTransform(velocity, (v) => Math.min(Math.abs(v) / 3000, 1));
  const label = useTransform(velocity, (v) => `${Math.round(v)} px/s`);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex items-center gap-3 rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2">
        <span className="text-xs text-pui-muted-foreground">velocity</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-pui-full bg-pui-muted" aria-hidden="true">
          <motion.div style={{ scaleX: meter }} className="h-full origin-left rounded-pui-full bg-pui-primary" />
        </div>
        <motion.span className="w-20 text-right font-mono text-xs text-pui-foreground">{label}</motion.span>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        aria-label="Scrollable demo: scroll fast to skew the words"
        className="h-60 overflow-y-auto rounded-pui-lg border border-pui-border bg-pui-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
      >
        <div className="flex flex-col items-center gap-6 py-10">
          {[...rows, ...rows].map((word, i) => (
            <motion.span
              key={i}
              style={{ skewX }}
              className="text-4xl font-black tracking-tight text-pui-foreground odd:text-pui-primary"
            >
              {word}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return <Readout {...props} />;
}

function Mini() {
  return (
    <span className="text-2xl font-black tracking-tight text-pui-foreground" style={{ transform: "skewX(-10deg)" }}>
      Velocity
    </span>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    [
      `const velocity = useScrollVelocity(${props.smooth ? "" : "{ smooth: false }"});`,
      `const skewX = useTransform(velocity, (v) => Math.max(-${props.maxSkew}, Math.min(${props.maxSkew}, -v / 80)));`,
      "",
      "<motion.h2 style={{ skewX }}>Momentum</motion.h2>;",
    ].join("\n"),
  propsTable: [
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box to watch. Default: the window." },
    { name: "axis", type: '"x" | "y"', default: '"y"', description: "Which scroll axis." },
    { name: "smooth", type: "SpringOptions | false", default: "{ damping: 50, stiffness: 400 }", description: "Spring that smooths the raw velocity, or false for the raw value." },
    { name: "returns", type: "MotionValue<number>", description: "px per second; positive scrolling down or right. Never re-renders." },
  ],
  a11y: ["Keep velocity effects decorative and subtle; the scroll box in the demo is keyboard focusable."],
  reducedMotion: "The demo keeps the words upright; the velocity reading still updates.",
};
export default item;
