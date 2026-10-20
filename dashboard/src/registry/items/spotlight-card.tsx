import { SpotlightCard, type SpotlightCardProps } from "changelui";
import { useRef } from "react";
import { useAutoPointer } from "../../lib/auto-pointer";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  spotlightSize: number;
  borderGlow: boolean;
};

const defaults: DemoProps = { spotlightSize: 320, borderGlow: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "spotlightSize", label: "Spotlight size", min: 80, max: 600, step: 20 },
  { type: "boolean", prop: "borderGlow", label: "Border glow" },
];

function Preview({ props }: { props: DemoProps }) {
  return (
    <SpotlightCard {...props} className="w-80 p-6">
      <p className="m-0 text-base font-semibold">Spotlight</p>
      <p className="m-0 mt-1 text-sm text-pui-muted-foreground">Move the pointer over the card, or tab to the link.</p>
      <a href="#/effects/spotlight-card" className="mt-3 inline-block text-sm text-pui-primary-text underline">
        Focusable link
      </a>
    </SpotlightCard>
  );
}

function Mini() {
  const ref = useRef<HTMLDivElement>(null);
  useAutoPointer(ref);
  return (
    <SpotlightCard
      ref={ref}
      spotlightSize={140}
      // Bento tiles are not hovered, so keep the spotlight layers visible while it auto-demos.
      className="h-20 w-36 [&>[data-pui-spotlight-border]]:opacity-100 [&>[data-pui-spotlight]]:opacity-100"
    />
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("SpotlightCard", props, defaults, "...", controls),
  propsTable: propDocs<SpotlightCardProps>()([
    { name: "spotlightColor", type: "string", default: '"var(--pui-spotlight)"', description: "Spotlight color." },
    { name: "spotlightSize", type: "number", default: "320", description: "Spotlight radius in px." },
    { name: "borderGlow", type: "boolean", default: "true", description: "Light up the border near the pointer." },
  ]),
  a11y: ["Focus within the card shows a centered spotlight for keyboard users."],
  reducedMotion: "The spotlight shows centered on hover instead of following the pointer.",
};

export default item;
