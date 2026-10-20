import { GooeyButton, Input, type GooeyButtonProps } from "changelui";
import { useRef, useState } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { ArrowRightIcon, SendIcon } from "../../lib/demo-icons";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  blobs: number;
  intensity: number;
  stretch: number;
  tone: NonNullable<GooeyButtonProps["tone"]>;
  size: NonNullable<GooeyButtonProps["size"]>;
  disabled: boolean;
};

const defaults: DemoProps = { blobs: 3, intensity: 10, stretch: 0.7, tone: "primary", size: "md", disabled: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "blobs", label: "Droplets", min: 0, max: 8, step: 1 },
  { type: "number", prop: "intensity", label: "Melt (blur px)", min: 2, max: 20, step: 1 },
  { type: "number", prop: "stretch", label: "Droplet size", min: 0.3, max: 1.2, step: 0.05 },
  { type: "select", prop: "tone", label: "Tone", options: ["primary", "neutral", "success", "warning", "danger", "info"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Preview({ props }: { props: DemoProps }) {
  const [clicks, setClicks] = useState(0);
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <GooeyButton {...props} trailingIcon={<ArrowRightIcon />} onClick={() => setClicks((n) => n + 1)}>
        Get started
      </GooeyButton>
      <p className="m-0 text-xs text-pui-muted-foreground" aria-live="polite">
        {clicks ? `Clicked ${clicks}×` : "Hover and sweep across it."}
      </p>
    </div>
  );
}

function NewsletterDemo() {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-pui-surface-foreground">
        Weekly digest
        <Input type="email" required placeholder="you@example.com" />
      </label>
      <GooeyButton type="submit" tone={sent ? "success" : "primary"} leadingIcon={<SendIcon />}>
        {sent ? "Subscribed" : "Subscribe"}
      </GooeyButton>
    </form>
  );
}

function TonesDemo() {
  const tones: DemoProps["tone"][] = ["primary", "success", "warning", "danger", "info", "neutral"];
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4">
      {tones.map((tone, i) => (
        <GooeyButton key={tone} tone={tone} className="capitalize" size={(["sm", "md", "lg"] as const)[i % 3]} blobs={2 + (i % 3)}>
          {tone}
        </GooeyButton>
      ))}
    </div>
  );
}

function MeltDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-4">
      <GooeyButton size="lg" intensity={4} blobs={4} stretch={0.5}>
        Firm
      </GooeyButton>
      <GooeyButton size="lg" intensity={10}>
        Default
      </GooeyButton>
      <GooeyButton size="lg" intensity={16} blobs={6} stretch={1}>
        Molten
      </GooeyButton>
    </div>
  );
}

function Mini() {
  const ref = useRef<HTMLButtonElement | null>(null);
  useAutoPointer(ref);
  return (
    <div className="flex h-28 w-full items-center justify-center">
      <GooeyButton ref={ref} tabIndex={-1} size="lg" blobs={4}>
        Gooey
      </GooeyButton>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("GooeyButton", props, defaults, "Get started", controls),
  propsTable: propDocs<GooeyButtonProps>()([
    { name: "blobs", type: "number", default: "3", description: "Liquid droplets (0-8)." },
    { name: "intensity", type: "number", default: "10", description: "Blur radius of the gooey filter; higher melts more." },
    { name: "stretch", type: "number", default: "0.7", description: "Droplet size as a share of the button height." },
    { name: "tone", type: '"primary" | "neutral" | "success" | "warning" | "danger" | "info"', default: '"primary"', description: "Button tone; the liquid uses the tone color." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Button size." },
    { name: "leadingIcon", type: "ReactNode", description: "Icon before the label (any Button prop works)." },
    { name: "disabled", type: "boolean", default: "false", description: "Disabled Button." },
  ]),
  a11y: [
    "A real Button: same roles, focus ring, loading and disabled behavior.",
    "The SVG filter and droplets are an aria-hidden layer behind the label; the label itself is never filtered.",
  ],
  reducedMotion: "Renders a plain solid Button.",
  examples: [
    { title: "Newsletter form", Demo: NewsletterDemo, wide: true },
    { title: "Tones and sizes", Demo: TonesDemo },
    { title: "Melt", description: "intensity 4, 10 and 16.", Demo: MeltDemo },
  ],
};

export default item;
