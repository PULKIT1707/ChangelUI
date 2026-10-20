import { ReactionButton, type ReactionButtonProps, type ReactionOption } from "changelui";
import { useEffect, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  tone: NonNullable<ReactionButtonProps["tone"]>;
  size: NonNullable<ReactionButtonProps["size"]>;
  count: number;
  burst: boolean;
  withReactions: boolean;
  label: string;
};

const defaults: DemoProps = { tone: "danger", size: "md", count: 128, burst: true, withReactions: true, label: "Like" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "number", prop: "count", label: "Count", min: 0, max: 500, step: 1 },
  { type: "boolean", prop: "burst", label: "Burst" },
  { type: "boolean", prop: "withReactions", label: "Reaction tray" },
  { type: "text", prop: "label", label: "Label", maxLength: 24 },
];

const REACTIONS: ReactionOption[] = [
  { value: "like", emoji: "👍", label: "Like" },
  { value: "love", emoji: "❤️", label: "Love" },
  { value: "haha", emoji: "😂", label: "Haha" },
  { value: "wow", emoji: "😮", label: "Wow" },
  { value: "fire", emoji: "🔥", label: "Fire" },
  { value: "party", emoji: "🎉", label: "Celebrate" },
];

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M6.5 3.5h11v17L12 16.5l-5.5 4z" strokeLinejoin="round" />
    </svg>
  );
}

function Post({ props }: { props: DemoProps }) {
  const { withReactions, ...rest } = props;
  return (
    <article className="w-full max-w-sm rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground shadow-pui-sm">
      <header className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-pui-primary/15 text-sm font-semibold text-pui-primary-text">
          MK
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Mira Kade</span>
          <span className="text-xs text-pui-muted-foreground">2h · Design systems</span>
        </div>
      </header>
      <p className="mt-3 text-sm leading-relaxed">
        Shipped spring tokens across the whole kit today. Every press, toggle and sheet now shares one motion vocabulary.
      </p>
      <div className="mt-3 h-28 rounded-pui-lg bg-[radial-gradient(120%_120%_at_0%_0%,var(--pui-gradient-1),transparent_60%),radial-gradient(120%_120%_at_100%_100%,var(--pui-gradient-3),transparent_55%)] opacity-80" />
      <footer className="mt-3 flex items-center gap-2">
        <ReactionButton {...rest} reactions={withReactions ? REACTIONS : undefined} />
        <ReactionButton size={props.size} tone="primary" label="Save" icon={<BookmarkIcon />} burst={props.burst} />
        <span className="ms-auto text-xs text-pui-muted-foreground">
          {withReactions ? "Long press, right-click or ↑ for reactions" : "Tap to like"}
        </span>
      </footer>
    </article>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-8">
      <Post props={props} />
      <div className="flex w-full flex-col items-center gap-3">
        <span className="text-xs font-medium tracking-wide text-pui-muted-foreground uppercase">Variations</span>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ReactionButton count={42} size="sm" />
          <ReactionButton count={1999} tone="warning" label="Star" icon={<StarIcon />} defaultPressed />
          <ReactionButton count={7} tone="primary" size="lg" reactions={REACTIONS} defaultValue="party" defaultPressed />
          <ReactionButton label="Favorite" />
        </div>
      </div>
    </div>
  );
}

function Mini() {
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setPressed((p) => !p), 1800);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <ReactionButton count={2047} size="lg" pressed={pressed} burst={false} />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ withReactions, ...props }) => {
    const jsx = toJsx<Record<string, unknown>>(
      "ReactionButton",
      { ...props, reactions: withReactions ? "{reactions}" : undefined },
      { tone: "danger", size: "md", burst: true, label: "Like" },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('reactions="{reactions}"', "reactions={reactions}");
    if (!withReactions) return jsx;
    return [
      "const reactions = [",
      '  { value: "like", emoji: "👍", label: "Like" },',
      '  { value: "love", emoji: "❤️", label: "Love" },',
      '  { value: "haha", emoji: "😂", label: "Haha" },',
      "];",
      "",
      jsx,
    ].join("\n");
  },
  propsTable: propDocs<ReactionButtonProps>()([
    { name: "pressed", type: "boolean", description: "Controlled pressed state." },
    { name: "defaultPressed", type: "boolean", default: "false", description: "Uncontrolled initial pressed state." },
    { name: "onPressedChange", type: "(pressed: boolean) => void", description: "Called when the viewer toggles." },
    { name: "count", type: "number", description: "Reactions from everyone else; the viewer's own adds one. Rolls like an odometer." },
    { name: "reactions", type: "{ value; emoji; label }[]", description: "Enables the tray: long press, right-click or ArrowUp." },
    { name: "value", type: "string | null", description: "Controlled chosen reaction." },
    { name: "defaultValue", type: "string | null", default: "null", description: "Uncontrolled initial reaction." },
    { name: "onValueChange", type: "(value: string | null) => void", description: "Called when a reaction is picked." },
    { name: "icon", type: "ReactNode", description: "Replaces the heart." },
    { name: "label", type: "string", default: '"Like"', description: "Button name for screen readers." },
    { name: "burst", type: "boolean", default: "true", description: "Particle burst and ring on press." },
    { name: "tone", type: "Tone", default: '"danger"', description: "Color when pressed and of the burst." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Height 32 / 36 / 44 px." },
    { name: "longPressMs", type: "number", default: "450", description: "Hold time before the tray opens." },
    { name: "trayLabel", type: "string", default: '"Reactions"', description: "Name of the tray menu." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Toggle" },
    { keys: "ArrowUp", action: "Open the reaction tray" },
    { keys: "ArrowLeft / ArrowRight", action: "Move between reactions" },
    { keys: "Escape", action: "Close the tray and return focus" },
  ],
  a11y: [
    "A toggle button with aria-pressed; its name includes the label, chosen reaction and the count.",
    "The tray is a horizontal menu of menuitemradio buttons, each with its own label.",
  ],
  reducedMotion: "Icons and the tray fade; no burst, ring, pop or magnify.",
};

export default item;
