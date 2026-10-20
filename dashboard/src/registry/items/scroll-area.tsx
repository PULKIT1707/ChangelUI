import { Avatar, Badge, ScrollArea, type ScrollAreaProps } from "changelui";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  scrollbar: NonNullable<ScrollAreaProps["scrollbar"]>;
  fade: boolean;
  fadeSize: number;
  hideDelayMs: number;
};

const defaults: DemoProps = { scrollbar: "hover", fade: true, fadeSize: 32, hideDelayMs: 800 };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "scrollbar", label: "Scrollbar", options: ["hover", "scroll", "always", "never"] },
  { type: "boolean", prop: "fade", label: "Edge fade" },
  { type: "number", prop: "fadeSize", label: "Fade size (px)", min: 8, max: 80, step: 4 },
  { type: "number", prop: "hideDelayMs", label: "Hide delay (ms)", min: 200, max: 2000, step: 100 },
];

const people = [
  "Ada Lovelace",
  "Alan Turing",
  "Barbara Liskov",
  "Claude Shannon",
  "Donald Knuth",
  "Edsger Dijkstra",
  "Frances Allen",
  "Grace Hopper",
  "Hedy Lamarr",
  "Ivan Sutherland",
  "John McCarthy",
  "Katherine Johnson",
  "Leslie Lamport",
  "Margaret Hamilton",
  "Niklaus Wirth",
  "Radia Perlman",
];

const roles = ["Admin", "Editor", "Viewer"] as const;

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-(--pui-shadow-sm)">
      <div className="flex items-center justify-between border-b border-pui-border px-4 py-3">
        <span className="text-sm font-semibold">Members</span>
        <Badge size="sm">{people.length}</Badge>
      </div>
      <ScrollArea label="Members" scrollbar={props.scrollbar} fade={props.fade} fadeSize={props.fadeSize} hideDelayMs={props.hideDelayMs} className="h-72">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-2">
          {people.map((name, i) => (
            <li key={name} className="flex items-center gap-3 rounded-pui-md px-2 py-2 hover:bg-pui-muted/60">
              <Avatar name={name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <span className="text-xs text-pui-muted-foreground">{roles[i % 3]}</span>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-48 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface">
      <ScrollArea scrollbar="always" className="h-28">
        <div className="flex flex-col gap-1.5 p-2.5">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="h-2 rounded-full bg-pui-muted" style={{ width: `${55 + ((i * 37) % 40)}%` }} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

const tags = ["All", "Design", "Engineering", "Motion", "Charts", "Themes", "Accessibility", "Performance", "Release notes", "Tutorials"];

/** Horizontal chips with edge fades that appear only where there's more to scroll. */
function ChipsDemo() {
  return (
    <ScrollArea orientation="horizontal" label="Topics" className="w-full">
      <div className="flex w-max gap-2 px-1 py-2">
        {tags.map((t, i) => (
          <span
            key={t}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${i === 0 ? "border-pui-primary bg-pui-primary text-pui-primary-foreground" : "border-pui-border bg-pui-surface text-pui-foreground"}`}
          >
            {t}
          </span>
        ))}
      </div>
    </ScrollArea>
  );
}

/** Both axes: a wide changelog table that scrolls in 2D with overlay bars on two edges. */
function GridDemo() {
  const cols = ["Version", "Date", "Components", "Charts", "Fixes", "Breaking", "Notes"];
  return (
    <div className="w-full overflow-hidden rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground">
      <ScrollArea orientation="both" scrollbar="always" label="Release history" className="h-48">
        <table className="w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c} className="sticky top-0 border-b border-pui-border bg-pui-surface px-3 py-2 text-start text-xs font-medium text-pui-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => (
              <tr key={i}>
                <td className="border-b border-pui-border px-3 py-2 font-mono text-xs">1.{12 - i}.0</td>
                <td className="border-b border-pui-border px-3 py-2 text-pui-muted-foreground">2026-{String(12 - (i % 12)).padStart(2, "0")}-01</td>
                <td className="border-b border-pui-border px-3 py-2">{8 + ((i * 3) % 7)}</td>
                <td className="border-b border-pui-border px-3 py-2">{(i * 5) % 9}</td>
                <td className="border-b border-pui-border px-3 py-2">{12 + ((i * 7) % 20)}</td>
                <td className="border-b border-pui-border px-3 py-2">{i % 5 === 0 ? "Yes" : "No"}</td>
                <td className="whitespace-nowrap border-b border-pui-border px-3 py-2 text-pui-muted-foreground">Polish, docs and new demos</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

/** Long terms text: the fade tells the reader there's more, and Tab focuses the region for keyboard scrolling. */
function TermsDemo() {
  return (
    <div className="flex w-full flex-col gap-2">
      <ScrollArea label="Terms of service" fadeSize={48} className="h-48 rounded-pui-lg border border-pui-border bg-pui-surface">
        <div className="flex flex-col gap-3 p-4 text-sm leading-relaxed text-pui-muted-foreground">
          {Array.from({ length: 6 }, (_, i) => (
            <p key={i} className="m-0">
              <strong className="text-pui-foreground">{i + 1}. Section.</strong> The component is provided as is. You may copy, adapt and ship it in your
              products. Keep native scrolling so wheel, touch, keyboard and find-in-page all keep working the way users expect.
            </p>
          ))}
        </div>
      </ScrollArea>
      <span className="text-xs text-pui-muted-foreground">Tab into the region and use arrow keys, Page Up/Down or Space.</span>
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
      'label="Members"',
      p.scrollbar !== "hover" ? `scrollbar="${p.scrollbar}"` : "",
      !p.fade ? "fade={false}" : "",
      p.fadeSize !== 32 ? `fadeSize={${p.fadeSize}}` : "",
      p.hideDelayMs !== 800 ? `hideDelayMs={${p.hideDelayMs}}` : "",
      'className="h-72"',
    ].filter(Boolean);
    return `<ScrollArea ${attrs.join(" ")}>
  <MemberList />
</ScrollArea>`;
  },
  propsTable: propDocs<ScrollAreaProps>()([
    { name: "orientation", type: '"vertical" | "horizontal" | "both"', default: '"vertical"', description: "Scroll axis." },
    { name: "fade", type: "boolean", default: "true", description: "Mask the content at edges that have more to scroll." },
    { name: "fadeSize", type: "number", default: "32", description: "Fade length in px; grows with the scroll distance." },
    { name: "scrollbar", type: '"hover" | "scroll" | "always" | "never"', default: '"hover"', description: "When the overlay thumb shows; never keeps the native bar." },
    { name: "hideDelayMs", type: "number", default: "800", description: "How long the bar stays after scrolling stops." },
    { name: "label", type: "string", description: "Names the region; it's focusable whenever it overflows." },
    { name: "viewportClassName", type: "string", description: "Classes for the scrolling element." },
    { name: "viewportRef", type: "Ref<HTMLDivElement>", description: "Ref to the scrolling element (scrollTo, scroll-linked hooks)." },
    { name: "onScroll", type: "UIEventHandler", description: "Scroll events of the viewport." },
  ]),
  keyboard: [{ keys: "Tab, arrows / Page Up / Page Down / Space", action: "Focus the region and scroll natively" }],
  a11y: [
    "Scrolling stays native: wheel, touch, keyboard, find-in-page and scroll anchoring work as usual.",
    "The overlay bars are aria-hidden; pointer users can drag the thumb or click the track to page.",
    "With label the viewport is role=region, and it's in the tab order only while it overflows.",
  ],
  reducedMotion: "Nothing moves on its own; the bar appears without a fade.",
  examples: [
    { title: "Horizontal chips", Demo: ChipsDemo, wide: true },
    { title: "Both axes", description: "A wide table with two overlay bars.", Demo: GridDemo },
    { title: "Terms text", description: "A longer fade and keyboard scrolling.", Demo: TermsDemo },
  ],
};

export default item;
