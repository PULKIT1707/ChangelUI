import { Badge, ShareButton, type ShareButtonProps, type ShareTarget, type ShareTargetId } from "changelui";
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  variant: NonNullable<ShareButtonProps["variant"]>;
  size: NonNullable<ShareButtonProps["size"]>;
  tone: NonNullable<ShareButtonProps["tone"]>;
  targets: "social" | "work" | "chat";
  preferNative: "coarse" | "always" | "never";
  label: string;
  closeOnShare: boolean;
};
const defaults: DemoProps = {
  variant: "outline",
  size: "md",
  tone: "neutral",
  targets: "social",
  preferNative: "never",
  label: "Share",
  closeOnShare: true,
};
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "variant", label: "Variant", options: ["outline", "soft", "solid"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "info", "success"] },
  { type: "select", prop: "targets", label: "Targets", options: ["social", "work", "chat"] },
  { type: "select", prop: "preferNative", label: "System share sheet", options: ["coarse", "always", "never"] },
  { type: "text", prop: "label", label: "Label", maxLength: 20 },
  { type: "boolean", prop: "closeOnShare", label: "Close after sharing" },
];
const TARGET_SETS: Record<DemoProps["targets"], ShareTargetId[]> = {
  social: ["x", "linkedin", "facebook", "reddit", "copy"],
  work: ["linkedin", "email", "copy"],
  chat: ["whatsapp", "x", "email", "copy"],
};
const nativeOf = (v: DemoProps["preferNative"]): ShareButtonProps["preferNative"] => (v === "always" ? true : v === "never" ? false : "coarse");
const LABELS: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  reddit: "Reddit",
  whatsapp: "WhatsApp",
  email: "email",
  copy: "the clipboard",
  native: "the system share sheet",
  embed: "an embed snippet",
};
/** The demos never leave the dashboard: links are logged instead of opened. */
const stay = (event: ReactMouseEvent) => {
  if ((event.target as Element).closest("a")) event.preventDefault();
};
function useLog() {
  const [log, setLog] = useState<string[]>([]);
  const push = (target: string) => setLog((l) => [`Shared to ${LABELS[target] ?? target}`, ...l].slice(0, 2));
  return [log, push] as const;
}
function Preview({ props }: { props: DemoProps }) {
  const { targets, preferNative, label, ...rest } = props;
  const [log, push] = useLog();
  return (
    <div className="flex w-full max-w-lg flex-col gap-4" onClickCapture={stay}>
      <article className="overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-md">
        <div className="relative h-36 bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_oklab,var(--pui-primary)_45%,transparent),transparent_60%),radial-gradient(90%_90%_at_100%_100%,color-mix(in_oklab,var(--pui-info)_40%,transparent),transparent_60%)]">
          <Badge tone="primary" variant="solid" className="absolute top-4 left-4">
            Changelog
          </Badge>
        </div>
        <div className="flex flex-col gap-2 p-5">
          <p className="m-0 text-xs text-pui-muted-foreground">Oct 21, 2026 · 4 min read</p>
          <h3 className="m-0 text-lg font-semibold">Offline mode is here</h3>
          <p className="m-0 text-sm text-pui-muted-foreground">Drafts, comments and uploads now queue while you are offline and sync the moment you reconnect.</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-pui-border px-5 py-3">
          <span className="text-xs text-pui-muted-foreground">Found it useful? Pass it on.</span>
          <ShareButton
            {...rest}
            label={label}
            url="https://example.com/blog/offline-mode"
            title="Offline mode is here"
            text="Drafts, comments and uploads now sync when you reconnect."
            targets={TARGET_SETS[targets]}
            preferNative={nativeOf(preferNative)}
            onShare={push}
          />
        </div>
      </article>
      <ul className="m-0 h-10 list-none space-y-1 p-0 text-center text-xs text-pui-muted-foreground" aria-label="Share log">
        {log.length === 0 ? <li>onShare reports the target to your app. The component itself sends nothing.</li> : log.map((l, i) => <li key={`${l}-${i}`}>{l}</li>)}
      </ul>
    </div>
  );
}
function CodeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="block size-4">
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
    </svg>
  );
}
function CustomTargetDemo() {
  const [log, push] = useLog();
  const embed: ShareTarget = {
    id: "embed",
    label: "Copy embed code",
    icon: <CodeGlyph />,
    onSelect: (c) => void navigator.clipboard?.writeText(`<iframe src="${c.url}/embed" width="560" height="315"></iframe>`).catch(() => {}),
  };
  return (
    <div className="flex w-full flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-sm text-pui-surface-foreground" onClickCapture={stay}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="m-0 font-medium">Q3 revenue dashboard</p>
          <p className="m-0 text-xs text-pui-muted-foreground">Shared with 12 people</p>
        </div>
        <ShareButton size="sm" variant="soft" tone="primary" url="https://example.com/d/q3-revenue" title="Q3 revenue" targets={["email", embed, "copy"]} preferNative={false} onShare={push} />
      </div>
      <p className="m-0 h-4 text-xs text-pui-muted-foreground" role="status">
        {log[0] ?? "A custom target copies an embed snippet."}
      </p>
    </div>
  );
}
function HeroDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-pui-xl bg-pui-foreground px-6 py-8 text-center text-pui-background" onClickCapture={stay}>
      <p className="m-0 text-xl font-semibold tracking-tight">Join 4,200 teams on the waitlist</p>
      <p className="m-0 max-w-sm text-sm opacity-75">Invite a friend and you both skip the line.</p>
      <ShareButton size="lg" variant="solid" tone="primary" label="Invite a friend" url="https://example.com/invite/ada" title="Skip the line with me" targets={["whatsapp", "x", "email", "copy"]} preferNative={false} />
    </div>
  );
}
function SizesDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3" onClickCapture={stay}>
      <ShareButton size="sm" url="https://example.com/a" preferNative={false} targets={["x", "copy"]} />
      <ShareButton size="md" variant="soft" url="https://example.com/b" preferNative={false} targets={["linkedin", "email", "copy"]} />
      <ShareButton size="lg" variant="outline" tone="primary" defaultOpen url="https://example.com/c" preferNative={false} closeOnShare={false} />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" inert className="pointer-events-none flex flex-col items-center gap-3">
      <ShareButton size="sm" url="https://example.com" />
      <ShareButton size="sm" variant="soft" tone="primary" defaultOpen url="https://example.com" targets={["x", "linkedin", "copy"]} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const list = TARGET_SETS[props.targets].map((t) => `"${t}"`).join(", ");
    const native = props.preferNative === "coarse" ? "" : ` preferNative={${props.preferNative === "always"}}`;
    const strip = { targets: undefined, preferNative: undefined };
    return toJsx<Record<string, unknown>>(
      "ShareButton",
      { ...props, ...strip },
      { ...defaults, ...strip },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace("<ShareButton", `<ShareButton url={post.url} title={post.title} targets={[${list}]}${native} onShare={(target) => log(target)}`);
  },
  propsTable: propDocs<ShareButtonProps>()([
    { name: "url", type: "string", description: "What to share. Default: the current page URL at the moment of sharing." },
    { name: "title", type: "string", description: "Subject or headline used by email, Reddit and the system sheet." },
    { name: "text", type: "string", description: "Short message used by X, WhatsApp, email and the system sheet." },
    { name: "targets", type: "(ShareTargetId | ShareTarget)[]", default: '["x", "linkedin", "whatsapp", "email", "copy"]', description: "Built-in ids or custom { id, label, icon, href?, onSelect? }." },
    { name: "preferNative", type: 'boolean | "coarse"', default: '"coarse"', description: "Use navigator.share: when available, only on touch-first devices, or never." },
    { name: "label", type: "ReactNode", default: '"Share"', description: "Trigger label." },
    { name: "triggerLabel", type: "string", description: "Accessible name when the label is not a string." },
    { name: "menuLabel", type: "string", default: '"Share to"', description: "Name of the target list." },
    { name: "copiedLabel", type: "string", default: '"Link copied"', description: "Shown and announced after a copy." },
    { name: "closeOnShare", type: "boolean", default: "true", description: "Fold back after a target is used (after a beat for copy)." },
    { name: "open", type: "boolean", description: "Controlled open state; pair with onOpenChange." },
    { name: "defaultOpen", type: "boolean", default: "false", description: "Starting state when uncontrolled." },
    { name: "onOpenChange", type: "(open) => void", description: "Called when the menu opens or closes." },
    { name: "onShare", type: "(target, content) => void", description: 'Target id ("native" for the system sheet). Nothing is sent anywhere by the component.' },
    { name: "variant", type: '"outline" | "soft" | "solid"', default: '"outline"', description: "Surface style." },
    { name: "tone", type: "Tone", default: '"neutral"', description: "Color for soft and solid." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Height and icon size." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Open (focus moves to the first target) or close" },
    { keys: "← / →", action: "Move between the trigger and targets" },
    { keys: "Home / End", action: "First / last" },
    { keys: "Escape", action: "Close and return focus to the trigger" },
  ],
  a11y: [
    "The trigger is a button with aria-expanded and aria-controls pointing at a labelled list of targets.",
    "Network targets are real links (new tab, noopener); copy is a button whose name changes to the copied label.",
    "Copy results are announced in a polite status region; hover labels are decorative and mirror each accessible name.",
  ],
  reducedMotion: "The menu appears and the icons swap without the sideways grow, stagger or rotation.",
  examples: [
    { title: "Custom target", description: "Mix built-ins with your own action, here an embed snippet.", Demo: CustomTargetDemo },
    { title: "Referral hero", description: "Solid primary on a contrasting band with chat-first targets.", Demo: HeroDemo },
    { title: "Sizes", description: "sm, md and lg; the large one starts open.", Demo: SizesDemo, wide: true },
  ],
};
export default item;
