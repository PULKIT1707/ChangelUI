import {
  Avatar,
  Badge,
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  type HoverCardContentProps,
  type HoverCardProps,
} from "changelui";
import { useState } from "react";
import { ClockIcon, GlobeIcon, PinIcon, StarGlyph, UsersIcon } from "../../lib/demo-icons";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  side: NonNullable<HoverCardContentProps["side"]>;
  align: NonNullable<HoverCardContentProps["align"]>;
  openDelayMs: number;
  closeDelayMs: number;
  arrow: boolean;
};

const defaults: DemoProps = { side: "bottom", align: "center", openDelayMs: 500, closeDelayMs: 150, arrow: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "side", label: "Side", options: ["top", "right", "bottom", "left"] },
  { type: "select", prop: "align", label: "Align", options: ["start", "center", "end"] },
  { type: "number", prop: "openDelayMs", label: "Open delay (ms)", min: 0, max: 1200, step: 50 },
  { type: "number", prop: "closeDelayMs", label: "Close delay (ms)", min: 0, max: 800, step: 50 },
  { type: "boolean", prop: "arrow", label: "Arrow" },
];

function ProfileCard() {
  const [following, setFollowing] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Avatar name="Maya Okafor" size="lg" />
        <Button size="sm" variant={following ? "outline" : "solid"} onClick={() => setFollowing((f) => !f)} aria-pressed={following}>
          {following ? "Following" : "Follow"}
        </Button>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-pui-foreground">Maya Okafor</span>
        <span className="text-xs text-pui-muted-foreground">@maya · she/her</span>
      </div>
      <p className="m-0 text-sm leading-relaxed text-pui-muted-foreground">
        Design engineer. Springs, focus rings and the occasional shader. Building motion systems in the open.
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pui-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <PinIcon className="size-3.5" /> Lisbon
        </span>
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="size-3.5" />
          <strong className="font-semibold text-pui-foreground">{following ? "2,419" : "2,418"}</strong> followers
        </span>
      </div>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <p className="m-0 max-w-md text-center text-sm leading-relaxed text-pui-muted-foreground">
      The new spring presets were tuned by{" "}
      <HoverCard openDelayMs={props.openDelayMs} closeDelayMs={props.closeDelayMs}>
        <HoverCardTrigger href="#maya">@maya</HoverCardTrigger>
        <HoverCardContent side={props.side} align={props.align} arrow={props.arrow}>
          <ProfileCard />
        </HoverCardContent>
      </HoverCard>{" "}
      after a week of side-by-side comparisons. Hover or tab to the mention.
    </p>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-pui-primary underline underline-offset-4">@maya</span>
      <div className="flex w-44 flex-col gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-3 shadow-pui-md">
        <div className="flex items-center gap-2">
          <Avatar name="Maya Okafor" size="sm" />
          <div className="flex flex-col gap-1">
            <div className="h-2 w-16 rounded-full bg-pui-foreground/70" />
            <div className="h-1.5 w-10 rounded-full bg-pui-muted-foreground/50" />
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-pui-muted" />
        <div className="h-1.5 w-3/4 rounded-full bg-pui-muted" />
      </div>
    </div>
  );
}

const links = [
  {
    text: "view transitions",
    host: "developer.chrome.com",
    title: "Smooth transitions with the View Transition API",
    body: "Animate between DOM states with a single call, including cross-document navigations.",
    hue: "from-pui-chart-1 to-pui-chart-2",
  },
  {
    text: "spring physics",
    host: "motion.dev",
    title: "Springs: stiffness, damping and mass",
    body: "Why physical springs feel more natural than fixed-duration easing curves.",
    hue: "from-pui-chart-3 to-pui-chart-4",
  },
  {
    text: "OKLCH",
    host: "oklch.com",
    title: "OKLCH color picker and converter",
    body: "Perceptually uniform lightness makes theme palettes predictable across hues.",
    hue: "from-pui-chart-5 to-pui-chart-1",
  },
];

/** Link previews inside running text: each link peeks at its destination. */
function LinkPreviewDemo() {
  const [a, b, c] = links;
  const preview = (link: (typeof links)[number]) => (
    <HoverCard openDelayMs={350}>
      <HoverCardTrigger href={`#${link.host}`}>{link.text}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-72 overflow-hidden p-0">
        <div aria-hidden="true" className={`h-20 bg-linear-to-br ${link.hue}`} />
        <div className="flex flex-col gap-1 p-3">
          <span className="inline-flex items-center gap-1 text-[11px] text-pui-muted-foreground">
            <GlobeIcon className="size-3" /> {link.host}
          </span>
          <span className="text-sm font-semibold leading-snug text-pui-foreground">{link.title}</span>
          <span className="text-xs leading-relaxed text-pui-muted-foreground">{link.body}</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
  if (!a || !b || !c) return null;
  return (
    <p className="m-0 text-sm leading-7 text-pui-muted-foreground">
      Page changes use {preview(a)} where the browser supports them, every press and toggle runs on {preview(b)}, and the ten
      theme presets are generated in {preview(c)} so contrast holds in light and dark mode.
    </p>
  );
}

const team = [
  { name: "Ana Ruiz", role: "Engineering lead", city: "Madrid", time: "14:20", status: "Focusing", online: true },
  { name: "Kenji Sato", role: "Motion designer", city: "Tokyo", time: "21:20", status: "In a meeting", online: true },
  { name: "Lea Novak", role: "Accessibility", city: "Ljubljana", time: "14:20", status: "Away", online: false },
  { name: "Omar Haddad", role: "Charts", city: "Amman", time: "15:20", status: "Reviewing PRs", online: true },
];

/** Hover an avatar to see who it is, their local time and status. */
function TeamDemo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex -space-x-2">
        {team.map((person) => (
          <HoverCard key={person.name} openDelayMs={200} closeDelayMs={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                aria-label={person.name}
                className="relative cursor-pointer rounded-full ring-2 ring-pui-background transition-transform duration-150 hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring motion-reduce:transition-none"
              >
                <Avatar name={person.name} />
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" arrow className="w-64">
              <div className="flex items-center gap-3">
                <span className="relative">
                  <Avatar name={person.name} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-pui-surface ${person.online ? "bg-pui-success" : "bg-pui-muted-foreground"}`}
                  />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-pui-foreground">{person.name}</span>
                  <span className="truncate text-xs text-pui-muted-foreground">{person.role}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-pui-border pt-3 text-xs text-pui-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="size-3.5" /> {person.time} in {person.city}
                </span>
                <Badge size="sm" tone={person.online ? "success" : "neutral"} dot>
                  {person.status}
                </Badge>
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
      <span className="text-xs text-pui-muted-foreground">4 people on this project</span>
    </div>
  );
}

const tickers = [
  { symbol: "PUI", name: "ChangelUI Labs", price: 128.42, change: 3.1, points: [4, 6, 5, 8, 7, 9, 12, 11, 14, 13, 16] },
  { symbol: "SPRG", name: "Spring Dynamics", price: 54.1, change: -1.4, points: [12, 11, 12, 10, 9, 10, 8, 9, 7, 8, 7] },
];

function Spark({ points, up }: { points: number[]; up: boolean }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * 200} ${56 - ((p - min) / (max - min || 1)) * 48}`)
    .join(" ");
  return (
    <svg aria-hidden="true" viewBox="0 0 200 60" className="h-14 w-full">
      <path d={`${d} L200 60 L0 60 Z`} className={up ? "fill-pui-success/12" : "fill-pui-danger/12"} />
      <path d={d} fill="none" strokeWidth="2" strokeLinejoin="round" className={up ? "stroke-pui-success" : "stroke-pui-danger"} />
    </svg>
  );
}

/** Data peek: hover a ticker in a sentence to see its intraday chart. */
function TickerDemo() {
  return (
    <p className="m-0 text-sm leading-7 text-pui-muted-foreground">
      Today{" "}
      {tickers.map((t, i) => (
        <span key={t.symbol}>
          <HoverCard openDelayMs={250}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="cursor-pointer rounded-pui-sm bg-pui-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-pui-foreground hover:bg-pui-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
              >
                ${t.symbol}
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-60">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-pui-foreground">{t.name}</span>
                <span className={`text-xs font-medium tabular-nums ${t.change >= 0 ? "text-pui-success-text" : "text-pui-danger-text"}`}>
                  {t.change >= 0 ? "+" : ""}
                  {t.change}%
                </span>
              </div>
              <span className="text-xl font-semibold tabular-nums text-pui-foreground">${t.price.toFixed(2)}</span>
              <Spark points={t.points} up={t.change >= 0} />
              <span className="inline-flex items-center gap-1 text-[11px] text-pui-muted-foreground">
                <StarGlyph className="size-3" /> Intraday, delayed 15 min
              </span>
            </HoverCardContent>
          </HoverCard>
          {i === 0 ? " closed higher while " : " slipped after earnings."}
        </span>
      ))}
    </p>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (p) => {
    const root = [p.openDelayMs !== 500 ? `openDelayMs={${p.openDelayMs}}` : "", p.closeDelayMs !== 150 ? `closeDelayMs={${p.closeDelayMs}}` : ""]
      .filter(Boolean)
      .join(" ");
    const content = [p.side !== "bottom" ? `side="${p.side}"` : "", p.align !== "center" ? `align="${p.align}"` : "", p.arrow ? "arrow" : ""]
      .filter(Boolean)
      .join(" ");
    return `<HoverCard${root ? ` ${root}` : ""}>
  <HoverCardTrigger href="/maya">@maya</HoverCardTrigger>
  <HoverCardContent${content ? ` ${content}` : ""}>
    <Avatar name="Maya Okafor" size="lg" />
    <p>Design engineer. Springs, focus rings and the occasional shader.</p>
  </HoverCardContent>
</HoverCard>

// Any element can be the trigger
<HoverCardTrigger asChild>
  <button type="button" aria-label="Ana Ruiz"><Avatar name="Ana Ruiz" /></button>
</HoverCardTrigger>`;
  },
  propsTable: propDocs<HoverCardProps & HoverCardContentProps>()([
    { name: "openDelayMs", type: "number", default: "500", description: "Root: hover or keyboard-focus time before opening." },
    { name: "closeDelayMs", type: "number", default: "150", description: "Root: grace period to move the pointer into the card." },
    { name: "open", type: "boolean", description: "Root: controlled state (defaultOpen, onOpenChange)." },
    { name: "disabled", type: "boolean", default: "false", description: "Root: never opens." },
    { name: "side", type: '"top" | "right" | "bottom" | "left"', default: '"bottom"', description: "Content: preferred side; flips when there is no room." },
    { name: "align", type: '"start" | "center" | "end"', default: '"center"', description: "Content: cross-axis alignment." },
    { name: "sideOffset", type: "number", default: "8", description: "Content: gap to the trigger in px." },
    { name: "arrow", type: "boolean", default: "false", description: "Content: arrow pointing at the trigger." },
    { name: "container", type: "HTMLElement | null", description: "Content: portal target." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focusing the trigger with the keyboard opens the card after the delay" },
    { keys: "Escape", action: "Close the card" },
  ],
  a11y: [
    "The card is supplementary: it is not announced and does not take focus, so the trigger must make sense alone.",
    "Opens on mouse/pen hover and :focus-visible focus; touch taps follow the link instead.",
    "Moving from the trigger into the card keeps it open, so links and buttons inside stay reachable.",
    "HoverCardTrigger renders a link; use asChild for buttons or avatars and give icon-only triggers an aria-label.",
  ],
  reducedMotion: "The card fades in place without scaling or sliding.",
  examples: [
    { title: "Link previews", description: "Peek at a link's destination without leaving the paragraph.", Demo: LinkPreviewDemo, wide: true },
    { title: "Team avatars", description: "asChild avatar buttons with status and local time.", Demo: TeamDemo },
    { title: "Data peek", description: "Ticker symbols that reveal an intraday sparkline.", Demo: TickerDemo },
  ],
};

export default item;
