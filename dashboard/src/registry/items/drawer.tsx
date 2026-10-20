import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Switch,
  type DrawerContentProps,
} from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  side: NonNullable<DrawerContentProps["side"]>;
  size: NonNullable<DrawerContentProps["size"]>;
  swipeToDismiss: boolean;
  openOnLoad: boolean;
};

const defaults: DemoProps = { side: "right", size: "md", swipeToDismiss: true, openOnLoad: false };

function Preview({ props }: { props: DemoProps }) {
  const { openOnLoad, ...content } = props;
  // key: toggling "Open on load" remounts the root so defaultOpen applies at once.
  return (
    <Drawer key={String(openOnLoad)} defaultOpen={openOnLoad}>
      <DrawerTrigger asChild>
        <Button variant="outline" tone="neutral">
          Open settings
        </Button>
      </DrawerTrigger>
      <DrawerContent {...content}>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerDescription>Swipe the grab handle or the inner edge toward the side, or press Escape to close.</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 text-sm">
          <label className="flex items-center justify-between gap-4">
            Notifications <Switch defaultChecked />
          </label>
          <label className="flex items-center justify-between gap-4">
            Weekly digest <Switch />
          </label>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button>Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function Mini() {
  // Static picture of a right drawer over a page.
  return (
    <div aria-hidden="true" className="relative h-24 w-40 overflow-hidden rounded-pui-lg border border-pui-border bg-pui-muted">
      <div className="absolute inset-0 bg-pui-overlay" />
      <div className="absolute inset-y-0 right-0 flex w-20 flex-col border-s border-pui-border bg-pui-surface p-2 shadow-pui-xl">
        <div className="absolute inset-y-0 left-1 my-auto h-6 w-1 rounded-pui-full bg-pui-muted-foreground/40" />
        <div className="ms-2 h-2 w-10 rounded-pui-full bg-pui-foreground/70" />
        <div className="ms-2 mt-2 h-1.5 w-12 rounded-pui-full bg-pui-muted-foreground/40" />
        <div className="ms-2 mt-1 h-1.5 w-10 rounded-pui-full bg-pui-muted-foreground/40" />
        <div className="ms-2 mt-auto h-3.5 w-12 self-end rounded-pui-sm bg-pui-primary" />
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
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg", "full"] },
    { type: "boolean", prop: "swipeToDismiss", label: "Swipe to dismiss" },
    { type: "boolean", prop: "openOnLoad", label: "Open on load" },
  ],
  snippet: ({ openOnLoad, ...props }) =>
    [
      openOnLoad ? "<Drawer defaultOpen>" : "<Drawer>",
      "  <DrawerTrigger asChild>",
      "    <Button>Open settings</Button>",
      "  </DrawerTrigger>",
      toJsx<Record<string, unknown>>(
        "DrawerContent",
        props,
        { side: "right", size: "md", swipeToDismiss: true },
        "<DrawerHeader>\n  <DrawerTitle>Settings</DrawerTitle>\n</DrawerHeader>\n…",
      )
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
      "</Drawer>",
    ].join("\n"),
  propsTable: propDocs<DrawerContentProps>()([
    { name: "side", type: '"top" | "right" | "bottom" | "left"', default: '"right"', description: "Edge the drawer slides in from." },
    {
      name: "size",
      type: '"sm" | "md" | "lg" | "full"',
      default: '"md"',
      description: "Width 320 / 400 / 540 px (left, right) or height 40 / 60 / 80 dvh (top, bottom).",
    },
    {
      name: "swipeToDismiss",
      type: "boolean",
      default: "true",
      description:
        "Drag toward the edge past 30% (or quickly) to close. Swipes start from the grab handle (top/bottom), a 24 px inner-edge strip (left/right) or the panel's blank padding (mouse), so content scrolls and selects normally.",
    },
    { name: "showClose", type: "boolean", default: "true", description: "Top-right close button." },
    { name: "closeLabel", type: "string", default: '"Close"', description: "Close button name." },
    { name: "initialFocus", type: "RefObject<HTMLElement>", description: "Element focused on open." },
    { name: "container", type: "HTMLElement | null", description: "Portal target." },
  ]),
  keyboard: [
    { keys: "Tab / Shift+Tab", action: "Cycle focus inside the drawer" },
    { keys: "Escape", action: "Close and return focus" },
  ],
  a11y: [
    "Same dialog semantics, focus trap and scroll lock as Dialog.",
    "Bottom and top drawers show an aria-hidden grab handle on their inner edge when swipeable; left and right drawers use an invisible 24 px inner-edge strip.",
    "Swipe zones are not focusable and never cover content, so touch scrolling, text selection and controls inside the panel work natively.",
  ],
  reducedMotion: "Fades in place instead of sliding.",
};

export default item;
