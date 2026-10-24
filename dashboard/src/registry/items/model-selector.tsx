import { ModelSelector, type ModelOption, type ModelSelectorProps } from "changelui";
import { useEffect, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  recommended: boolean;
  requires: "none" | "vision" | "reasoning";
  size: "sm" | "md" | "lg";
  open: boolean;
};
const defaults: DemoProps = { recommended: true, requires: "none", size: "md", open: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "recommended", label: "Recommended group" },
  { type: "select", prop: "requires", label: "Request needs", options: ["none", "vision", "reasoning"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "boolean", prop: "open", label: "Open on load" },
];
// Fictional models and prices, for the demo only.
const MODELS: ModelOption[] = [
  { id: "atlas-pro", name: "Atlas Pro", provider: "Northwind AI", description: "Best for long documents and careful reasoning", contextWindow: 200_000, inputPrice: 3, outputPrice: 15, speed: 2, capabilities: ["vision", "tools", "reasoning"] },
  { id: "atlas-mini", name: "Atlas Mini", provider: "Northwind AI", description: "Fast drafts and classification", contextWindow: 128_000, inputPrice: 0.25, outputPrice: 1.25, speed: 3, capabilities: ["vision", "tools"] },
  { id: "lumen-4", name: "Lumen 4", provider: "Lumen Labs", description: "Strong at code and agents", contextWindow: 256_000, inputPrice: 2.5, outputPrice: 10, speed: 2, capabilities: ["tools", "reasoning", "files"], tag: "New" },
  { id: "lumen-4-flash", name: "Lumen 4 Flash", provider: "Lumen Labs", description: "Lowest latency for chat", contextWindow: 1_000_000, inputPrice: 0.1, outputPrice: 0.4, speed: 3, capabilities: ["vision", "audio", "tools"] },
  { id: "kestrel-70b", name: "Kestrel 70B", provider: "Open weights", description: "Self-hosted, data stays in your cloud", contextWindow: 32_000, speed: 1, capabilities: ["tools"] },
  { id: "kestrel-8b", name: "Kestrel 8B", provider: "Open weights", description: "Runs on a laptop", contextWindow: 8_000, speed: 3 },
];
function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState<string | null>("lumen-4");
  const [open, setOpen] = useState(false);
  // Open after the first frame so the list can measure the mounted field.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(props.open));
    return () => cancelAnimationFrame(frame);
  }, [props.open]);
  const picked = MODELS.find((m) => m.id === value);
  return (
    <div className="flex min-h-[26rem] w-full max-w-sm flex-col gap-2">
      <ModelSelector
        aria-label="Model"
        models={MODELS}
        value={value}
        onValueChange={setValue}
        size={props.size}
        open={open}
        onOpenChange={setOpen}
        recommended={props.recommended ? ["lumen-4", "atlas-pro"] : undefined}
        requires={props.requires === "none" ? undefined : [props.requires]}
      />
      <p className="m-0 text-xs text-pui-muted-foreground" aria-live="polite">
        {picked ? `${picked.name} · ${picked.provider}` : "No model selected"}
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-60">
      <ModelSelector aria-label="Model" models={MODELS} defaultValue="atlas-pro" />
    </div>
  );
}
/** An image is attached, so models without vision are disabled with the reason. */
function AttachmentDemo() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div className="mx-auto flex min-h-[24rem] w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground">
      <div className="flex items-center gap-2 rounded-pui-md bg-pui-muted px-2.5 py-1.5 text-xs text-pui-muted-foreground">
        <span className="rounded-pui-sm bg-pui-surface px-1.5 py-0.5 font-medium text-pui-foreground">receipt.jpg</span>
        attached: picking a model that can read images
      </div>
      <ModelSelector aria-label="Model for this request" models={MODELS} value={value} onValueChange={setValue} requires={["vision"]} openOnFocus placeholder="Choose a vision model…" />
    </div>
  );
}
/** Compact in a composer footer. */
function ComposerDemo() {
  return (
    <div className="mx-auto w-full max-w-md rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-sm">
      <p className="m-0 min-h-14 px-4 pt-3 text-sm text-pui-muted-foreground">Refactor the billing module to…</p>
      <div className="flex items-center gap-2 border-t border-pui-border px-2 py-1.5">
        <ModelSelector aria-label="Model" size="sm" models={MODELS} defaultValue="lumen-4-flash" wrapperClassName="w-52" clearable={false} />
      </div>
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<ModelSelector\n  aria-label="Model"\n  models={[\n    { id: "atlas-pro", name: "Atlas Pro", provider: "Northwind AI",\n      contextWindow: 200000, inputPrice: 3, outputPrice: 15, speed: 2,\n      capabilities: ["vision", "tools", "reasoning"] },\n    // …\n  ]}\n  value={model}\n  onValueChange={setModel}${props.recommended ? '\n  recommended={["lumen-4", "atlas-pro"]}' : ""}${props.requires !== "none" ? `\n  requires={["${props.requires}"]}` : ""}${props.size !== "md" ? `\n  size="${props.size}"` : ""}\n/>`,
  propsTable: propDocs<ModelSelectorProps>()([
    { name: "models", type: "{ id, name, provider, description?, contextWindow?, inputPrice?, outputPrice?, speed?, capabilities?, tag?, disabled? }[]", required: true, description: "Grouped by provider; prices are per 1M tokens and speed is 1–3." },
    { name: "value", type: "string | null", description: "Selected id (with defaultValue and onValueChange(id, model))." },
    { name: "recommended", type: "string[]", description: "Ids listed first under the recommended heading." },
    { name: "recommendedLabel", type: "string", default: '"Recommended"', description: "Heading for the recommended group." },
    { name: "requires", type: "ModelCapability[]", description: "Capabilities the request needs; other models are disabled with the reason." },
    { name: "currency", type: "string", default: '"USD"', description: "Price currency." },
    { name: "locale", type: "string", description: "Number formatting locale." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field size; placeholder, openOnFocus and other Combobox props pass through." },
  ]),
  keyboard: [
    { keys: "Type", action: "Filter by name, provider, capability or description" },
    { keys: "↑ / ↓", action: "Move through models" },
    { keys: "Enter", action: "Pick the active model" },
    { keys: "Escape", action: "Close the list" },
  ],
  a11y: [
    "APG combobox with a grouped listbox; the active option is announced through aria-activedescendant.",
    "Unsupported models stay in the list as disabled options and say why in text, so color is never the only cue.",
  ],
  reducedMotion: "The list opens and filters without the height spring and option stagger.",
  examples: [
    { title: "Match the request", description: "With an image attached, only vision models can be picked.", Demo: AttachmentDemo },
    { title: "In a composer footer", description: "Small size with a fixed width; the provider mark shows in the field.", Demo: ComposerDemo },
  ],
};
export default item;
