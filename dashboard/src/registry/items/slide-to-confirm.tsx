import { RollingNumber, SlideToConfirm, type SlideToConfirmProps } from "changelui";
import { useEffect, useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  tone: NonNullable<SlideToConfirmProps["tone"]>;
  size: NonNullable<SlideToConfirmProps["size"]>;
  threshold: number;
  resetAfterMs: number;
  label: string;
  confirmedLabel: string;
  disabled: boolean;
};

const defaults: DemoProps = {
  tone: "primary",
  size: "md",
  threshold: 0.9,
  resetAfterMs: 2000,
  label: "Slide to confirm",
  confirmedLabel: "Confirmed",
  disabled: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
  { type: "select", prop: "size", label: "Size", options: ["md", "lg"] },
  { type: "number", prop: "threshold", label: "Threshold", min: 0.5, max: 1, step: 0.05 },
  { type: "number", prop: "resetAfterMs", label: "Reset after (ms)", min: 0, max: 6000, step: 250 },
  { type: "text", prop: "label", label: "Label", maxLength: 32 },
  { type: "text", prop: "confirmedLabel", label: "Confirmed label", maxLength: 32 },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const LOCK = "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z";
const CARD = "M3 6h18v12H3zM3 10h18M7 15h3";
const SEND = "M4 12h14M13 6l6 6-6 6";

function Preview({ props }: { props: DemoProps }) {
  const [count, setCount] = useState(0);
  const { label, ...rest } = props;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <SlideToConfirm {...rest} onConfirm={() => setCount((n) => n + 1)}>
        {label}
      </SlideToConfirm>
      <span className="flex items-center gap-1.5 text-xs text-pui-muted-foreground">
        Confirmed <RollingNumber value={count} className="font-semibold text-pui-foreground" /> times · drag, or focus the
        thumb and press Enter
      </span>
    </div>
  );
}

function Checkout() {
  const [paid, setPaid] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="m-0 text-sm font-semibold">Order summary</p>
          <p className="m-0 mt-0.5 text-xs text-pui-muted-foreground">2 items · ships tomorrow</p>
        </div>
        <span className="rounded-full bg-pui-muted px-2 py-0.5 text-xs text-pui-muted-foreground">Visa ••42</span>
      </div>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
        <dt className="text-pui-muted-foreground">Ceramic pour-over</dt>
        <dd className="m-0 tabular-nums">$34.00</dd>
        <dt className="text-pui-muted-foreground">Filters × 100</dt>
        <dd className="m-0 tabular-nums">$9.00</dd>
        <dt className="text-pui-muted-foreground">Shipping</dt>
        <dd className="m-0 tabular-nums">$5.00</dd>
        <dt className="border-t border-pui-border pt-2 font-semibold">Total</dt>
        <dd className="m-0 border-t border-pui-border pt-2 font-semibold tabular-nums">$48.00</dd>
      </dl>
      <SlideToConfirm
        tone="success"
        size="lg"
        icon={<Glyph d={CARD} />}
        confirmedLabel="Paid · receipt sent"
        resetAfterMs={0}
        thumbLabel="Slide to pay $48.00"
        onConfirm={() => setPaid(true)}
        className="max-w-none"
      >
        Slide to pay $48.00
      </SlideToConfirm>
      {paid ? (
        <button
          type="button"
          onClick={() => setPaid(false)}
          className="cursor-pointer self-center border-0 bg-transparent text-xs text-pui-muted-foreground underline underline-offset-2"
        >
          Reset demo
        </button>
      ) : null}
    </div>
  );
}

function LockScreen() {
  const [time, setTime] = useState("9:41");
  useEffect(() => {
    const format = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
    setTime(format());
    const id = setInterval(() => setTime(format()), 15000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="dark mx-auto flex h-80 w-full max-w-[17rem] flex-col items-center justify-between overflow-hidden rounded-[2rem] border border-pui-border bg-[radial-gradient(120%_80%_at_50%_0%,var(--pui-primary),var(--pui-background)_70%)] px-5 pt-10 pb-6 text-pui-foreground shadow-pui-xl">
      <div className="text-center">
        <p className="m-0 text-xs font-medium opacity-80">Friday, October 17</p>
        <p className="m-0 text-6xl font-semibold tracking-tight tabular-nums">{time}</p>
      </div>
      <SlideToConfirm tone="neutral" icon={<Glyph d={LOCK} />} confirmedLabel="Unlocked" resetAfterMs={1600} onConfirm={() => {}}>
        slide to unlock
      </SlideToConfirm>
    </div>
  );
}

function Transfer() {
  const [log, setLog] = useState<string[]>([]);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <p className="m-0 text-sm font-semibold">Wire $12,400 to Northwind Ltd.</p>
      <p className="m-0 text-xs text-pui-muted-foreground">Transfers over $10k can't be cancelled once sent. The threshold is set to the full track.</p>
      <SlideToConfirm
        tone="danger"
        threshold={1}
        icon={<Glyph d={SEND} />}
        confirmedLabel="Transfer sent"
        onConfirm={() => setLog((l) => [`Sent at ${new Date().toLocaleTimeString()}`, ...l].slice(0, 3))}
        className="max-w-none"
      >
        Slide all the way to send
      </SlideToConfirm>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs text-pui-muted-foreground" aria-label="Transfer log">
        {log.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-56">
      <SlideToConfirm onConfirm={() => {}} tabIndex={-1}>
        Slide to confirm
      </SlideToConfirm>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ label, ...props }) =>
    toJsx<Record<string, unknown>>(
      "SlideToConfirm",
      { ...props, onConfirm: "{placeOrder}" },
      { tone: "primary", size: "md", threshold: 0.9, resetAfterMs: 2000, confirmedLabel: "Confirmed", disabled: false },
      label,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace('onConfirm="{placeOrder}"', "onConfirm={placeOrder}"),
  propsTable: propDocs<SlideToConfirmProps>()([
    { name: "onConfirm", type: "() => void", description: "Called once the thumb reaches the end.", required: true },
    { name: "children", type: "ReactNode", default: '"Slide to confirm"', description: "Track label while idle (shimmers)." },
    { name: "confirmedLabel", type: "ReactNode", default: '"Confirmed"', description: "Track label after confirming." },
    { name: "threshold", type: "number", default: "0.9", description: "Fraction of the track that confirms on release." },
    { name: "resetAfterMs", type: "number", default: "2000", description: "Slide back after confirming; 0 stays confirmed." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Thumb and fill color." },
    { name: "size", type: '"md" | "lg"', default: '"md"', description: "Track height 48 / 56 px." },
    { name: "icon", type: "ReactNode", description: "Thumb icon while idle. Default a chevron." },
    { name: "thumbLabel", type: "string", default: '"Slide to confirm"', description: "Accessible name of the slider thumb." },
    { name: "hintLabel", type: "string", description: "aria-describedby hint about drag, arrows and Enter." },
    { name: "confirmedAnnouncement", type: "string", default: '"Confirmed"', description: "Polite status after confirming." },
    { name: "onStateChange", type: '(state: "idle" | "dragging" | "confirmed") => void', description: "Every state change." },
    { name: "disabled", type: "boolean", default: "false", description: "Dims the track and ignores input." },
  ]),
  keyboard: [
    { keys: "ArrowRight / ArrowLeft", action: "Move the thumb 10%" },
    { keys: "PageUp / PageDown", action: "Move 30%" },
    { keys: "Enter / End", action: "Confirm" },
    { keys: "Home", action: "Back to the start" },
  ],
  a11y: [
    "The thumb is a role=slider with a percent value and a hint for keyboard users.",
    "Enter confirms directly, so nobody has to emulate a drag.",
    "A polite status announces the confirmed state.",
  ],
  reducedMotion: "No label shimmer or nudging arrow; the thumb returns and confirms with a short tween instead of a spring.",
  examples: [
    { title: "Checkout", description: "Large success track that stays confirmed.", Demo: Checkout },
    { title: "Lock screen", description: "The classic, on a dark island.", Demo: LockScreen },
    { title: "Irreversible transfer", description: "threshold={1}: only the full track confirms.", Demo: Transfer, wide: true },
  ],
};

export default item;
