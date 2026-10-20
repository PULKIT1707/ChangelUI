import { motion } from "motion/react";
import {
  Button,
  durations,
  easings,
  reducedVariant,
  springs,
  stagger,
  variants,
  usePrefersReducedMotion,
  type SpringName,
  type VariantPresetName,
} from "changelui";
import { useMemo, useState, type ReactNode } from "react";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { spring: SpringName; variant: VariantPresetName; each: number };
const springNames = Object.keys(springs) as SpringName[];
const variantNames = ["fadeUp", "fadeDown", "fade", "scaleIn", "blurIn", "popIn", "maskUp"] as const satisfies readonly VariantPresetName[];
const defaults: DemoProps = { spring: "bouncy", variant: "fadeUp", each: 0.06 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "spring", label: "Spring", options: springNames },
  { type: "select", prop: "variant", label: "Variant", options: variantNames },
  { type: "number", prop: "each", label: "Stagger (s)", min: 0, max: 0.2, step: 0.01 },
];

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}

/** Integrates a unit step response x(t) for a mass-spring-damper (semi-implicit Euler, 240 Hz). */
function simulate({ stiffness, damping, mass = 1 }: SpringConfig, seconds = 1.4): { points: [number, number][]; settle: number } {
  const dt = 1 / 240;
  let x = 0;
  let v = 0;
  let settle = seconds;
  const points: [number, number][] = [[0, 0]];
  for (let t = dt; t <= seconds; t += dt) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    points.push([t, x]);
    if (Math.abs(x - 1) > 0.005 || Math.abs(v) > 0.05) settle = seconds;
    else if (settle === seconds) settle = t;
  }
  return { points, settle };
}

const W = 320;
const H = 140;
const PAD = 12;

function SpringPlot({ name }: { name: SpringName }) {
  const config = springs[name];
  const { points, settle } = useMemo(() => simulate(config), [config]);
  const max = Math.max(1.05, ...points.map((p) => p[1]));
  const sx = (t: number) => PAD + (t / 1.4) * (W - PAD * 2);
  const sy = (x: number) => H - PAD - (x / max) * (H - PAD * 2);
  const d = points.map(([t, x], i) => `${i ? "L" : "M"}${sx(t).toFixed(1)} ${sy(x).toFixed(1)}`).join(" ");
  const reduced = usePrefersReducedMotion();
  return (
    <figure className="m-0 flex w-full flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`${name} spring response curve`}>
        <line x1={PAD} x2={W - PAD} y1={sy(1)} y2={sy(1)} className="stroke-pui-border" strokeDasharray="4 4" />
        <line x1={PAD} x2={W - PAD} y1={sy(0)} y2={sy(0)} className="stroke-pui-border" />
        <motion.path
          key={name}
          d={d}
          fill="none"
          className="stroke-pui-primary"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: easings.outExpo }}
        />
        <text x={W - PAD} y={sy(1) - 6} textAnchor="end" className="fill-pui-muted-foreground text-[10px]">
          target
        </text>
      </svg>
      <figcaption className="flex flex-wrap justify-between gap-2 font-mono text-[11px] text-pui-muted-foreground">
        <span>
          k {config.stiffness} · c {config.damping}
          {"mass" in config ? ` · m ${config.mass}` : ""}
        </span>
        <span>settles ≈ {Math.round(settle * 1000)}ms</span>
      </figcaption>
    </figure>
  );
}

function SpringRace({ name }: { name: SpringName }) {
  const [on, setOn] = useState(false);
  return (
    <div className="flex w-full flex-col gap-2">
      <div
        data-state={on ? "end" : "start"}
        className="flex h-10 w-full items-center rounded-pui-full border border-pui-border bg-pui-muted/60 px-1 data-[state=end]:justify-end"
      >
        <motion.span
          aria-hidden="true"
          layout
          className="size-8 rounded-pui-full bg-pui-primary shadow-pui-md"
          transition={springs[name]}
        />
      </div>
      <Button size="sm" variant="outline" tone="neutral" onClick={() => setOn((v) => !v)} className="self-start">
        Play {name}
      </Button>
    </div>
  );
}

const cards = ["Springs", "Easings", "Durations", "Variants", "Stagger", "Reduced"];

function VariantGrid({ variant, each }: { variant: VariantPresetName; each: number }) {
  const [run, setRun] = useState(0);
  const reduced = usePrefersReducedMotion();
  const child = reduced ? reducedVariant(variants[variant]) : variants[variant];
  const mask = variant === "maskUp";
  return (
    <div className="flex w-full flex-col gap-3">
      <motion.ul
        key={`${variant}-${run}-${each}`}
        className="m-0 grid list-none grid-cols-3 gap-2 p-0"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: stagger({ each }) } }}
      >
        {cards.map((label) => (
          <li key={label} className={mask ? "overflow-hidden rounded-pui-md" : undefined}>
            <motion.div
              variants={child}
              className="rounded-pui-md border border-pui-border bg-pui-surface px-2 py-3 text-center text-xs font-medium text-pui-foreground shadow-pui-xs"
            >
              {label}
            </motion.div>
          </li>
        ))}
      </motion.ul>
      <Button size="sm" variant="soft" onClick={() => setRun((n) => n + 1)} className="self-start">
        Replay {variant}
      </Button>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-3 rounded-pui-lg border border-pui-border bg-pui-surface/80 p-4">
      <h3 className="m-0 text-xs font-semibold tracking-wide text-pui-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
      <Panel title={`springs.${props.spring}`}>
        <SpringPlot name={props.spring} />
        <SpringRace name={props.spring} />
      </Panel>
      <Panel title={`variants.${props.variant} + stagger()`}>
        <VariantGrid variant={props.variant} each={props.each} />
      </Panel>
      <Panel title="durations">
        <ul className="m-0 grid list-none gap-1.5 p-0">
          {(Object.entries(durations) as [string, number][]).map(([name, seconds]) => (
            <li key={name} className="flex items-center gap-3 text-xs">
              <span className="w-14 font-mono text-pui-muted-foreground">{name}</span>
              <span className="h-2 rounded-pui-full bg-pui-primary/80" style={{ width: `${(seconds / durations.page) * 100}%` }} />
              <span className="ml-auto font-mono text-pui-foreground">{Math.round(seconds * 1000)}ms</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="easings">
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(easings) as [string, readonly number[]][]).map(([name, [x1, y1, x2, y2]]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <svg viewBox="-0.1 -0.6 1.2 2.2" className="h-12 w-full" aria-hidden="true">
                <g transform="translate(0 1) scale(1 -1)">
                  <path
                    d={`M0 0 C${x1} ${y1} ${x2} ${y2} 1 1`}
                    fill="none"
                    className="stroke-pui-primary"
                    strokeWidth={0.06}
                    strokeLinecap="round"
                  />
                </g>
              </svg>
              <span className="font-mono text-[10px] text-pui-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Mini() {
  return (
    <div className="w-40">
      <SpringPlot name="bouncy" />
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
      'import { motion } from "motion/react";',
      'import { springs, stagger, variants } from "changelui/motion-presets";',
      "",
      "<motion.ul",
      '  initial="hidden"',
      '  animate="visible"',
      `  variants={{ hidden: {}, visible: { transition: stagger({ each: ${props.each} }) } }}`,
      ">",
      "  {items.map((item) => (",
      `    <motion.li key={item.id} variants={variants.${props.variant}}>`,
      "      {item.label}",
      "    </motion.li>",
      "  ))}",
      "</motion.ul>;",
      "",
      `<motion.div layout transition={springs.${props.spring}} />;`,
    ].join("\n"),
  propsTable: [
    { name: "springs", type: "Record<SpringName, Transition>", description: "snappy, smooth, bouncy, press, layout, gentle, wobbly, heavy." },
    { name: "easings", type: "Record<EasingName, [x1, y1, x2, y2]>", description: "out, inOut, spring, outExpo, inQuint, emphasized. Mirrored as --pui-ease-*." },
    { name: "durations", type: "Record<DurationName, number>", description: "Seconds: instant, fast, base, slow, page. Mirrored as --pui-duration-*." },
    { name: "variants", type: "Record<VariantPresetName, Variants>", description: "hidden / visible / exit sets: fade, fadeUp, fadeDown, scaleIn, blurIn, popIn, maskUp, plus slideIn(direction, distance)." },
    { name: "stagger", type: "(options?: StaggerOptions) => Transition", description: "Parent transition that staggers variant children: each, delay, from first or last." },
    { name: "staggerDelay", type: "(index, total, options?) => number", description: "Delay for one child, including center-out, edges-in or from a given index." },
    { name: "exitFaster", type: "(transition, factor = 0.6) => Transition", description: "Shorter copy of a transition for exits." },
    { name: "reducedVariant", type: "(variants: Variants) => Variants", description: "Opacity-only, 150ms version of a variant set for reduced motion." },
    { name: "cssEasing", type: "(name: EasingName) => string", description: "cubic-bezier() string for inline styles and WAAPI." },
  ],
  a11y: [
    "Pure data and functions with no rendering. Server-safe: works in React Server Components.",
    "Pair every variant with reducedVariant() when usePrefersReducedMotion() is true.",
  ],
  reducedMotion: "The demo swaps to reducedVariant(): opacity-only 150ms fades, and the curve appears without drawing.",
};
export default item;
