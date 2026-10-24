import { Avatar, Badge, Button, PerspectiveWall, Sparkline, type PerspectiveWallProps } from "changelui";
import type { ReactNode } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  columns: number;
  duration: number;
  tiltX: number;
  tiltZ: number;
  flattenOnFocus: boolean;
  showControls: boolean;
};

const defaults: DemoProps = { columns: 4, duration: 36, tiltX: 38, tiltZ: -22, flattenOnFocus: true, showControls: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "columns", label: "Columns", min: 2, max: 6, step: 1 },
  { type: "number", prop: "duration", label: "Loop (s)", min: 10, max: 90, step: 2 },
  { type: "number", prop: "tiltX", label: "Tilt back (°)", min: 0, max: 60, step: 1 },
  { type: "number", prop: "tiltZ", label: "Turn (°)", min: -40, max: 40, step: 1 },
  { type: "boolean", prop: "flattenOnFocus", label: "Face-on on hover / focus" },
  { type: "boolean", prop: "showControls", label: "Pause button" },
];

const QUOTES = [
  { name: "Ada Park", role: "Head of Ops, Northwind", text: "We closed the month in two days instead of six." },
  { name: "Leo Brandt", role: "CTO, Fernway", text: "Setup took an afternoon. Our team never looked back." },
  { name: "Mia Chen", role: "Founder, Lumen Labs", text: "The first tool our finance and eng teams both like." },
  { name: "Omar Haddad", role: "PM, Brightpath", text: "Reports that used to take a day now update live." },
  { name: "Sara Novak", role: "Designer, Kiteform", text: "It feels fast in a way people notice right away." },
  { name: "Theo Ruiz", role: "Engineer, Copperline", text: "The API is so clean we built on it in a week." },
];

function QuoteTile({ q }: { q: (typeof QUOTES)[number] }) {
  return (
    <figure className="m-0 flex flex-col gap-3 p-4 text-sm">
      <blockquote className="m-0 leading-snug text-pui-foreground">“{q.text}”</blockquote>
      <figcaption className="flex items-center gap-2">
        <Avatar name={q.name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-pui-foreground">{q.name}</span>
          <span className="block truncate text-[11px] text-pui-muted-foreground">{q.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function MetricTile({ label, value, delta, data }: { label: string; value: string; delta: string; data: number[] }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between text-xs text-pui-muted-foreground">
        <span>{label}</span>
        <Badge size="sm" variant="soft" tone="success">
          {delta}
        </Badge>
      </div>
      <span className="text-2xl font-semibold text-pui-foreground tabular-nums">{value}</span>
      <Sparkline data={data} variant="area" fluid height={44} aria-label={`${label} trend`} />
    </div>
  );
}

function ScreenTile({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex h-6 items-center gap-1 border-b border-pui-border bg-pui-muted px-2.5" aria-hidden="true">
        <span className="size-1.5 rounded-pui-full bg-pui-danger/70" />
        <span className="size-1.5 rounded-pui-full bg-pui-warning/70" />
        <span className="size-1.5 rounded-pui-full bg-pui-success/70" />
      </div>
      <div className="flex flex-col gap-2 p-3">
        <span className="text-xs font-semibold text-pui-foreground">{title}</span>
        <span className={`h-14 rounded-pui-md bg-linear-to-br ${accent}`} aria-hidden="true" />
        <span className="h-2 w-4/5 rounded-pui-sm bg-pui-muted" aria-hidden="true" />
        <span className="h-2 w-3/5 rounded-pui-sm bg-pui-muted" aria-hidden="true" />
      </div>
    </div>
  );
}

const TILES: ReactNode[] = [
  <QuoteTile key="q0" q={QUOTES[0]!} />,
  <MetricTile key="m0" label="Revenue" value="$48.2k" delta="+18%" data={[8, 9, 11, 10, 13, 15, 14, 18]} />,
  <ScreenTile key="s0" title="Invoices" accent="from-pui-gradient-1/40 to-pui-gradient-2/30" />,
  <QuoteTile key="q1" q={QUOTES[1]!} />,
  <ScreenTile key="s1" title="Team inbox" accent="from-pui-gradient-2/40 to-pui-gradient-3/30" />,
  <MetricTile key="m1" label="Active users" value="12,904" delta="+6%" data={[20, 22, 21, 24, 26, 25, 28, 30]} />,
  <QuoteTile key="q2" q={QUOTES[2]!} />,
  <ScreenTile key="s2" title="Roadmap" accent="from-pui-gradient-3/40 to-pui-gradient-1/30" />,
  <QuoteTile key="q3" q={QUOTES[3]!} />,
  <MetricTile key="m2" label="Time to close" value="2.1 days" delta="−64%" data={[9, 8, 8, 6, 5, 4, 3, 2]} />,
  <QuoteTile key="q4" q={QUOTES[4]!} />,
  <ScreenTile key="s3" title="Analytics" accent="from-pui-primary/30 to-pui-gradient-2/30" />,
  <QuoteTile key="q5" q={QUOTES[5]!} />,
  <MetricTile key="m3" label="NPS" value="71" delta="+9" data={[55, 58, 60, 61, 64, 66, 69, 71]} />,
];

function Preview({ props }: { props: DemoProps }) {
  return <PerspectiveWall {...props} items={TILES} label="Customer stories" height="30rem" className="rounded-pui-xl" />;
}

function HeroDemo() {
  return (
    <section className="relative overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
      <PerspectiveWall items={TILES} columns={5} tiltX={44} tiltZ={-28} duration={44} height="26rem" label="Product screens" className="opacity-60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_center,var(--pui-background)_30%,transparent_75%)] px-6 text-center">
        <Badge variant="soft">Trusted by 4,000 teams</Badge>
        <h3 className="m-0 max-w-md text-2xl font-semibold text-pui-foreground">Run finance and ops from one place</h3>
        <p className="m-0 max-w-sm text-sm text-pui-muted-foreground">The wall behind keeps moving; hover it to pause and read.</p>
        <Button>Start free trial</Button>
      </div>
    </section>
  );
}

function LinksDemo() {
  const posts = ["Close the books in 2 days", "Designing for trust", "Our API, one year in", "How we test billing", "Shipping weekly", "Dark mode, done right"];
  return (
    <PerspectiveWall
      columns={5}
      tiltX={30}
      tiltZ={18}
      height="20rem"
      label="Latest posts"
      minPerColumn={3}
      items={posts.map((title, i) => (
        <a key={title} href="#/effects/perspective-wall" className="flex flex-col gap-1 p-4 text-sm no-underline outline-hidden">
          <span className="text-[11px] font-medium text-pui-muted-foreground">Blog · {i + 2} min read</span>
          <span className="font-semibold text-pui-foreground">{title}</span>
        </a>
      ))}
    />
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-full">
      <PerspectiveWall items={TILES.slice(0, 8)} columns={4} height="11rem" gap="0.5rem" showControls={false} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>("PerspectiveWall", props, { ...defaults }, undefined, controls as ControlSpec<Record<string, unknown>>[]).replace(
      "<PerspectiveWall",
      '<PerspectiveWall items={stories.map((s) => <StoryCard key={s.id} {...s} />)} label="Customer stories"',
    ),
  propsTable: propDocs<PerspectiveWallProps>()([
    { name: "items", type: "ReactNode[]", description: "Tiles, dealt round-robin into the columns.", required: true },
    { name: "columns", type: "number", default: "4", description: "Column count." },
    { name: "duration", type: "number", default: "36", description: "Seconds per loop; later columns drift a little slower." },
    { name: "tiltX", type: "number", default: "38", description: "Tilt back, degrees." },
    { name: "tiltZ", type: "number", default: "-22", description: "Turn, degrees." },
    { name: "height", type: "string", default: '"30rem"', description: "CSS height." },
    { name: "gap", type: "string", default: '"1rem"', description: "Gap between tiles and columns." },
    { name: "minPerColumn", type: "number", default: "4", description: "Repeat tiles so short lists still fill the wall." },
    { name: "flattenOnFocus", type: "boolean", default: "true", description: "Turn the hovered or focused tile face-on." },
    { name: "showControls", type: "boolean", default: "true", description: "Pause / play button." },
    { name: "defaultPaused", type: "boolean", default: "false", description: "Start paused." },
    { name: "tileClassName", type: "string", description: "Classes for every tile." },
    { name: "label", type: "string", default: '"Gallery"', description: "Region name." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus a link inside a tile: the wall pauses and the tile turns face-on" },
    { keys: "Enter / Space", action: "Pause or play (on the button)" },
  ],
  a11y: [
    "A labelled region; every item is exposed once, loop copies and repeats are aria-hidden and inert.",
    "A pause button meets WCAG 2.2.2, and hover or focus inside also pauses the drift.",
  ],
  reducedMotion: "The wall stays tilted but still: no drift, no pause button, and tiles turn without a transition.",
  examples: [
    { title: "Hero backdrop", description: "A dimmed wall behind a headline and CTA.", Demo: HeroDemo, wide: true },
    { title: "Linked posts", description: "Five columns turned the other way; Tab through the links.", Demo: LinksDemo, wide: true },
  ],
};

export default item;
