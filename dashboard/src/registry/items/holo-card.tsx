import { HoloCard, type HoloCardProps } from "changelui";
import { useRef } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  foil: NonNullable<HoloCardProps["foil"]>;
  intensity: number;
  maxTilt: number;
  glare: boolean;
  sparkle: boolean;
  shimmer: boolean;
  disabled: boolean;
};

const defaults: DemoProps = {
  foil: "rainbow",
  intensity: 1,
  maxTilt: 14,
  glare: true,
  sparkle: true,
  shimmer: true,
  disabled: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "foil", label: "Foil", options: ["rainbow", "galaxy", "metal"] },
  { type: "number", prop: "intensity", label: "Intensity", min: 0, max: 2, step: 0.1 },
  { type: "number", prop: "maxTilt", label: "Max tilt (deg)", min: 0, max: 30, step: 1 },
  { type: "boolean", prop: "glare", label: "Glare" },
  { type: "boolean", prop: "sparkle", label: "Sparkle" },
  { type: "boolean", prop: "shimmer", label: "Idle shimmer" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

/** Generated card art: token gradients and a few shapes, no images. */
function Art({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 200 120" className="block h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--pui-gradient-1)" />
          <stop offset="60%" stopColor="var(--pui-gradient-2)" />
          <stop offset="100%" stopColor="var(--pui-gradient-3)" />
        </linearGradient>
      </defs>
      <rect width="200" height="120" fill={`url(#${id}-sky)`} />
      <circle cx="148" cy="38" r="20" fill="var(--pui-shimmer)" opacity="0.85" />
      <path d="M0 92 L40 60 L70 80 L110 42 L150 78 L200 54 L200 120 L0 120 Z" fill="var(--pui-foreground)" opacity="0.35" />
      <path d="M0 104 L50 78 L90 96 L130 70 L170 92 L200 82 L200 120 L0 120 Z" fill="var(--pui-foreground)" opacity="0.55" />
    </svg>
  );
}

function TradingCard({ props }: { props: DemoProps }) {
  return (
    <HoloCard
      {...props}
      className="w-64 rounded-pui-xl border border-pui-border bg-pui-surface p-2.5 text-pui-surface-foreground shadow-pui-xl"
    >
      <div className="flex items-center justify-between px-1.5 pb-2">
        <span className="text-sm font-semibold">Aurora Peak</span>
        <span className="text-xs font-medium text-pui-muted-foreground">HP 120</span>
      </div>
      <div className="h-36 overflow-hidden rounded-pui-lg border border-pui-border">
        <Art id="holo-main" />
      </div>
      <div className="mt-3 flex flex-col gap-2 px-1.5 pb-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Prism Burst</span>
          <span className="font-mono text-pui-muted-foreground">80</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Static Field</span>
          <span className="font-mono text-pui-muted-foreground">40</span>
        </div>
        <p className="m-0 border-t border-pui-border pt-2 text-[11px] leading-snug text-pui-muted-foreground">
          Rare · 041/165 · Tilt to catch the light.
        </p>
      </div>
    </HoloCard>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <TradingCard props={props} />
      <p className="m-0 text-xs text-pui-muted-foreground">Move the pointer over the card.</p>
    </div>
  );
}

function MembershipDemo() {
  return (
    <HoloCard
      foil="metal"
      intensity={1.2}
      maxTilt={10}
      className="flex aspect-[1.586] w-72 flex-col justify-between rounded-pui-xl bg-pui-foreground p-5 text-pui-background shadow-pui-xl"
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold tracking-wide">PULLS / BLACK</span>
        <span aria-hidden="true" className="h-7 w-9 rounded-pui-sm bg-pui-muted-foreground/60" />
      </div>
      <div>
        <p className="m-0 font-mono text-sm tracking-[0.2em]">4821 •••• •••• 0193</p>
        <div className="mt-2 flex justify-between text-[11px] opacity-75">
          <span>A. MEMBER</span>
          <span>09/31</span>
        </div>
      </div>
    </HoloCard>
  );
}

function BadgeDemo() {
  return (
    <HoloCard
      foil="galaxy"
      intensity={1.4}
      maxTilt={20}
      className="flex size-44 flex-col items-center justify-center gap-1 rounded-full border border-pui-border bg-linear-to-br from-pui-gradient-1 to-pui-gradient-2 text-pui-primary-foreground shadow-pui-lg"
    >
      <span className="text-4xl font-bold">100</span>
      <span className="text-xs font-semibold tracking-widest uppercase">day streak</span>
    </HoloCard>
  );
}

function Mini() {
  const ref = useRef<HTMLDivElement>(null);
  useAutoPointer(ref);
  return (
    <HoloCard
      ref={ref}
      maxTilt={16}
      className="h-24 w-36 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface p-1.5 shadow-pui-md"
    >
      <div className="h-full overflow-hidden rounded-pui-md">
        <Art id="holo-mini" />
      </div>
    </HoloCard>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx(
      "HoloCard",
      { ...props, className: "rounded-pui-xl border border-pui-border bg-pui-surface p-3" } as DemoProps,
      defaults,
      "...",
      controls,
    ),
  propsTable: propDocs<HoloCardProps>()([
    { name: "foil", type: '"rainbow" | "galaxy" | "metal"', default: '"rainbow"', description: "Foil pattern, colored by theme tokens." },
    { name: "intensity", type: "number", default: "1", description: "Foil strength, 0-2." },
    { name: "glare", type: "boolean", default: "true", description: "Glare that follows the pointer." },
    { name: "sparkle", type: "boolean", default: "true", description: "Sparkle grain near the glare." },
    { name: "shimmer", type: "boolean", default: "true", description: "Idle shimmer sweep every ~6s." },
    { name: "maxTilt", type: "number", default: "14", description: "Maximum rotation in degrees." },
    { name: "perspective", type: "number", default: "900", description: "Perspective in px." },
    { name: "scale", type: "number", default: "1.03", description: "Scale while hovered." },
    { name: "disabled", type: "boolean", default: "false", description: "Static foil, no tilt." },
  ]),
  a11y: [
    "Every foil layer is aria-hidden and ignores the pointer, so content and focus order are unchanged.",
    "Off for touch pointers; the idle shimmer still plays.",
  ],
  reducedMotion: "A static, subtle foil: no tilt, glare, sparkle or shimmer.",
  examples: [
    { title: "Metal membership card", description: "foil=\"metal\" on an inverted card.", Demo: MembershipDemo },
    { title: "Galaxy achievement", description: "A round badge with a strong tilt.", Demo: BadgeDemo },
  ],
};

export default item;
