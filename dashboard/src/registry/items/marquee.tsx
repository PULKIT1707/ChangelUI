import { Badge, Marquee, type MarqueeProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  direction: NonNullable<MarqueeProps["direction"]>;
  duration: number;
  gap: string;
  repeat: number;
  pauseOnHover: boolean;
  paused: boolean;
  fade: boolean;
};

const defaults: DemoProps = {
  direction: "left",
  duration: 30,
  gap: "1rem",
  repeat: 4,
  pauseOnHover: true,
  paused: false,
  fade: true,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "direction", label: "Direction", options: ["left", "right", "up", "down"] },
  { type: "number", prop: "duration", label: "Duration (s)", min: 5, max: 60, step: 5 },
  { type: "select", prop: "gap", label: "Gap", options: ["0.5rem", "1rem", "2rem"] },
  { type: "number", prop: "repeat", label: "Repeat", min: 1, max: 8, step: 1 },
  { type: "boolean", prop: "pauseOnHover", label: "Pause on hover" },
  { type: "boolean", prop: "paused", label: "Paused" },
  { type: "boolean", prop: "fade", label: "Fade edges" },
];

const labels = ["React", "TypeScript", "Tailwind", "Motion", "Vite", "Vitest"];

function Preview({ props }: { props: DemoProps }) {
  const vertical = props.direction === "up" || props.direction === "down";
  return (
    <Marquee {...props} className={vertical ? "h-56 w-40" : "w-full max-w-lg"}>
      {labels.map((label) => (
        <Badge key={label} variant="outline" tone="neutral" size="md">
          {label}
        </Badge>
      ))}
    </Marquee>
  );
}

function Mini() {
  return (
    <Marquee duration={15} className="w-40">
      {labels.slice(0, 4).map((label) => (
        <Badge key={label} variant="soft" tone="primary" size="sm">
          {label}
        </Badge>
      ))}
    </Marquee>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("Marquee", props, defaults, "{logos}", controls),
  propsTable: propDocs<MarqueeProps>()([
    { name: "direction", type: '"left" | "right" | "up" | "down"', default: '"left"', description: "Scroll direction." },
    { name: "duration", type: "number", default: "30", description: "Seconds per loop." },
    { name: "gap", type: "string", default: '"1rem"', description: "Space between items and copies." },
    { name: "repeat", type: "number", default: "4", description: "Number of copies (min 1)." },
    { name: "pauseOnHover", type: "boolean", default: "true", description: "Pause on hover and focus within." },
    { name: "paused", type: "boolean", default: "false", description: "Stop scrolling." },
    { name: "fade", type: "boolean", default: "true", description: "Fade the edges with a mask." },
  ]),
  a11y: [
    "Only the first copy is exposed: copies 2..n are aria-hidden and inert, so content is read and tabbed once.",
    "Pauses while hovered or while focus is inside (WCAG 2.2.2).",
  ],
  reducedMotion: "One copy in a scrollable row with no animation.",
};

export default item;
