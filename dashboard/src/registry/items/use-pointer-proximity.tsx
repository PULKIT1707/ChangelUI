import { motion, useTransform } from "motion/react";
import { usePointerProximity, type UsePointerProximityOptions } from "changelui";
import { useRef } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { radius: number; measure: NonNullable<UsePointerProximityOptions["measure"]> };
const defaults: DemoProps = { radius: 220, measure: "edge" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "radius", label: "Radius (px)", min: 60, max: 480, step: 20 },
  { type: "select", prop: "measure", label: "Measure from", options: ["edge", "center"] },
];

/** A card that glows and turns its compass needle toward the pointer as it approaches. */
function Compass({ radius, measure }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { distance, proximity, angle } = usePointerProximity(ref, { radius, measure });
  const glow = useTransform(proximity, (p) => `0 0 ${8 + p * 40}px ${p * 6}px color-mix(in oklab, var(--pui-primary) ${Math.round(p * 55)}%, transparent)`);
  const scale = useTransform(proximity, [0, 1], [1, 1.04]);
  const rotate = useTransform(angle, (a) => a + 90);
  const label = useTransform(distance, (d) => `${Math.round(d)}px`);
  const percent = useTransform(proximity, (p) => `${Math.round(p * 100)}%`);
  return (
    <motion.div
      ref={ref}
      style={{ boxShadow: glow, scale }}
      className="flex w-56 flex-col items-center gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5"
    >
      <div className="relative size-20 rounded-pui-full border border-pui-border bg-pui-muted/50" aria-hidden="true">
        <motion.span style={{ rotate }} className="absolute inset-0 flex justify-center">
          <span className="mt-1.5 h-8 w-1.5 rounded-pui-full bg-pui-primary" />
        </motion.span>
        <span className="absolute top-1/2 left-1/2 size-2.5 -translate-1/2 rounded-pui-full bg-pui-foreground" />
      </div>
      <dl className="m-0 grid w-full grid-cols-2 gap-1 font-mono text-xs">
        <dt className="text-pui-muted-foreground">distance</dt>
        <motion.dd className="m-0 text-right text-pui-foreground">{label}</motion.dd>
        <dt className="text-pui-muted-foreground">proximity</dt>
        <motion.dd className="m-0 text-right text-pui-foreground">{percent}</motion.dd>
      </dl>
    </motion.div>
  );
}

function Dot({ radius }: { radius: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { proximity } = usePointerProximity(ref, { radius: radius * 0.6 });
  const scale = useTransform(proximity, [0, 1], [1, 2.6]);
  const opacity = useTransform(proximity, [0, 1], [0.25, 1]);
  return <motion.span ref={ref} style={{ scale, opacity }} className="size-1.5 rounded-pui-full bg-pui-primary" />;
}

/** Each dot runs its own hook: a magnetic field that swells under the pointer. */
function DotField({ radius }: { radius: number }) {
  return (
    <div className="grid grid-cols-12 place-items-center gap-3" aria-hidden="true">
      {Array.from({ length: 48 }, (_, i) => (
        <Dot key={i} radius={radius} />
      ))}
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <Compass {...props} />
      <DotField radius={props.radius} />
      <p className="m-0 text-xs text-pui-muted-foreground">Move the pointer around the stage. Off for touch and reduced motion.</p>
    </div>
  );
}

function Mini() {
  return <DotField radius={160} />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    [
      "const ref = useRef<HTMLDivElement>(null);",
      `const { proximity, angle } = usePointerProximity(ref, { radius: ${props.radius}${props.measure === "edge" ? ', measure: "edge"' : ""} });`,
      "const scale = useTransform(proximity, [0, 1], [1, 1.04]);",
      "",
      "<motion.div ref={ref} style={{ scale }} />;",
    ].join("\n"),
  propsTable: [
    { name: "ref", type: "RefObject<Element | null>", description: "The element to measure against.", required: true },
    ...propDocs<UsePointerProximityOptions>()([
      { name: "radius", type: "number", default: "200", description: "px where proximity reaches 0." },
      { name: "measure", type: '"center" | "edge"', default: '"center"', description: "Distance from the center, or from the nearest edge (0 inside)." },
      { name: "enabled", type: "boolean", default: "true", description: "Also off for coarse pointers and under reduced motion." },
    ]),
    { name: "returns", type: "{ distance, proximity, angle, x, y }", description: "MotionValues; read them with useTransform. They never re-render the component." },
  ],
  a11y: ["Decorative input only: anything driven by it must also work without a pointer."],
  reducedMotion: "Values rest (proximity 0) and pointer tracking is off.",
};
export default item;
