import { StickerPeel, type StickerPeelProps } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  direction: NonNullable<StickerPeelProps["direction"]>;
  peel: number;
  rest: number;
  back: NonNullable<StickerPeelProps["back"]>;
  draggable: boolean;
  hover: boolean;
  disabled: boolean;
};

const defaults: DemoProps = {
  direction: "bottom-right",
  peel: 0.3,
  rest: 0.06,
  back: "paper",
  draggable: true,
  hover: true,
  disabled: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "direction", label: "Corner", options: ["bottom-right", "bottom-left", "top-right", "top-left"] },
  { type: "number", prop: "peel", label: "Hover peel", min: 0, max: 0.8, step: 0.05 },
  { type: "number", prop: "rest", label: "Rest peel", min: 0, max: 0.3, step: 0.01 },
  { type: "select", prop: "back", label: "Back", options: ["paper", "mirror"] },
  { type: "boolean", prop: "draggable", label: "Draggable" },
  { type: "boolean", prop: "hover", label: "Peel on hover" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="size-10" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [peeled, setPeeled] = useState(0);
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <StickerPeel {...props} onPeeled={() => setPeeled((n) => n + 1)}>
        <div className="flex size-44 flex-col items-center justify-center gap-2 rounded-pui-xl border-4 border-pui-surface bg-linear-to-br from-pui-gradient-1 via-pui-gradient-2 to-pui-gradient-3 text-pui-primary-foreground shadow-pui-lg">
          <Star />
          <span className="text-lg font-bold tracking-tight">Shipped it</span>
          <span className="text-xs font-medium opacity-80">v2.0 · launch week</span>
        </div>
      </StickerPeel>
      <p className="m-0 text-xs text-pui-muted-foreground" aria-live="polite">
        Hover, or grab the corner and pull.{peeled > 0 ? ` Fully peeled ${peeled}×.` : ""}
      </p>
    </div>
  );
}

function BadgesDemo() {
  const badges: { label: string; corner: DemoProps["direction"]; className: string }[] = [
    { label: "NEW", corner: "top-right", className: "bg-pui-primary text-pui-primary-foreground" },
    { label: "-30%", corner: "bottom-left", className: "bg-pui-danger text-pui-danger-foreground" },
    { label: "BETA", corner: "bottom-right", className: "bg-pui-warning text-pui-warning-foreground" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-2">
      {badges.map((badge) => (
        <StickerPeel key={badge.label} direction={badge.corner} peel={0.45} rest={0.12}>
          <span className={`flex h-14 min-w-20 items-center justify-center rounded-pui-md px-4 text-lg font-black tracking-wide ${badge.className}`}>
            {badge.label}
          </span>
        </StickerPeel>
      ))}
    </div>
  );
}

function AvatarDemo() {
  return (
    <div className="flex items-center gap-4">
      <StickerPeel direction="bottom-right" peel={0.4} back="mirror">
        <div className="flex size-24 items-center justify-center rounded-pui-lg bg-linear-to-br from-pui-gradient-2 to-pui-gradient-3 text-3xl font-bold text-pui-primary-foreground">
          AK
        </div>
      </StickerPeel>
      <div className="text-sm">
        <p className="m-0 font-semibold text-pui-foreground">Mirror back</p>
        <p className="m-0 text-pui-muted-foreground">The flap shows a faded copy of the front.</p>
      </div>
    </div>
  );
}

function Mini() {
  return (
    <StickerPeel rest={0.22} draggable={false} hover={false}>
      <div className="flex size-20 items-center justify-center rounded-pui-lg border-2 border-pui-surface bg-linear-to-br from-pui-gradient-1 to-pui-gradient-2 text-pui-primary-foreground">
        <Star />
      </div>
    </StickerPeel>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("StickerPeel", props, defaults, "<Badge>NEW</Badge>", controls),
  propsTable: propDocs<StickerPeelProps>()([
    { name: "direction", type: '"top-left" | "top-right" | "bottom-left" | "bottom-right"', default: '"bottom-right"', description: "Corner that lifts." },
    { name: "peel", type: "number", default: "0.3", description: "Peel on hover, as a share of the shorter side." },
    { name: "rest", type: "number", default: "0.06", description: "Peel at rest (also the reduced-motion state)." },
    { name: "back", type: '"paper" | "mirror"', default: '"paper"', description: "Plain sticker paper or a faded mirrored copy." },
    { name: "draggable", type: "boolean", default: "true", description: "Grab the corner and pull; it snaps back on release." },
    { name: "hover", type: "boolean", default: "true", description: "Peel on hover and focus within." },
    { name: "onPeeled", type: "() => void", description: "Called when the corner is pulled past ~85%." },
    { name: "disabled", type: "boolean", default: "false", description: "Static, at the rest peel." },
  ]),
  a11y: [
    "The front is the real content; the flap, shade and shadow are aria-hidden, and the mirrored copy is inert.",
    "Keyboard focus inside the sticker peels it like hover does.",
    "Drags never start on nested buttons, links or inputs.",
  ],
  reducedMotion: "Static with a slightly lifted corner; no hover or drag.",
  examples: [
    { title: "Price badges", description: "Different corners on the same row.", Demo: BadgesDemo },
    { title: "Avatar, mirror back", Demo: AvatarDemo },
  ],
};

export default item;
