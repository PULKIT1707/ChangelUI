import {
  arcPath,
  linePath,
  pie,
  scaleLinear,
  scaleLog,
  scaleSqrt,
  scaleSymlog,
  scaleUtc,
  summarizeSeries,
  tickFormat,
  timeTicks,
  multiTimeFormat,
  treemap,
  fromNested,
  sumHierarchy,
  type ContinuousScale,
  type Curve,
} from "changelui";
import { mulberry32 } from "@pui-src/lib/random";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ChartDemo } from "../../components/chart-demo";
import { trafficSources, useSeed } from "../../lib/chart-data";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  scale: "linear" | "log" | "sqrt" | "symlog" | "utc";
  min: number;
  max: number;
  ticks: number;
  nice: boolean;
};
const defaults: DemoProps = { scale: "linear", min: 3, max: 912, ticks: 8, nice: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "scale", label: "Scale", options: ["linear", "log", "sqrt", "symlog", "utc"] },
  { type: "number", prop: "min", label: "Domain min", min: -500, max: 500, step: 1 },
  { type: "number", prop: "max", label: "Domain max", min: 1, max: 100_000, step: 1 },
  { type: "number", prop: "ticks", label: "Tick count", min: 2, max: 16, step: 1 },
  { type: "boolean", prop: "nice", label: "nice()" },
];

const W = 640;

function makeScale(kind: DemoProps["scale"], d: [number, number], range: [number, number]): ContinuousScale {
  if (kind === "log") return scaleLog([Math.max(0.01, d[0]), Math.max(0.02, d[1])], range);
  if (kind === "sqrt") return scaleSqrt([Math.max(0, d[0]), d[1]], range);
  if (kind === "symlog") return scaleSymlog(d, range);
  if (kind === "utc") return scaleUtc([Date.UTC(2026, 0, 1) + d[0] * 864e5, Date.UTC(2026, 0, 1) + d[1] * 864e5], range);
  return scaleLinear(d, range);
}

/** An axis drawn only with chart-scales math: the ticks slide to their new positions. */
function Preview({ props }: { props: DemoProps }) {
  const lo = Math.min(props.min, props.max - 1);
  const hi = Math.max(props.max, lo + 1);
  let s = makeScale(props.scale, [lo, hi], [24, W - 24]);
  if (props.nice) s = s.nice(props.ticks);
  const isTime = props.scale === "utc";
  const ticks = isTime ? timeTicks(s.domain[0], s.domain[1], props.ticks).ticks : s.ticks(props.ticks);
  const fmt = isTime ? multiTimeFormat("en-US", "UTC") : tickFormat(s.domain[0], s.domain[1], props.ticks, { compact: true });
  const samples = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: 40 }, () => lo + rand() ** 2 * (hi - lo));
  }, [lo, hi]);
  return (
    <div className="flex w-full flex-col gap-4">
      <svg viewBox={`0 0 ${W} 120`} className="w-full overflow-visible" role="img" aria-label={`${props.scale} scale from ${fmt(s.domain[0])} to ${fmt(s.domain[1])} with ${ticks.length} ticks`}>
        {samples.map((v, i) => (
          <motion.circle key={i} initial={false} animate={{ cx: s(isTime ? Date.UTC(2026, 0, 1) + v * 864e5 : v) }} cy={30 + (i % 5) * 7} r={3} fill="var(--pui-chart-1)" opacity={0.5} transition={{ type: "spring", stiffness: 170, damping: 26 }} />
        ))}
        <line x1={24} x2={W - 24} y1={78} y2={78} stroke="var(--pui-chart-axis)" />
        <AnimatePresence initial={false}>
          {ticks.map((t) => (
            <motion.g key={t} initial={{ opacity: 0, x: s(t) }} animate={{ opacity: 1, x: s(t) }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 170, damping: 26 }}>
              <line y1={74} y2={82} stroke="var(--pui-muted-foreground)" />
              <text y={100} textAnchor="middle" fontSize={11} fill="var(--pui-muted-foreground)" className="tabular-nums">
                {fmt(t)}
              </text>
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>
      <pre className="overflow-x-auto rounded-pui-md bg-pui-muted px-3 py-2 font-mono text-xs leading-5">
        {`const x = ${props.scale === "utc" ? "scaleUtc" : `scale${props.scale[0]?.toUpperCase()}${props.scale.slice(1)}`}([${isTime ? "t0, t1" : `${lo}, ${hi}`}], [0, width])${props.nice ? `.nice(${props.ticks})` : ""};\n`}
        {`x.domain  // [${isTime ? s.domain.map((v) => new Date(v).toISOString().slice(0, 10)).join(", ") : s.domain.map((v) => +v.toFixed(4)).join(", ")}]\n`}
        {`${isTime ? "timeTicks(t0, t1" : "x.ticks("}${isTime ? `, ${props.ticks})` : `${props.ticks})`}  // ${ticks.length} ticks`}
      </pre>
    </div>
  );
}

function Mini() {
  const pts = useMemo(() => {
    const rand = mulberry32(3);
    return Array.from({ length: 9 }, (_, i) => [i * 22 + 8, 20 + rand() * 50] as const);
  }, []);
  return (
    <svg viewBox="0 0 196 80" className="w-44" aria-hidden="true">
      <path d={linePath(pts, { curve: "monotone" })} fill="none" stroke="var(--pui-chart-1)" strokeWidth={2} />
      <path d={linePath(pts, { curve: "step" })} fill="none" stroke="var(--pui-chart-2)" strokeWidth={1.5} strokeDasharray="4 3" />
      {pts.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={2.5} fill="var(--pui-background)" stroke="var(--pui-chart-1)" />
      ))}
    </svg>
  );
}

const CURVES: Curve[] = ["linear", "monotone", "natural", "step", "stepAfter", "bump"];
function Curves() {
  const [seed, randomize] = useSeed(2);
  const [curve, setCurve] = useState<Curve>("monotone");
  const pts = useMemo(() => {
    const rand = mulberry32(seed * 97 + 1);
    return Array.from({ length: 10 }, (_, i) => [20 + i * 66, 30 + rand() * 120] as const);
  }, [seed]);
  return (
    <ChartDemo onRandomize={randomize} hint="linePath(points, { curve }): monotone never overshoots, natural does.">
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Curve">
        {CURVES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={curve === c}
            onClick={() => setCurve(c)}
            className={`rounded-pui-md border px-2 py-1 font-mono text-xs ${curve === c ? "border-pui-primary bg-pui-primary/10 text-pui-foreground" : "border-pui-border text-pui-muted-foreground hover:bg-pui-muted"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 640 180" className="w-full overflow-visible" role="img" aria-label={`Points joined with the ${curve} curve`}>
        <motion.path initial={false} animate={{ d: linePath(pts, { curve }) }} transition={{ type: "spring", stiffness: 170, damping: 26 }} fill="none" stroke="var(--pui-chart-1)" strokeWidth={2.5} strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <motion.circle key={i} initial={false} animate={{ cx: x, cy: y }} r={4} fill="var(--pui-background)" stroke="var(--pui-chart-1)" strokeWidth={2} />
        ))}
      </svg>
    </ChartDemo>
  );
}

function Layouts() {
  const [seed, randomize] = useSeed(5);
  const data = useMemo(() => trafficSources(seed, 6), [seed]);
  const slices = pie(data, (d) => d.value, { padAngle: 0.03, sort: "descending" });
  type Node = { name: string; value?: number; children?: Node[] };
  const tree: Node = { name: "all", children: data.map((d) => ({ name: d.name, value: d.value })) };
  const root = treemap(
    sumHierarchy(
      fromNested(tree, (d) => d.children),
      (d) => d.value,
    ),
    { width: 300, height: 160, paddingInner: 2, round: true },
  );
  const leaves = (root.children ?? []).map((n) => n);
  return (
    <ChartDemo onRandomize={randomize} hint="pie() + arcPath() and treemap(): plain math, the same in Node and RSC.">
      <div className="grid gap-4 sm:grid-cols-2">
        <svg viewBox="-90 -90 180 180" className="mx-auto w-40" role="img" aria-label="Donut built from pie and arcPath">
          {slices.map((s, i) => (
            <motion.path
              key={s.datum.name}
              initial={false}
              animate={{ d: arcPath({ innerRadius: 50, outerRadius: 86, startAngle: s.startAngle, endAngle: s.endAngle, padAngle: s.padAngle, cornerRadius: 4 }) }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              fill={`var(--pui-chart-${(i % 8) + 1})`}
            />
          ))}
        </svg>
        <svg viewBox="0 0 300 160" className="w-full" role="img" aria-label="Treemap built from treemap()">
          {leaves.map((n, i) => (
            <g key={(n.data as { name: string }).name}>
              <motion.rect initial={false} animate={{ x: n.x0, y: n.y0, width: Math.max(0, n.x1 - n.x0), height: Math.max(0, n.y1 - n.y0) }} transition={{ type: "spring", stiffness: 380, damping: 34 }} rx={4} fill={`var(--pui-chart-${(i % 8) + 1})`} />
              {n.x1 - n.x0 > 60 && n.y1 - n.y0 > 22 ? (
                <motion.text initial={false} animate={{ x: n.x0 + 6, y: n.y0 + 15 }} fontSize={10} fontWeight={600} fill="var(--pui-background)">
                  {(n.data as { name: string }).name}
                </motion.text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </ChartDemo>
  );
}

function Summaries() {
  const [seed, randomize] = useSeed(9);
  const ys = useMemo(() => {
    const rand = mulberry32(seed * 13 + 3);
    let v = 40;
    return Array.from({ length: 12 }, () => Math.round((v *= 1 + (rand() - 0.42) * 0.2)));
  }, [seed]);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const text = summarizeSeries({ label: "Revenue", xs: months, ys, format: { style: "currency", currency: "USD", notation: "compact" } });
  return (
    <ChartDemo onRandomize={randomize} hint="summarizeSeries(): the sentence every chart uses for screen readers.">
      <p className="rounded-pui-md border border-pui-border bg-pui-surface px-3 py-2 text-sm">{text}</p>
    </ChartDemo>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ scale, min, max, ticks, nice }) =>
    [
      `import { ${scale === "utc" ? "scaleUtc, timeTicks" : `scale${scale[0]?.toUpperCase()}${scale.slice(1)}`}, linePath } from "changelui/chart-scales";`,
      ``,
      `// Server-safe: no React, no "use client". Works in RSC, Node and canvas code.`,
      scale === "utc"
        ? `const x = scaleUtc([start, end], [0, width])${nice ? `.nice(${ticks})` : ""};\nconst ticks = timeTicks(...x.domain, ${ticks}).ticks;`
        : `const x = scale${scale[0]?.toUpperCase()}${scale.slice(1)}([${min}, ${max}], [0, width])${nice ? `.nice(${ticks})` : ""};\nconst ticks = x.ticks(${ticks});`,
      `const y = scaleLinear([0, 100], [height, 0]);`,
      `const d = linePath(rows.map((r) => [x(r.t), y(r.v)]), { curve: "monotone" });`,
    ].join("\n"),
  propsTable: [
    { name: "scaleLinear / Log / Sqrt / Pow / Symlog", type: "(domain, range, options?) => ContinuousScale", description: "Callable scales with invert, ticks, nice, copy and clamp." },
    { name: "scaleUtc / scaleTime", type: "(domain, range) => ContinuousScale", description: "Time scales (epoch ms); pair with timeTicks for calendar-aligned ticks." },
    { name: "scaleBand / scalePoint / scaleOrdinal / scaleQuantize", type: "(keys | domain, range, options?)", description: "Categorical and binned scales; band.at(px) finds the band under a pointer." },
    { name: "ticks / nice / timeTicks / logTicks", type: "(start, stop, count) => number[]", description: "Round tick values and nice domains." },
    { name: "formatNumber / formatDate / tickFormat / multiTimeFormat", type: "Intl-based formatters", description: "Cached Intl formatters; multi-level time labels (Mar, Apr, 2026)." },
    { name: "linePath / areaPath / arcPath / ribbonPath / roundedBarPath", type: "(points | options) => string", description: "SVG path data: monotone, natural, step and bump curves; padded rounded arcs." },
    { name: "pie / stack / treemap / partition / sankeyLayout / dodge", type: "layouts", description: "Angles, stacked bands, squarified rectangles, sunburst rings, flows and beeswarms." },
    { name: "bin / kde / boxStats / linearRegression / sma / ema / bollinger", type: "statistics", description: "Distributions, regression and finance indicators." },
    { name: "lttb / minMaxPerPixel / decimate", type: "(xs, ys, n) => number[]", description: "Downsample long series while keeping their shape." },
    { name: "summarizeSeries / detectInsights", type: "text and insights", description: "Plain-language summaries, extremes, anomalies, change points and streaks." },
  ],
  a11y: ["summarizeSeries builds the sentence every chart exposes to screen readers; use it for alt text in OG images and e-mails."],
  reducedMotion: "Pure functions: nothing animates unless your own markup does.",
  examples: [
    { title: "Curve explorer", description: "One point set, six curves; the path morphs between them.", Demo: Curves, wide: true },
    { title: "Layouts without a chart", description: "pie + arcPath and treemap, drawn by hand.", Demo: Layouts },
    { title: "Plain-language summary", description: "Randomize to read a new sentence.", Demo: Summaries },
  ],
};
export default item;
