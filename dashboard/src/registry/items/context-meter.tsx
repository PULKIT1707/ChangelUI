import { Button, ContextMeter, ContextMeterPanel, type ContextMeterPanelProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  messages: number;
  files: number;
  max: number;
  price: number;
  compact: boolean;
};
const defaults: DemoProps = { messages: 84, files: 22, max: 200, price: 3, compact: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "messages", label: "Messages (K tokens)", min: 0, max: 220, step: 2 },
  { type: "number", prop: "files", label: "Files (K tokens)", min: 0, max: 120, step: 2 },
  { type: "select", prop: "max", label: "Window (K)", options: ["32", "128", "200", "1000"] },
  { type: "number", prop: "price", label: "$ per 1M input", min: 0, max: 15, step: 0.5 },
  { type: "boolean", prop: "compact", label: "Compact action" },
];
const breakdownOf = (messages: number, files: number) => [
  { label: "System prompt", tokens: 3_200 },
  { label: "Tools", tokens: 5_800 },
  { label: "Messages", tokens: messages * 1000 },
  { label: "Files", tokens: files * 1000 },
];
function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6 md:flex-row md:items-start">
      <div className="w-full max-w-xs rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground shadow-pui-sm">
        <ContextMeterPanel
          model="Sonnet-class model"
          max={Number(props.max) * 1000}
          breakdown={breakdownOf(props.messages, props.files)}
          pricePerMillion={props.price || undefined}
          onCompact={props.compact ? () => new Promise((r) => setTimeout(r, 900)) : undefined}
        />
      </div>
      <Composer max={Number(props.max) * 1000} messages={props.messages} files={props.files} />
    </div>
  );
}
/** A chat composer footer with the ring at the end. */
function Composer({ max, messages, files }: { max: number; messages: number; files: number }) {
  return (
    <div className="w-full max-w-sm rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-sm">
      <p className="m-0 min-h-16 px-4 pt-3 text-sm text-pui-muted-foreground">Summarize the attached contracts…</p>
      <div className="flex items-center justify-between gap-2 border-t border-pui-border px-2 py-1.5">
        <span className="px-2 text-xs text-pui-muted-foreground">3 files attached</span>
        <div className="flex items-center gap-1">
          <ContextMeter max={max} breakdown={breakdownOf(messages, files)} pricePerMillion={3} />
          <Button size="sm">Send</Button>
        </div>
      </div>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-56">
      <ContextMeterPanel max={128_000} breakdown={breakdownOf(68, 14)} />
    </div>
  );
}
/** Long conversation: compact drops old turns and the meter falls back. */
function CompactDemo() {
  const [messages, setMessages] = useState(112_000);
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <ContextMeterPanel
        model="128K window"
        max={128_000}
        breakdown={[
          { label: "System prompt", tokens: 4_000 },
          { label: "Messages", tokens: messages },
        ]}
        onCompact={() =>
          new Promise<void>((resolve) =>
            setTimeout(() => {
              setMessages(18_000);
              resolve();
            }, 900),
          )
        }
      />
      <Button size="sm" variant="ghost" onClick={() => setMessages((m) => Math.min(140_000, m + 12_000))}>
        Send a long message (+12K)
      </Button>
    </div>
  );
}
/** Trigger states at a glance. */
function StatesDemo() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-wrap items-center justify-center gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-4">
      <ContextMeter used={12_000} max={128_000} />
      <ContextMeter used={101_000} max={128_000} />
      <ContextMeter used={121_000} max={128_000} />
      <ContextMeter used={128_000} max={128_000} />
      <ContextMeter used={64_000} max={200_000} showPercent={false} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<ContextMeter\n  max={${Number(props.max) * 1000}}\n  breakdown={[\n    { label: "System prompt", tokens: 3200 },\n    { label: "Messages", tokens: ${props.messages * 1000} },\n    { label: "Files", tokens: ${props.files * 1000} },\n  ]}${props.price ? `\n  pricePerMillion={${props.price}}` : ""}${props.compact ? "\n  onCompact={compactConversation}" : ""}\n/>`,
  propsTable: propDocs<ContextMeterPanelProps & { open?: boolean; side?: string; showPercent?: boolean }>()([
    { name: "max", type: "number", required: true, description: "Context window size in tokens." },
    { name: "used", type: "number", default: "sum of breakdown", description: "Tokens in the window." },
    { name: "breakdown", type: "{ label, tokens, color? }[]", description: "What fills the window: stacked bar and legend with a Free row." },
    { name: "thresholds", type: "{ warning?, critical? }", default: "{ warning: 0.75, critical: 0.9 }", description: "Fractions where the tone changes." },
    { name: "pricePerMillion", type: "number", description: "Input price; shows the estimated cost of the next request." },
    { name: "currency", type: "string", default: '"USD"', description: "Currency for the cost." },
    { name: "onCompact", type: "() => void | Promise<void>", description: "Shows a Compact action; a promise shows pending." },
    { name: "model", type: "ReactNode", description: "Model name under the title." },
    { name: "formatTokens", type: "(n) => string", default: "compact (76.2K)", description: "Token formatter." },
    { name: "showPercent", type: "boolean", default: "true", description: "ContextMeter only: percentage next to the ring." },
    { name: "side", type: "Side", default: '"top"', description: "ContextMeter only: panel side." },
    { name: "open", type: "boolean", description: "ContextMeter only: controlled open state (with defaultOpen, onOpenChange)." },
  ]),
  a11y: [
    'The trigger is named with the numbers ("Context window: 76K of 128K tokens used (59%)"); the panel has one role="meter" with aria-valuetext.',
    "Warnings are written out in text and announced through role=\"status\"; the legend is a list with percentages, so color is never the only cue.",
  ],
  reducedMotion: "The ring and bar appear at their value without the sweep and grow.",
  examples: [
    { title: "Compact a long chat", description: "Fill the window, then compact; the pending state lasts until the promise settles.", Demo: CompactDemo },
    { title: "Trigger states", description: "ok, warning, critical, full and ring-only.", Demo: StatesDemo },
  ],
};
export default item;
