import { AnimatedBeam, cn, type AnimatedBeamProps } from "changelui";
import { forwardRef, useRef, type ReactNode, type RefObject } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  duration: number;
  curvature: number;
  pulseLength: number;
  pathWidth: number;
  reverse: boolean;
  dashed: boolean;
  glow: boolean;
};

const defaults: DemoProps = { duration: 3, curvature: 0, pulseLength: 0.25, pathWidth: 2, reverse: false, dashed: false, glow: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "duration", label: "Duration (s)", min: 1, max: 8, step: 0.5 },
  { type: "number", prop: "curvature", label: "Curvature (px)", min: -120, max: 120, step: 10 },
  { type: "number", prop: "pulseLength", label: "Pulse length", min: 0.05, max: 0.9, step: 0.05 },
  { type: "number", prop: "pathWidth", label: "Path width", min: 1, max: 5, step: 0.5 },
  { type: "boolean", prop: "reverse", label: "Reverse" },
  { type: "boolean", prop: "dashed", label: "Dashed path" },
  { type: "boolean", prop: "glow", label: "Glow" },
];

const glyphs: Record<string, ReactNode> = {
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />,
  cloud: <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </>
  ),
};

const Node = forwardRef<HTMLDivElement, { glyph: string; label: string; size?: "sm" | "lg"; className?: string }>(function Node(
  { glyph, label, size = "sm", className },
  ref,
) {
  return (
    <div
      ref={ref}
      title={label}
      className={cn(
        "relative z-10 flex items-center justify-center rounded-pui-full border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-md",
        size === "lg" ? "size-16" : "size-12",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className={size === "lg" ? "size-7" : "size-5"} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {glyphs[glyph]}
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
});

function useRefs(count: number) {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const c = useRef<HTMLDivElement>(null);
  const d = useRef<HTMLDivElement>(null);
  const e = useRef<HTMLDivElement>(null);
  const f = useRef<HTMLDivElement>(null);
  return [a, b, c, d, e, f].slice(0, count) as RefObject<HTMLDivElement | null>[];
}

function Preview({ props }: { props: DemoProps }) {
  const container = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const sources = useRefs(3);
  const outputs = useRefs(3);
  const sourceNodes = [
    { glyph: "database", label: "Database" },
    { glyph: "mail", label: "Email" },
    { glyph: "chat", label: "Chat" },
  ];
  const outputNodes = [
    { glyph: "chart", label: "Analytics" },
    { glyph: "user", label: "CRM" },
    { glyph: "cloud", label: "Storage" },
  ];
  return (
    <div ref={container} className="relative flex w-full max-w-lg items-center justify-between px-2 py-6">
      <div className="flex flex-col gap-8">
        {sourceNodes.map((node, i) => (
          <Node key={node.label} ref={sources[i]} {...node} />
        ))}
      </div>
      <Node ref={hub} glyph="bolt" label="Pulls hub" size="lg" className="border-pui-primary/40 text-pui-primary" />
      <div className="flex flex-col gap-8">
        {outputNodes.map((node, i) => (
          <Node key={node.label} ref={outputs[i]} {...node} />
        ))}
      </div>
      {sources.map((ref, i) => (
        <AnimatedBeam
          key={`in-${i}`}
          containerRef={container}
          fromRef={ref}
          toRef={hub}
          {...props}
          curvature={props.curvature + (i - 1) * -40}
          delay={i * 0.4}
        />
      ))}
      {outputs.map((ref, i) => (
        <AnimatedBeam
          key={`out-${i}`}
          containerRef={container}
          fromRef={hub}
          toRef={ref}
          {...props}
          curvature={props.curvature + (i - 1) * 40}
          delay={1.2 + i * 0.4}
          gradientStart="var(--pui-gradient-2)"
          gradientStop="var(--pui-gradient-3)"
        />
      ))}
    </div>
  );
}

function PipelineDemo() {
  const container = useRef<HTMLDivElement>(null);
  const steps = useRefs(4);
  const labels = [
    { glyph: "file", label: "Commit" },
    { glyph: "bolt", label: "Build" },
    { glyph: "chart", label: "Test" },
    { glyph: "cloud", label: "Deploy" },
  ];
  return (
    <div ref={container} className="relative flex w-full flex-col items-center gap-6 py-2">
      {labels.map((node, i) => (
        <div key={node.label} className="flex items-center gap-3">
          <Node ref={steps[i]} {...node} />
          <span className="w-14 text-xs font-medium text-pui-muted-foreground">{node.label}</span>
        </div>
      ))}
      {steps.slice(0, -1).map((ref, i) => (
        <AnimatedBeam key={i} containerRef={container} fromRef={ref} toRef={steps[i + 1] as RefObject<HTMLDivElement | null>} startXOffset={-34} endXOffset={-34} duration={1.6} delay={i * 0.55} repeatDelay={1.2} pulseLength={0.5} dashed />
      ))}
    </div>
  );
}

function FanDemo() {
  const container = useRef<HTMLDivElement>(null);
  const user = useRef<HTMLDivElement>(null);
  const devices = useRefs(5);
  const glyphNames = ["mail", "chat", "file", "database", "cloud"];
  return (
    <div ref={container} className="relative flex w-full flex-col items-center gap-16 py-2">
      <Node ref={user} glyph="user" label="You" size="lg" />
      <div className="flex gap-3">
        {glyphNames.map((glyph, i) => (
          <Node key={glyph} ref={devices[i]} glyph={glyph} label={glyph} />
        ))}
      </div>
      {devices.map((ref, i) => (
        <AnimatedBeam key={i} containerRef={container} fromRef={ref} toRef={user} reverse curvature={(i - 2) * 18} duration={2.4} delay={i * 0.25} pathColor="color-mix(in oklab, var(--pui-border) 70%, transparent)" />
      ))}
    </div>
  );
}

function Mini() {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 80" className="h-20 w-40">
      <defs>
        <linearGradient id="mini-beam" x1="0" x2="1">
          <stop offset="0" stopColor="var(--pui-gradient-1)" />
          <stop offset="1" stopColor="var(--pui-gradient-2)" />
        </linearGradient>
      </defs>
      <path d="M20 20 Q 60 20 80 40 M20 60 Q 60 60 80 40 M80 40 L140 40" stroke="var(--pui-border)" strokeWidth="2" fill="none" />
      <path d="M40 22 Q 66 26 80 40 L120 40" stroke="url(#mini-beam)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {[
        [20, 20],
        [20, 60],
        [140, 40],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill="var(--pui-surface)" stroke="var(--pui-border)" />
      ))}
      <circle cx="80" cy="40" r="11" fill="var(--pui-surface)" stroke="var(--pui-primary)" />
    </svg>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    [
      "const container = useRef(null);",
      "const from = useRef(null);",
      "const to = useRef(null);",
      "",
      '<div ref={container} className="relative flex justify-between">',
      "  <Node ref={from} />",
      "  <Node ref={to} />",
      `  ${toJsx<Record<string, unknown>>("AnimatedBeam", { containerRef: "{container}", fromRef: "{from}", toRef: "{to}", ...props }, defaults, undefined, controls as ControlSpec<Record<string, unknown>>[]).replace(/="(\{[^"]*\})"/g, "=$1")}`,
      "</div>",
    ].join("\n"),
  propsTable: propDocs<AnimatedBeamProps>()([
    { name: "containerRef", type: "RefObject<HTMLElement>", description: "Relative element holding both endpoints; the SVG covers it.", required: true },
    { name: "fromRef", type: "RefObject<HTMLElement>", description: "Start element (its center).", required: true },
    { name: "toRef", type: "RefObject<HTMLElement>", description: "End element (its center).", required: true },
    { name: "curvature", type: "number", default: "0", description: "px the curve bends off the straight line." },
    { name: "duration", type: "number", default: "3", description: "Seconds for the pulse to travel." },
    { name: "delay", type: "number", default: "0", description: "Seconds before the first pulse." },
    { name: "repeatDelay", type: "number", default: "0.5", description: "Seconds of rest between pulses." },
    { name: "reverse", type: "boolean", default: "false", description: "Pulse travels from toRef to fromRef." },
    { name: "pulseLength", type: "number", default: "0.25", description: "Pulse length as a fraction of the beam." },
    { name: "pathColor", type: "string", default: "var(--pui-border)", description: "Resting path color." },
    { name: "pathWidth", type: "number", default: "2", description: "Stroke width in px." },
    { name: "pathOpacity", type: "number", default: "1", description: "Resting path opacity." },
    { name: "dashed", type: "boolean", default: "false", description: "Dashed resting path." },
    { name: "gradientStart", type: "string", default: "var(--pui-gradient-1)", description: "Pulse tail color." },
    { name: "gradientStop", type: "string", default: "var(--pui-gradient-2)", description: "Pulse head color." },
    { name: "glow", type: "boolean", default: "true", description: "Blurred halo around the pulse." },
    { name: "startXOffset", type: "number", default: "0", description: "Start x offset from the center, px (startYOffset for y)." },
    { name: "endXOffset", type: "number", default: "0", description: "End x offset from the center, px (endYOffset for y)." },
  ]),
  a11y: [
    "The beam is decorative: aria-hidden SVG with pointer-events: none.",
    "Give the endpoint elements their own accessible names; the diagram's meaning should not depend on the beams.",
  ],
  reducedMotion: "The path is drawn without the traveling pulse.",
  examples: [
    { title: "CI pipeline", description: "Vertical beams with offsets, short staggered pulses and a dashed path.", Demo: PipelineDemo },
    { title: "Fan-in", description: "Reverse beams converge on one node.", Demo: FanDemo },
  ],
};

export default item;
