import { Button, IconButton, Tooltip, type TooltipProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  side: NonNullable<TooltipProps["side"]>;
  align: NonNullable<TooltipProps["align"]>;
  arrow: boolean;
  openDelayMs: number;
  content: string;
  openOnLoad: boolean;
};

const defaults: DemoProps = {
  side: "top",
  align: "center",
  arrow: false,
  openDelayMs: 400,
  content: "Add to library",
  openOnLoad: false,
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const { content, openOnLoad, ...rest } = props;
  return (
    <div className="flex items-center gap-4">
      {/* key: toggling "Open on load" remounts the tooltip so defaultOpen applies at once. */}
      <Tooltip key={String(openOnLoad)} content={content} defaultOpen={openOnLoad} {...rest}>
        <Button variant="outline" tone="neutral">
          Hover or focus me
        </Button>
      </Tooltip>
      <Tooltip content="New item" {...rest}>
        <IconButton aria-label="New item" variant="soft">
          <PlusIcon />
        </IconButton>
      </Tooltip>
    </div>
  );
}

function Mini() {
  // Static picture of an open tooltip; a real one would portal out of the bento card.
  return (
    <div className="flex flex-col items-center gap-2" aria-hidden="true">
      <span className="rounded-pui-md bg-pui-foreground px-2.5 py-1.5 text-xs text-pui-background shadow-pui-md">
        Add to library
      </span>
      <Button size="sm" variant="outline" tone="neutral" tabIndex={-1}>
        Hover
      </Button>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "side", label: "Side", options: ["top", "right", "bottom", "left"] },
    { type: "select", prop: "align", label: "Align", options: ["start", "center", "end"] },
    { type: "boolean", prop: "arrow", label: "Arrow" },
    { type: "number", prop: "openDelayMs", label: "Open delay (ms)", min: 0, max: 1000, step: 50 },
    { type: "text", prop: "content", label: "Content", maxLength: 60 },
    { type: "boolean", prop: "openOnLoad", label: "Open on load" },
  ],
  snippet: ({ openOnLoad, ...props }) =>
    toJsx<Record<string, unknown>>(
      "Tooltip",
      { ...props, defaultOpen: openOnLoad },
      { ...defaults, content: "", defaultOpen: false },
      "<Button>Hover or focus me</Button>",
    ),
  propsTable: propDocs<TooltipProps>()([
    { name: "content", type: "ReactNode", description: "Tooltip text.", required: true },
    { name: "children", type: "ReactElement", description: "A single focusable element (receives the trigger props).", required: true },
    { name: "side", type: '"top" | "right" | "bottom" | "left"', default: '"top"', description: "Preferred side; flips on collision." },
    { name: "align", type: '"start" | "center" | "end"', default: '"center"', description: "Cross-axis alignment." },
    { name: "sideOffset", type: "number", default: "8", description: "Gap to the trigger in px." },
    { name: "openDelayMs", type: "number", default: "400", description: "Delay before opening (skipped while warm)." },
    { name: "closeDelayMs", type: "number", default: "100", description: "Delay before closing on pointer leave." },
    { name: "open", type: "boolean", description: "Controlled open state." },
    { name: "defaultOpen", type: "boolean", default: "false", description: "Uncontrolled initial state." },
    { name: "onOpenChange", type: "(open: boolean) => void", description: "Called when the tooltip opens or closes." },
    { name: "disabled", type: "boolean", default: "false", description: "Never open." },
    { name: "arrow", type: "boolean", default: "false", description: "Show an arrow pointing at the trigger." },
    { name: "container", type: "HTMLElement | null", description: "Portal target; default document.body." },
  ]),
  keyboard: [{ keys: "Escape", action: "Hide the tooltip" }],
  a11y: [
    "role=tooltip; the trigger gets aria-describedby only while it is open.",
    "Opens on keyboard focus, never on touch; the content stays open while hovered.",
  ],
  reducedMotion: "Fades without the scale and slide.",
};

export default item;
