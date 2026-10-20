import {
  Button,
  Input,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  type PopoverContentProps,
} from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  side: NonNullable<PopoverContentProps["side"]>;
  align: NonNullable<PopoverContentProps["align"]>;
  arrow: boolean;
  sideOffset: number;
  openOnLoad: boolean;
};

const defaults: DemoProps = { side: "bottom", align: "center", arrow: false, sideOffset: 8, openOnLoad: false };

function Preview({ props }: { props: DemoProps }) {
  const { openOnLoad, ...content } = props;
  // key: toggling "Open on load" remounts the root so defaultOpen applies at once.
  return (
    <Popover key={String(openOnLoad)} defaultOpen={openOnLoad}>
      <PopoverTrigger asChild>
        <Button variant="outline" tone="neutral">
          Edit dimensions
        </Button>
      </PopoverTrigger>
      <PopoverContent {...content} aria-labelledby="pui-demo-popover-title">
        <div className="flex flex-col gap-3">
          <p id="pui-demo-popover-title" className="m-0 font-medium">
            Dimensions
          </p>
          <Input aria-label="Width" defaultValue="320px" />
          <Input aria-label="Height" defaultValue="auto" />
          <PopoverClose asChild>
            <Button size="sm">Done</Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Mini() {
  // Static picture of an open popover; a real one would portal out of the bento card.
  return (
    <div aria-hidden="true" className="flex flex-col items-center">
      <Button size="sm" variant="outline" tone="neutral" tabIndex={-1}>
        Dimensions
      </Button>
      <div className="relative mt-2.5 w-44 rounded-pui-lg border border-pui-border bg-pui-surface p-3 text-pui-surface-foreground shadow-pui-lg">
        <div className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-s border-t border-pui-border bg-pui-surface" />
        <p className="m-0 text-xs font-semibold">Dimensions</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="w-9 text-[10px] text-pui-muted-foreground">Width</span>
          <div className="h-5 flex-1 rounded-pui-sm border border-pui-input bg-pui-background" />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-9 text-[10px] text-pui-muted-foreground">Height</span>
          <div className="h-5 flex-1 rounded-pui-sm border border-pui-input bg-pui-background" />
        </div>
      </div>
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
    { type: "number", prop: "sideOffset", label: "Offset", min: 0, max: 24, step: 1 },
    { type: "boolean", prop: "openOnLoad", label: "Open on load" },
  ],
  snippet: ({ openOnLoad, ...props }) =>
    [
      openOnLoad ? "<Popover defaultOpen>" : "<Popover>",
      "  <PopoverTrigger asChild>",
      "    <Button>Edit dimensions</Button>",
      "  </PopoverTrigger>",
      toJsx<Record<string, unknown>>(
        "PopoverContent",
        { ...props, "aria-label": "Dimensions" },
        { side: "bottom", align: "center", arrow: false, sideOffset: 8 },
        "…\n<PopoverClose asChild>\n  <Button>Done</Button>\n</PopoverClose>",
      )
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
      "</Popover>",
    ].join("\n"),
  propsTable: propDocs<PopoverContentProps>()([
    { name: "side", type: '"top" | "right" | "bottom" | "left"', default: '"bottom"', description: "Preferred side; flips on collision." },
    { name: "align", type: '"start" | "center" | "end"', default: '"center"', description: "Cross-axis alignment." },
    { name: "sideOffset", type: "number", default: "8", description: "Gap to the trigger in px." },
    { name: "arrow", type: "boolean", default: "false", description: "Show an arrow." },
    {
      name: "initialFocus",
      type: '"first" | "content"',
      default: '"first"',
      description: "Focus the first tabbable element, or the panel, once positioned.",
    },
    { name: "container", type: "HTMLElement | null", description: "Portal target; default document.body." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Toggle from the trigger" },
    { keys: "Escape", action: "Close and return focus to the trigger" },
  ],
  a11y: [
    "Non-modal role=dialog; name it with aria-label or aria-labelledby.",
    "The trigger carries aria-haspopup=dialog, aria-expanded and aria-controls.",
    "Clicking outside closes it without moving focus; tabbing away closes it too.",
  ],
  reducedMotion: "Fades without the scale and slide.",
};

export default item;
