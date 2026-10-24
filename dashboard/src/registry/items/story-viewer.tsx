import { Badge, Button, StoryViewer, type Story, type StoryViewerProps } from "changelui";
import { useState, type ReactNode } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { duration: number; autoPlay: boolean; loop: boolean };

const defaults: DemoProps = { duration: 6, autoPlay: true, loop: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "duration", label: "Seconds per story", min: 2, max: 12, step: 1 },
  { type: "boolean", prop: "autoPlay", label: "Auto play" },
  { type: "boolean", prop: "loop", label: "Loop" },
];

function Slide({ tone, kicker, title, body, art, children }: { tone: string; kicker: string; title: string; body: string; art: ReactNode; children?: ReactNode }) {
  return (
    <div className={`flex h-full flex-col justify-end gap-3 p-5 pt-14 ${tone}`}>
      <div className="flex flex-1 items-center justify-center">{art}</div>
      <Badge variant="soft" tone="primary" size="sm" className="self-start">
        {kicker}
      </Badge>
      <h3 className="m-0 text-xl leading-tight font-semibold text-balance text-pui-foreground">{title}</h3>
      <p className="m-0 text-sm leading-relaxed text-pui-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

const glyph = (d: string) => (
  <div className="flex size-24 items-center justify-center rounded-pui-xl bg-pui-surface shadow-pui-lg ring-1 ring-pui-border">
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-11 text-pui-primary-text">
      <path d={d} />
    </svg>
  </div>
);

const RELEASE: Story[] = [
  {
    id: "dark",
    label: "Dark mode everywhere",
    content: (
      <Slide tone="bg-gradient-to-b from-pui-primary/15 to-pui-surface" kicker="New · 3.2" title="Dark mode everywhere" body="Every screen, chart and email now follows your system theme." art={glyph("M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z")} />
    ),
  },
  {
    id: "search",
    label: "Search as you type",
    content: (
      <Slide tone="bg-gradient-to-b from-pui-info/15 to-pui-surface" kicker="Faster" title="Search as you type" body="Results appear in under 100 ms and filters remember your last choice." art={glyph("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4")} />
    ),
  },
  {
    id: "share",
    label: "Share a live view",
    content: (
      <Slide tone="bg-gradient-to-b from-pui-success/15 to-pui-surface" kicker="Collaboration" title="Share a live view" body="Send a link that stays in sync. Viewers never need an account." art={glyph("M8 12h8M12 8l4 4-4 4M4 5v14")}>
        <Button size="sm" className="mt-1 self-start">
          Try sharing
        </Button>
      </Slide>
    ),
  },
];

function Preview({ props }: { props: DemoProps }) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <StoryViewer {...props} label="What's new in 3.2" stories={RELEASE} index={index} onIndexChange={setIndex} onComplete={() => setDone(true)} className="w-72" />
      <div className="flex h-8 items-center gap-2 text-xs text-pui-muted-foreground">
        <span aria-live="polite">{done ? "All caught up." : `Story ${index + 1} of ${RELEASE.length}. Tap right for next, hold to pause.`}</span>
        {done ? (
          <Button
            size="sm"
            variant="outline"
            tone="neutral"
            onClick={() => {
              setDone(false);
              setIndex(0);
            }}
          >
            Replay
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const ONBOARDING: Story[] = [
  { id: "1", label: "Create a project", duration: 4, content: <Slide tone="bg-pui-surface" kicker="Step 1" title="Create a project" body="Name it and pick a region close to your users." art={glyph("M12 5v14M5 12h14")} /> },
  { id: "2", label: "Invite your team", duration: 4, content: <Slide tone="bg-pui-surface" kicker="Step 2" title="Invite your team" body="Teammates join with one link. Roles can change later." art={glyph("M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z")} /> },
  { id: "3", label: "Ship it", duration: 4, content: <Slide tone="bg-pui-surface" kicker="Step 3" title="Ship it" body="Every push gets a preview link and a one-click rollback." art={glyph("M5 19l14-7L5 5v5l8 2-8 2z")} /> },
];

function OnboardingDemo() {
  return (
    <div className="flex justify-center">
      <StoryViewer stories={ONBOARDING} loop label="Getting started" className="w-60" />
    </div>
  );
}

function ManualDemo() {
  return (
    <div className="flex justify-center">
      <StoryViewer stories={RELEASE} autoPlay={false} label="Release highlights" className="w-60" />
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-40">
      <StoryViewer stories={RELEASE} autoPlay={false} className="text-[0.6rem]" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("StoryViewer", props, defaults, undefined, controls).replace("<StoryViewer", '<StoryViewer label="What\'s new" stories={stories} onComplete={markSeen}'),
  propsTable: propDocs<StoryViewerProps>()([
    { name: "stories", type: "Story[]", required: true, description: "{ id, label, content, duration? }; label is announced when a story opens." },
    { name: "index", type: "number", description: "Controlled story index." },
    { name: "defaultIndex", type: "number", default: "0", description: "Uncontrolled start index." },
    { name: "onIndexChange", type: "(index) => void", description: "Fires on taps, keys, segment clicks and the timer." },
    { name: "onComplete", type: "() => void", description: "Fires when the last story runs out on its own, e.g. to mark the release as seen." },
    { name: "duration", type: "number", default: "6", description: "Seconds per story; a story's own duration wins." },
    { name: "autoPlay", type: "boolean", default: "true", description: "Advance on a timer; off for manual decks." },
    { name: "loop", type: "boolean", default: "false", description: "Start over after the last story." },
    { name: "label", type: "string", default: '"Stories"', description: "Accessible name of the viewer." },
  ]),
  keyboard: [
    { keys: "← / →", action: "Previous / next story" },
    { keys: "Home / End", action: "First / last story" },
    { keys: "Tab", action: "Reach each progress segment, the pause button and links inside a story" },
  ],
  a11y: [
    "A labelled region; each progress segment is a button named “Story 2 of 3: …” with aria-current.",
    "A pause button meets WCAG 2.2.2; the timer also stops on hover, keyboard focus and in background tabs.",
    "Story changes are announced in a polite live region; buttons and links inside a story keep working.",
  ],
  reducedMotion: "Stories cross-fade in place instead of sliding; the timer and progress bars still work.",
  examples: [
    { title: "Onboarding loop", description: "Shorter per-story durations and loop.", Demo: OnboardingDemo },
    { title: "Manual deck", description: "autoPlay={false}: tap or use the arrow keys.", Demo: ManualDemo },
  ],
};

export default item;
