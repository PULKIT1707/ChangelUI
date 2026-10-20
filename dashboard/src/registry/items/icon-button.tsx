import { IconButton, type IconButtonProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<IconButtonProps["variant"]>;
  tone: NonNullable<IconButtonProps["tone"]>;
  size: NonNullable<IconButtonProps["size"]>;
  shape: NonNullable<IconButtonProps["shape"]>;
  loading: boolean;
};

const defaults: DemoProps = { variant: "outline", tone: "neutral", size: "md", shape: "square", loading: false };

function Gear() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex items-center gap-3">
      <IconButton {...props} aria-label="Settings">
        <Gear />
      </IconButton>
      <IconButton variant="solid" tone="primary" shape="circle" size={props.size} aria-label="Settings (solid)">
        <Gear />
      </IconButton>
    </div>
  );
}

function Mini() {
  return (
    <IconButton variant="outline" aria-label="Settings">
      <Gear />
    </IconButton>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "variant", label: "Variant", options: ["solid", "outline", "ghost", "soft", "link"] },
    { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "select", prop: "shape", label: "Shape", options: ["square", "circle"] },
    { type: "boolean", prop: "loading", label: "Loading" },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "IconButton",
      { "aria-label": "Settings", ...props },
      { variant: "ghost", tone: "neutral", size: "md", shape: "square", loading: false },
      "<GearIcon />",
    ),
  propsTable: propDocs<IconButtonProps>()([
    { name: "aria-label", type: "string", description: "Accessible name (dev warning when empty).", required: true },
    { name: "variant", type: '"solid" | "outline" | "ghost" | "soft" | "link"', default: '"ghost"', description: "Visual treatment." },
    { name: "tone", type: "Tone", default: '"neutral"', description: "Semantic color." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "32 / 36 / 44 px square." },
    { name: "shape", type: '"square" | "circle"', default: '"square"', description: "Corner style." },
    { name: "loading", type: "boolean", default: "false", description: "Replaces the icon with a Spinner and ignores clicks." },
    { name: "asChild", type: "boolean", default: "false", description: "Render the single child element instead." },
  ]),
  keyboard: [{ keys: "Enter / Space", action: "Activate" }],
  a11y: ["aria-label is required by the type and warned about in development."],
  reducedMotion: "No press scale.",
};

export default item;
