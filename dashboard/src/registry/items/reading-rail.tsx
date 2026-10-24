import { Badge, Kbd, ReadingRail, type ReadingRailProps, type ReadingRailSection } from "changelui";
import { useEffect, useRef, type ReactNode } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  side: NonNullable<ReadingRailProps["side"]>;
  labels: NonNullable<ReadingRailProps["labels"]>;
  railHeight: number;
  offset: number;
  spring: boolean;
  showTimeLeft: boolean;
};

const defaults: DemoProps = { side: "left", labels: "active", railHeight: 320, offset: 96, spring: true, showTimeLeft: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "side", label: "Side", options: ["left", "right"] },
  { type: "select", prop: "labels", label: "Labels", options: ["active", "always", "none"] },
  { type: "number", prop: "railHeight", label: "Rail height (px)", min: 160, max: 360, step: 20 },
  { type: "number", prop: "offset", label: "Active offset (px)", min: 24, max: 200, step: 8 },
  { type: "boolean", prop: "spring", label: "Spring" },
  { type: "boolean", prop: "showTimeLeft", label: "Time left" },
];

interface Chapter {
  slug: string;
  title: string;
  paragraphs: string[];
}

const GUIDE: Chapter[] = [
  {
    slug: "before",
    title: "Before you start",
    paragraphs: [
      "This guide takes a fresh project from an empty folder to a deployed preview. You need a recent runtime, a terminal and about fifteen minutes.",
      "Every command below is safe to run twice. If a step fails, fix the message it prints and run it again; nothing is half-applied.",
    ],
  },
  {
    slug: "install",
    title: "Install the CLI",
    paragraphs: [
      "Install the command line tool globally, then check the version it prints. The tool updates itself in the background, so you only do this once per machine.",
      "Behind a proxy, set the usual proxy variables first. The installer reads them and so does every later command.",
      "On shared machines prefer a per-user install. It avoids permission prompts and keeps your tokens out of other accounts.",
    ],
  },
  {
    slug: "configure",
    title: "Configure the project",
    paragraphs: [
      "Run the init command inside your project. It asks three questions: the framework, the output folder and the region closest to your users.",
      "The answers land in a small config file at the project root. Commit it; your teammates and the build server read the same file.",
    ],
  },
  {
    slug: "secrets",
    title: "Add secrets safely",
    paragraphs: [
      "Never put keys in the config file. Add them with the secrets command instead; they are encrypted at rest and injected only at build time.",
      "Preview deployments get their own copies, so a test key can never leak into production by accident.",
      "Rotate a secret by adding the new value, deploying, then removing the old one. Running builds keep the value they started with.",
    ],
  },
  {
    slug: "deploy",
    title: "Deploy a preview",
    paragraphs: [
      "Push a branch and a preview deploys automatically. The URL appears in your terminal and as a comment on the pull request.",
      "Previews sleep after an hour without traffic and wake on the next request, so leaving them around costs nothing.",
    ],
  },
  {
    slug: "next",
    title: "Where to go next",
    paragraphs: [
      "Add a custom domain, turn on analytics for previews only, or wire the deploy hook into your chat so the team sees every release.",
    ],
  },
];

function sectionsFor(prefix: string, chapters: Chapter[]): ReadingRailSection[] {
  return chapters.map((chapter) => ({ id: `${prefix}-${chapter.slug}`, label: chapter.title }));
}

function Article({ prefix, chapters, intro }: { prefix: string; chapters: Chapter[]; intro?: ReactNode }) {
  return (
    <article className="max-w-prose space-y-4 pb-24 text-sm leading-relaxed text-pui-muted-foreground">
      {intro}
      {chapters.map((chapter) => (
        <section key={chapter.slug} className="space-y-3">
          <h3 id={`${prefix}-${chapter.slug}`} className="m-0 scroll-mt-6 pt-2 text-base font-semibold text-pui-foreground outline-none">
            {chapter.title}
          </h3>
          {chapter.paragraphs.map((text, i) => (
            <p key={i} className="m-0">
              {text}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}

const PREVIEW_SECTIONS = sectionsFor("rr-guide", GUIDE);

function Preview({ props }: { props: DemoProps }) {
  const box = useRef<HTMLDivElement>(null);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-2">
      <div
        ref={box}
        tabIndex={0}
        role="region"
        aria-label="Deployment guide"
        className="h-[440px] w-full overflow-y-auto rounded-pui-xl border border-pui-border bg-pui-surface p-6 outline-none focus-visible:ring-2 focus-visible:ring-pui-ring"
      >
        <ReadingRail {...props} container={box} sections={PREVIEW_SECTIONS} stickyTop={8}>
          <Article
            prefix="rr-guide"
            chapters={GUIDE}
            intro={
              <div className="space-y-2">
                <Badge variant="soft" tone="primary">
                  Guide
                </Badge>
                <h2 className="m-0 text-xl font-semibold tracking-tight text-pui-foreground">Ship your first preview</h2>
              </div>
            }
          />
        </ReadingRail>
      </div>
      <p className="m-0 text-xs text-pui-muted-foreground">
        Scroll the guide, hover the rail for every section, click a node to jump, or focus it and press <Kbd>↑</Kbd>{" "}
        <Kbd>↓</Kbd>.
      </p>
    </div>
  );
}

const CHANGELOG: Chapter[] = [
  { slug: "v32", title: "3.2 · Saved views", paragraphs: ["Save any filter set as a view and share it with a link.", "Views remember column order, density and sort.", "Pinned views appear in the sidebar for everyone on the team."] },
  { slug: "v31", title: "3.1 · Faster search", paragraphs: ["Search now returns results while you type, ranked by recent activity.", "Typos are forgiven up to two characters."] },
  { slug: "v30", title: "3.0 · New editor", paragraphs: ["A rebuilt editor with slash commands, tables and inline comments.", "Old documents convert on first open; nothing to migrate by hand.", "Keyboard shortcuts match the ones you already know."] },
  { slug: "v29", title: "2.9 · Dark mode", paragraphs: ["Every surface now follows your system theme.", "Charts pick contrast-safe colors in both modes."] },
];

function ChangelogDemo() {
  const box = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={box}
      tabIndex={0}
      role="region"
      aria-label="Changelog"
      className="h-80 overflow-y-auto rounded-pui-xl border border-pui-border bg-pui-surface p-5 outline-none focus-visible:ring-2 focus-visible:ring-pui-ring"
    >
      <ReadingRail container={box} sections={sectionsFor("rr-log", CHANGELOG)} side="right" labels="always" railHeight={220} width={150} offset={56} stickyTop={4} showTimeLeft={false}>
        <Article prefix="rr-log" chapters={CHANGELOG} />
      </ReadingRail>
    </div>
  );
}

const POLICY: Chapter[] = [
  { slug: "data", title: "Data we collect", paragraphs: ["Only what you type into the product and basic usage counts.", "No third-party trackers, ever."] },
  { slug: "use", title: "How we use it", paragraphs: ["To run the service, keep it secure and answer your support requests.", "Aggregated counts guide what we build next."] },
  { slug: "keep", title: "How long we keep it", paragraphs: ["Account data lives as long as the account. Logs roll off after thirty days.", "Deleting a workspace removes its data within a week."] },
  { slug: "rights", title: "Your rights", paragraphs: ["Export or delete everything from settings at any time.", "Write to the privacy team and a human answers within two days."] },
];

function CompactDemo() {
  const box = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={box}
      tabIndex={0}
      role="region"
      aria-label="Privacy policy"
      className="h-80 overflow-y-auto rounded-pui-xl border border-pui-border bg-pui-surface p-5 outline-none focus-visible:ring-2 focus-visible:ring-pui-ring"
    >
      <ReadingRail container={box} sections={sectionsFor("rr-policy", POLICY)} labels="none" railHeight={200} offset={48} stickyTop={4}>
        <Article prefix="rr-policy" chapters={POLICY} />
      </ReadingRail>
    </div>
  );
}

const MINI_SECTIONS = [
  { id: "rr-mini-a", label: "Intro" },
  { id: "rr-mini-b", label: "Setup" },
  { id: "rr-mini-c", label: "Deploy" },
];

function Mini() {
  const box = useRef<HTMLDivElement>(null);
  // Scroll the tiny article back and forth so the beam fills on its own.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let direction = 1;
    const id = window.setInterval(() => {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      if (el.scrollTop >= max) direction = -1;
      else if (el.scrollTop <= 0) direction = 1;
      el.scrollTop += direction;
    }, 30);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div ref={box} aria-hidden="true" className="pointer-events-none h-24 w-48 overflow-hidden rounded-pui-md border border-pui-border bg-pui-surface p-2">
      <ReadingRail container={box} sections={MINI_SECTIONS} labels="always" railHeight={64} width={78} offset={12} stickyTop={0} showTimeLeft={false} className="gap-2">
        {MINI_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-1 pb-3">
            <div id={section.id} className="h-2 w-12 rounded-pui-sm bg-pui-foreground/30" />
            <div className="h-1.5 rounded-pui-sm bg-pui-muted" />
            <div className="h-1.5 rounded-pui-sm bg-pui-muted" />
            <div className="h-1.5 w-2/3 rounded-pui-sm bg-pui-muted" />
          </div>
        ))}
      </ReadingRail>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `const sections = [\n  { id: "install", label: "Install" },\n  { id: "configure", label: "Configure" },\n  { id: "deploy", label: "Deploy" },\n];\n\n` +
    toJsx<Record<string, unknown>>(
      "ReadingRail",
      { ...props, sections: "{sections}" },
      { ...defaults },
      "<Article />",
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('sections="{sections}"', "sections={sections}"),
  propsTable: propDocs<ReadingRailProps>()([
    { name: "sections", type: "{ id: string; label: string }[]", description: "Sections in document order; ids match elements in the article.", required: true },
    { name: "children", type: "ReactNode", description: "The article.", required: true },
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll container; default the window." },
    { name: "side", type: '"left" | "right"', default: '"left"', description: "Where the rail sits." },
    { name: "labels", type: '"active" | "always" | "none"', default: '"active"', description: "Which labels show; active reveals the rest on hover or focus." },
    { name: "offset", type: "number", default: "96", description: "A section is active once its top passes this line (px)." },
    { name: "stickyTop", type: "number", default: "24", description: "Sticky distance from the top (px)." },
    { name: "railHeight", type: "number", default: "320", description: "Rail height (px). Nodes keep a minimum gap so labels never overlap." },
    { name: "width", type: "number", default: "176", description: "Rail column width (px)." },
    { name: "spring", type: "boolean", default: "true", description: "Smooth the beam with a spring." },
    { name: "showTimeLeft", type: "boolean", default: "true", description: "Show an estimate of reading time left." },
    { name: "wordsPerMinute", type: "number", default: "230", description: "Reading speed for the estimate." },
    { name: "formatTimeLeft", type: "(minutes: number) => string", description: "Formats the time-left line." },
    { name: "navLabel", type: "string", default: '"Reading progress"', description: "Accessible name of the nav." },
    { name: "onActiveChange", type: "(id: string) => void", description: "Fires when the active section changes." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the current section's node (one tab stop)" },
    { keys: "↑ / ↓", action: "Previous / next section node" },
    { keys: "Home / End", action: "First / last section node" },
    { keys: "Enter", action: "Jump to the section and focus its heading" },
  ],
  a11y: [
    "A nav landmark of real links; the current section has aria-current=\"location\".",
    "Jumping moves focus to the target heading, so screen readers continue from there.",
    "The beam and nodes are decorative; labels stay in the link text even when visually hidden.",
  ],
  reducedMotion: "The beam follows the scroll without a spring, jumps scroll instantly and the node pulse is off.",
  examples: [
    { title: "Changelog, rail on the right", description: "Every label visible, for short release lists.", Demo: ChangelogDemo },
    { title: "Compact policy page", description: "labels=\"none\": a slim beam with names on hover.", Demo: CompactDemo },
  ],
};

export default item;
