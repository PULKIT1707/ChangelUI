import { CardStack, type CardStackActions, type CardStackDirection, type CardStackProps } from "changelui";
import { useRef, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  visible: number;
  swipeThreshold: number;
  loop: boolean;
  showControls: boolean;
  stamps: boolean;
};

const defaults: DemoProps = { visible: 3, swipeThreshold: 100, loop: false, showControls: true, stamps: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "visible", label: "Visible cards", min: 1, max: 5, step: 1 },
  { type: "number", prop: "swipeThreshold", label: "Swipe threshold (px)", min: 40, max: 200, step: 10 },
  { type: "boolean", prop: "loop", label: "Loop" },
  { type: "boolean", prop: "showControls", label: "Show buttons" },
  { type: "boolean", prop: "stamps", label: "Stamps" },
];

interface Place {
  id: string;
  name: string;
  region: string;
  tags: string[];
  hue: 1 | 2 | 3;
}

const places: Place[] = [
  { id: "kyoto", name: "Kyoto", region: "Japan", tags: ["Temples", "Tea", "Autumn"], hue: 1 },
  { id: "lofoten", name: "Lofoten", region: "Norway", tags: ["Fjords", "Aurora", "Hiking"], hue: 2 },
  { id: "oaxaca", name: "Oaxaca", region: "Mexico", tags: ["Food", "Markets", "Mezcal"], hue: 3 },
  { id: "porto", name: "Porto", region: "Portugal", tags: ["Tiles", "River", "Wine"], hue: 1 },
  { id: "hoi-an", name: "Hội An", region: "Vietnam", tags: ["Lanterns", "Tailors", "Beach"], hue: 2 },
  { id: "cusco", name: "Cusco", region: "Peru", tags: ["Andes", "Ruins", "Textiles"], hue: 3 },
];

const gradients: Record<Place["hue"], string> = {
  1: "from-pui-gradient-1 to-pui-gradient-2",
  2: "from-pui-chart-2 to-pui-gradient-1",
  3: "from-pui-gradient-3 to-pui-chart-3",
};

function PlaceCard({ place }: { place: Place }) {
  return (
    <div className="flex h-80 w-full flex-col">
      <div className={`relative flex-1 bg-linear-to-br ${gradients[place.hue]}`}>
        <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-1/2 w-full" aria-hidden="true">
          <path d="M0 70 L35 40 L60 58 L95 25 L130 55 L160 38 L200 60 L200 100 L0 100 Z" fill="var(--pui-surface)" opacity="0.35" />
          <path d="M0 85 L45 62 L85 80 L125 58 L165 76 L200 70 L200 100 L0 100 Z" fill="var(--pui-surface)" opacity="0.7" />
        </svg>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-semibold">{place.name}</span>
          <span className="text-xs text-pui-muted-foreground">{place.region}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {place.tags.map((tag) => (
            <span key={tag} className="rounded-pui-full bg-pui-muted px-2 py-0.5 text-[11px] font-medium text-pui-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const [log, setLog] = useState<{ name: string; dir: CardStackDirection }[]>([]);
  return (
    <div className="flex w-full flex-col items-center gap-4 py-2">
      <CardStack
        key={`${props.loop}`}
        {...props}
        items={places}
        getKey={(p) => p.id}
        getCardLabel={(p) => `${p.name}, ${p.region}`}
        renderCard={(p) => <PlaceCard place={p} />}
        onSwipe={(p, dir) => setLog((l) => [{ name: p.name, dir }, ...l].slice(0, 4))}
        onUndo={() => setLog((l) => l.slice(1))}
        className="w-full max-w-72"
      />
      <p className="m-0 min-h-4 text-xs text-pui-muted-foreground">
        {log.length === 0
          ? "Drag a card, use the arrow keys, or the buttons."
          : log.map((entry) => `${entry.dir === "right" ? "♥" : "✕"} ${entry.name}`).join("  ·  ")}
      </p>
    </div>
  );
}

const quotes = [
  { quote: "We shipped the redesign in a week. The motion feels expensive.", name: "Maya Chen", role: "Design lead" },
  { quote: "Finally a component library that respects reduced motion.", name: "Jon Park", role: "Accessibility engineer" },
  { quote: "Our onboarding completion went up after we switched to swipe cards.", name: "Priya Rao", role: "Product manager" },
  { quote: "Tokens everywhere. Our theme just worked.", name: "Leo Duarte", role: "Frontend engineer" },
];

function TestimonialsDemo() {
  const actions = useRef<CardStackActions>(null);
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <CardStack
        actionsRef={actions}
        items={quotes}
        loop
        stamps={false}
        showControls={false}
        visible={3}
        getKey={(q) => q.name}
        getCardLabel={(q) => `Testimonial from ${q.name}`}
        renderCard={(q) => (
          <figure className="m-0 flex h-44 flex-col justify-between p-5">
            <blockquote className="m-0 text-sm leading-relaxed text-pui-surface-foreground">“{q.quote}”</blockquote>
            <figcaption className="text-xs">
              <span className="font-semibold">{q.name}</span>
              <span className="text-pui-muted-foreground"> · {q.role}</span>
            </figcaption>
          </figure>
        )}
        className="w-full max-w-80"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => actions.current?.swipe("left")}
          className="rounded-pui-md border border-pui-border bg-pui-surface px-3 py-1.5 text-xs font-medium text-pui-surface-foreground hover:bg-pui-muted"
        >
          Next quote
        </button>
        <button
          type="button"
          onClick={() => actions.current?.undo()}
          className="rounded-pui-md border border-pui-border bg-pui-surface px-3 py-1.5 text-xs font-medium text-pui-surface-foreground hover:bg-pui-muted"
        >
          Previous
        </button>
      </div>
    </div>
  );
}

const steps = [
  { title: "Pick a theme", body: "Ten presets, light and dark, or build your own.", emoji: "🎨" },
  { title: "Add components", body: "Import only what you use; every item is its own entry.", emoji: "🧩" },
  { title: "Ship it", body: "SSR-safe, accessible and reduced-motion aware.", emoji: "🚀" },
];

function OnboardingDemo() {
  return (
    <CardStack
      items={steps}
      visible={2}
      swipeThreshold={70}
      stamps={false}
      likeLabel="Got it"
      skipLabel="Skip"
      getCardLabel={(s) => s.title}
      emptyState={
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-pui-xl bg-pui-success/12 text-center">
          <span className="text-2xl" aria-hidden="true">
            ✓
          </span>
          <span className="text-sm font-semibold text-pui-success-text">You're all set</span>
        </div>
      }
      renderCard={(s) => (
        <div className="flex h-40 flex-col items-center justify-center gap-2 p-5 text-center">
          <span className="text-3xl" aria-hidden="true">
            {s.emoji}
          </span>
          <span className="text-sm font-semibold">{s.title}</span>
          <span className="text-xs text-pui-muted-foreground">{s.body}</span>
        </div>
      )}
      className="w-full max-w-64"
    />
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="relative h-28 w-24">
      {places.slice(0, 3).map((p, i) => (
        <div
          key={p.id}
          className={`absolute inset-0 overflow-hidden rounded-pui-lg border border-pui-border bg-linear-to-br shadow-pui-md ${gradients[p.hue]}`}
          style={{ transform: `translateY(${(2 - i) * 7}px) scale(${0.95 ** (2 - i)}) rotate(${i === 2 ? -6 : 0}deg)`, zIndex: i }}
        />
      ))}
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "CardStack",
      { items: "{places}", renderCard: "{(place) => <PlaceCard place={place} />}", onSwipe: "{(place, dir) => save(place, dir)}", ...props },
      defaults,
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace(/="(\{[^"]*\})"/g, "=$1"),
  propsTable: propDocs<CardStackProps<unknown>>()([
    { name: "items", type: "readonly T[]", description: "The cards, top first.", required: true },
    { name: "renderCard", type: "(item: T, info: { depth, isTop }) => ReactNode", description: "Card content; the shell is provided.", required: true },
    { name: "getKey", type: "(item: T, index: number) => Key", description: "Stable key per item." },
    { name: "getCardLabel", type: "(item: T) => string", description: "Accessible name, read when a card reaches the top." },
    { name: "onSwipe", type: '(item: T, direction: "left" | "right", index: number) => void', description: "After a card leaves." },
    { name: "onUndo", type: "(item: T, index: number) => void", description: "After undo restores a card." },
    { name: "visible", type: "number", default: "3", description: "Cards shown, including the top one." },
    { name: "swipeThreshold", type: "number", default: "100", description: "px of drag that commits a swipe (or a 500 px/s fling)." },
    { name: "loop", type: "boolean", default: "false", description: "Start over after the last card." },
    { name: "showControls", type: "boolean", default: "true", description: "Visible Skip / Undo / Like; sr-only when false." },
    { name: "stamps", type: "boolean", default: "true", description: "LIKE / NOPE stamps while dragging." },
    { name: "emptyState", type: "ReactNode", description: "Shown when every card is gone." },
    { name: "actionsRef", type: "Ref<{ swipe(dir), undo() }>", description: "Imperative controls." },
    { name: "cardClassName", type: "string", description: "Class for each card shell." },
    { name: "likeLabel", type: "string", default: '"Like"', description: "Right-swipe button, stamp and announcement text." },
    { name: "skipLabel", type: "string", default: '"Skip"', description: "Left-swipe button, stamp and announcement text." },
    { name: "undoLabel", type: "string", default: '"Undo"', description: "Undo button text." },
    { name: "label", type: "string", default: '"Card stack"', description: "Accessible name of the region." },
  ]),
  keyboard: [
    { keys: "ArrowRight", action: "Like (swipe right)" },
    { keys: "ArrowLeft", action: "Skip (swipe left)" },
    { keys: "Backspace / Cmd+Z", action: "Undo" },
  ],
  a11y: [
    "A labelled region; the focusable deck names the top card and how to swipe it.",
    "Skip, Undo and Like are real buttons, always rendered (sr-only when hidden).",
    "Cards behind the top one are aria-hidden; each swipe and undo is announced politely.",
  ],
  reducedMotion: "No rotation or fling; swiped cards fade out and the stack swaps with a short fade.",
  examples: [
    { title: "Testimonials, looping", description: "Buttons outside the stack drive actionsRef.", Demo: TestimonialsDemo },
    { title: "Onboarding with an empty state", description: "Two visible cards and a custom finish.", Demo: OnboardingDemo },
  ],
};

export default item;
