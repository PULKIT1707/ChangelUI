import { CircularText, type CircularTextProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  text: string;
  radius: number;
  fontSize: number;
  duration: number;
  hoverSpeed: number;
  repeat: number;
  reverse: boolean;
};

const defaults: DemoProps = {
  text: "SCROLL TO EXPLORE",
  radius: 70,
  fontSize: 13,
  duration: 20,
  hoverSpeed: 4,
  repeat: 2,
  reverse: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "text", label: "Text", maxLength: 40 },
  { type: "number", prop: "radius", label: "Radius (px)", min: 30, max: 140, step: 2 },
  { type: "number", prop: "fontSize", label: "Font size (px)", min: 8, max: 28, step: 1 },
  { type: "number", prop: "duration", label: "Seconds per turn", min: 0, max: 60, step: 1 },
  { type: "number", prop: "hoverSpeed", label: "Hover speed", min: 1, max: 10, step: 0.5 },
  { type: "number", prop: "repeat", label: "Repeat", min: 1, max: 4, step: 1 },
  { type: "boolean", prop: "reverse", label: "Reverse" },
];

function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-6">
      <CircularText {...props} className="font-semibold tracking-[0.2em] text-pui-foreground">
        <span className="grid size-14 place-items-center rounded-pui-full bg-pui-primary text-pui-primary-foreground shadow-pui-md">
          <ArrowDown />
        </span>
      </CircularText>
      <p className="m-0 text-xs text-pui-muted-foreground">Hover to speed it up.</p>
    </div>
  );
}

function HireDemo() {
  return (
    <a
      href="#/text/circular-text"
      onClick={(e) => e.preventDefault()}
      aria-label="Available for work, get in touch"
      className="rounded-pui-full no-underline outline-offset-4 focus-visible:outline-2 focus-visible:outline-pui-ring"
    >
      <CircularText text="AVAILABLE FOR WORK" repeat={2} radius={54} fontSize={11} duration={14} className="font-medium tracking-[0.18em] text-pui-foreground">
        <span className="relative grid size-16 place-items-center rounded-pui-full border border-pui-border bg-pui-surface text-xl font-bold text-pui-surface-foreground">
          JD
          <span aria-hidden="true" className="absolute right-0.5 bottom-0.5 size-3.5 rounded-pui-full border-2 border-pui-surface bg-pui-success" />
        </span>
      </CircularText>
    </a>
  );
}

function StampDemo() {
  return (
    <div className="grid w-full place-items-center rounded-pui-lg bg-pui-primary py-8 text-pui-primary-foreground">
      <CircularText text="LIMITED EDITION" separator=" ✦ " repeat={2} radius={62} fontSize={12} duration={24} reverse className="font-bold tracking-[0.25em]">
        <span className="text-center text-xs leading-tight font-semibold tracking-widest uppercase">
          Drop
          <br />
          <span className="text-2xl font-black tracking-tight">No. 07</span>
        </span>
      </CircularText>
    </div>
  );
}

function BadgesDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <CircularText text="NEW" repeat={3} radius={34} fontSize={9} duration={10} className="font-bold tracking-[0.2em] text-pui-primary">
        <span className="text-lg" aria-hidden="true">
          ★
        </span>
      </CircularText>
      <CircularText text="OPEN SOURCE" separator=" · " repeat={2} radius={40} fontSize={9} duration={0} className="font-semibold tracking-[0.2em] text-pui-muted-foreground">
        <span className="font-pui-mono text-sm font-bold text-pui-foreground">MIT</span>
      </CircularText>
    </div>
  );
}

function Mini() {
  return <CircularText text="CHANGELUI" repeat={3} radius={34} fontSize={10} duration={12} className="font-semibold tracking-[0.2em] text-pui-foreground" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "CircularText",
      props,
      { text: undefined, radius: 60, fontSize: 13, duration: 20, hoverSpeed: 4, repeat: 1, reverse: false },
      "<ArrowDownIcon />",
      controls as ControlSpec<Record<string, unknown>>[],
    ),
  propsTable: propDocs<CircularTextProps>()([
    { name: "text", type: "string", description: "Ring text, spaced evenly around the full circle.", required: true },
    { name: "children", type: "ReactNode", description: "Center content: an icon, arrow, avatar or logo." },
    { name: "radius", type: "number", default: "60", description: "Radius of the text baseline in px." },
    { name: "fontSize", type: "number", default: "13", description: "Ring font size in px." },
    { name: "duration", type: "number", default: "20", description: "Seconds per turn; 0 stops the spin." },
    { name: "hoverSpeed", type: "number", default: "4", description: "Speed multiplier while hovered or focused, ramped over 0.4s." },
    { name: "reverse", type: "boolean", default: "false", description: "Spin counter-clockwise." },
    { name: "separator", type: "string", default: '" • "', description: "Added after the text so the seam reads cleanly." },
    { name: "repeat", type: "number", default: "1", description: "Times the text repeats around the ring." },
  ]),
  a11y: [
    "The SVG is role=\"img\" labelled with the ring text; the repeated glyphs are not read.",
    "Put links or buttons around it, not inside the ring; label them for their action.",
    "Pauses while off-screen and in background tabs.",
  ],
  reducedMotion: "The ring stays still.",
  examples: [
    { title: "Hire me badge", description: "Wrapped in a link, with an avatar and status dot.", Demo: HireDemo },
    { title: "Stamp", description: "Reversed on a brand surface with a custom separator.", Demo: StampDemo },
    { title: "Small seals", description: "Tight radii; duration 0 for a static seal.", Demo: BadgesDemo, wide: true },
  ],
};
export default item;
