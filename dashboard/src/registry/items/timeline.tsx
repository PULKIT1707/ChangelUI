import { Badge, Timeline, TimelineItem, type TimelineProps } from "changelui";
import { CodeIcon, LayersIcon, SendIcon, SparkIcon, ZapIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  orientation: NonNullable<TimelineProps["orientation"]>;
  align: NonNullable<TimelineProps["align"]>;
  animate: NonNullable<TimelineProps["animate"]>;
  icons: boolean;
};

const defaults: DemoProps = { orientation: "vertical", align: "start", animate: "scroll", icons: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "orientation", label: "Orientation", options: ["vertical", "horizontal"] },
  { type: "select", prop: "align", label: "Align (vertical)", options: ["start", "alternate"] },
  { type: "select", prop: "animate", label: "Animate", options: ["scroll", "inView", "none"] },
  { type: "boolean", prop: "icons", label: "Icon badges" },
];

const milestones = [
  { time: "Jan 2026", iso: "2026-01-15", title: "First commit", body: "Buttons, inputs and a theme file with 40 tokens.", icon: <CodeIcon /> },
  { time: "Mar 2026", iso: "2026-03-02", title: "Motion presets", body: "Shared springs, easings and variants across every component.", icon: <ZapIcon /> },
  { time: "Jun 2026", iso: "2026-06-20", title: "Charts", body: "Interactive, themeable charts with zero chart dependencies.", icon: <LayersIcon /> },
  { time: "Sep 2026", iso: "2026-09-09", title: "Power widgets", body: "Tree view, tables, color picker, resizable panels and more.", icon: <SparkIcon />, status: "current" as const },
  { time: "Q4 2026", iso: "2026-11-01", title: "Public release", body: "Docs site, templates and a 1.0 on npm.", icon: <SendIcon />, status: "upcoming" as const },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className={props.orientation === "vertical" ? "w-full max-w-2xl py-4" : "w-full py-4"}>
      <Timeline key={`${props.orientation}-${props.animate}`} orientation={props.orientation} align={props.align} animate={props.animate} aria-label="Project history">
        {milestones.map((m) => (
          <TimelineItem key={m.title} time={m.time} dateTime={m.iso} title={m.title} status={m.status} icon={props.icons ? m.icon : undefined}>
            {m.body}
          </TimelineItem>
        ))}
      </Timeline>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-52">
      <Timeline animate="none">
        <TimelineItem time="09:12" title="Order placed" />
        <TimelineItem time="11:40" title="Shipped" />
        <TimelineItem time="Today" title="Out for delivery" status="current" />
      </Timeline>
    </div>
  );
}

/** Order tracking: tones per event, a current step that pulses and a not-yet-reached last step. */
function TrackingDemo() {
  return (
    <div className="w-full rounded-pui-lg border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <Timeline animate="inView" aria-label="Order #4821">
        <TimelineItem time="Mon 09:12" dateTime="2026-10-12T09:12" title="Order placed" tone="neutral" />
        <TimelineItem time="Mon 15:40" dateTime="2026-10-12T15:40" title="Packed and shipped">
          Carrier: Swift Parcel · <span className="font-mono">SP-2291-77</span>
        </TimelineItem>
        <TimelineItem time="Tue 07:05" dateTime="2026-10-13T07:05" title="Delayed at hub" status="error">
          Weather at the regional hub. New estimate below.
        </TimelineItem>
        <TimelineItem time="Today" title="Out for delivery" status="current" tone="success" />
        <TimelineItem time="Est. 18:00" title="Delivered" status="upcoming" />
      </Timeline>
    </div>
  );
}

/** A changelog that zig-zags around a centered line on wide containers. */
function ChangelogDemo() {
  const releases = [
    { v: "1.3.0", date: "Oct 17", title: "Power widgets", notes: "Stepper, TreeView, Table, FileDropzone, ColorPicker, ResizablePanels, ScrollArea, Timeline." },
    { v: "1.2.0", date: "Oct 03", title: "Backgrounds", notes: "Flow field, halftone, matrix rain, topography and a gradient mesh." },
    { v: "1.1.0", date: "Sep 18", title: "Themes", notes: "Ten presets, a theme builder and a live customizer." },
    { v: "1.0.0", date: "Sep 01", title: "Hello world", notes: "The first public release." },
  ];
  return (
    <div className="w-full">
      <Timeline align="alternate" animate="inView" aria-label="Changelog">
        {releases.map((r, i) => (
          <TimelineItem
            key={r.v}
            time={r.date}
            title={
              <span className="inline-flex items-center gap-2">
                {r.title}
                <Badge size="sm" tone={i === 0 ? "primary" : "neutral"}>
                  v{r.v}
                </Badge>
              </span>
            }
            status={i === 0 ? "current" : "complete"}
          >
            {r.notes}
          </TimelineItem>
        ))}
      </Timeline>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const attrs = [
      p.orientation !== "vertical" ? `orientation="${p.orientation}"` : "",
      p.align !== "start" ? `align="${p.align}"` : "",
      p.animate !== "scroll" ? `animate="${p.animate}"` : "",
      'aria-label="Project history"',
    ].filter(Boolean);
    return `<Timeline ${attrs.join(" ")}>
  <TimelineItem time="Jan 2026" dateTime="2026-01-15" title="First commit"${p.icons ? " icon={<CodeIcon />}" : ""}>
    Buttons, inputs and a theme file.
  </TimelineItem>
  <TimelineItem time="Sep 2026" title="Power widgets" status="current" />
  <TimelineItem time="Q4 2026" title="Public release" status="upcoming" />
</Timeline>`;
  },
  propsTable: propDocs<TimelineProps & { title: unknown; time: unknown; dateTime: unknown; icon: unknown; status: unknown; tone: unknown }>()([
    { name: "orientation", type: '"vertical" | "horizontal"', default: '"vertical"', description: "Timeline: vertical list or a horizontal, scrollable row." },
    { name: "align", type: '"start" | "alternate"', default: '"start"', description: "Timeline: alternate zig-zags around a centered line in containers from 42rem." },
    { name: "animate", type: '"scroll" | "inView" | "none"', default: '"scroll"', description: "Timeline: line draws with scroll, once in view, or not at all." },
    { name: "title", type: "ReactNode", required: true, description: "TimelineItem: event title." },
    { name: "time", type: "ReactNode | Date", description: "TimelineItem: visible time, rendered in <time>." },
    { name: "dateTime", type: "string", description: "TimelineItem: machine-readable time (Dates set it automatically)." },
    { name: "icon", type: "ReactNode", description: "TimelineItem: icon badge instead of a dot." },
    { name: "status", type: '"complete" | "current" | "upcoming" | "error"', default: '"complete"', description: "TimelineItem: current pulses, upcoming is hollow, error is red." },
    { name: "tone", type: "Tone", default: '"primary"', description: "TimelineItem: dot color." },
  ]),
  a11y: [
    "An ordered list; each time is a <time> element with a dateTime when known.",
    "The current item has aria-current=\"step\"; the line and dots are decorative (aria-hidden).",
    "Content is always in the DOM, so it's readable before and without animation.",
  ],
  reducedMotion: "The line is drawn in full and dots and content appear without popping.",
  examples: [
    { title: "Order tracking", description: "Tones, an error event and a pulsing current step.", Demo: TrackingDemo },
    { title: "Changelog", description: "align=\"alternate\" around a centered line.", Demo: ChangelogDemo },
  ],
};

export default item;
