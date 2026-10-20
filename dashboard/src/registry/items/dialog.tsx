import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  type DialogContentProps,
  type DialogProps,
} from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<DialogContentProps["size"]>;
  dismissible: boolean;
  showClose: boolean;
  openOnLoad: boolean;
};

const defaults: DemoProps = { size: "md", dismissible: true, showClose: true, openOnLoad: false };

function Preview({ props }: { props: DemoProps }) {
  const { dismissible, openOnLoad, ...content } = props;
  // key: toggling "Open on load" remounts the root so defaultOpen applies at once.
  return (
    <Dialog key={String(openOnLoad)} dismissible={dismissible} defaultOpen={openOnLoad}>
      <DialogTrigger asChild>
        <Button>Edit profile</Button>
      </DialogTrigger>
      <DialogContent {...content}>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Changes are saved when you press Save.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input aria-label="Name" defaultValue="Ada Lovelace" />
          <Input aria-label="Handle" defaultValue="@ada" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" tone="neutral">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Mini() {
  // Static picture of a dialog card over a dimmed page; a real one would portal over the page.
  return (
    <div
      aria-hidden="true"
      className="relative flex h-32 w-60 items-center justify-center overflow-hidden rounded-pui-lg border border-pui-border bg-pui-muted"
    >
      <div className="absolute left-3 top-3 h-2 w-16 rounded-pui-full bg-pui-muted-foreground/40" />
      <div className="absolute left-3 top-7 h-1.5 w-24 rounded-pui-full bg-pui-muted-foreground/30" />
      <div className="absolute inset-0 bg-pui-overlay" />
      <div className="relative w-48 rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground shadow-pui-xl">
        <p className="m-0 text-sm font-semibold">Delete file?</p>
        <p className="m-0 mt-1 text-xs text-pui-muted-foreground">This can't be undone.</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="ghost" tone="neutral" tabIndex={-1}>
            Cancel
          </Button>
          <Button size="sm" tone="danger" tabIndex={-1}>
            Delete
          </Button>
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
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg", "xl", "full"] },
    { type: "boolean", prop: "dismissible", label: "Dismissible" },
    { type: "boolean", prop: "showClose", label: "Close button" },
    { type: "boolean", prop: "openOnLoad", label: "Open on load" },
  ],
  snippet: ({ dismissible, openOnLoad, ...content }) =>
    toJsx<Record<string, unknown>>(
      "Dialog",
      { dismissible, defaultOpen: openOnLoad },
      { dismissible: true, defaultOpen: false },
      [
        "<DialogTrigger asChild>",
        "  <Button>Edit profile</Button>",
        "</DialogTrigger>",
        toJsx<Record<string, unknown>>(
          "DialogContent",
          content,
          { size: "md", showClose: true },
          [
            "<DialogHeader>",
            "  <DialogTitle>Edit profile</DialogTitle>",
            "  <DialogDescription>…</DialogDescription>",
            "</DialogHeader>",
            "<DialogFooter>",
            "  <DialogClose asChild>",
            "    <Button>Save</Button>",
            "  </DialogClose>",
            "</DialogFooter>",
          ].join("\n"),
        ),
      ].join("\n"),
    ),
  propsTable: propDocs<DialogProps & DialogContentProps>()([
    { name: "open", type: "boolean", description: "Dialog: controlled open state." },
    { name: "defaultOpen", type: "boolean", default: "false", description: "Dialog: uncontrolled initial state." },
    { name: "onOpenChange", type: "(open: boolean) => void", description: "Dialog: called on open and close." },
    { name: "dismissible", type: "boolean", default: "true", description: "Dialog: Escape and overlay clicks close it." },
    { name: "size", type: '"sm" | "md" | "lg" | "xl" | "full"', default: '"md"', description: "Content: max width 384 / 512 / 640 / 768 px or full." },
    { name: "showClose", type: "boolean", default: "true", description: "Content: top-right close button." },
    { name: "closeLabel", type: "string", default: '"Close"', description: "Content: close button name." },
    { name: "initialFocus", type: "RefObject<HTMLElement>", description: "Content: element focused on open." },
    { name: "container", type: "HTMLElement | null", description: "Content: portal target." },
    { name: "overlayClassName", type: "string", description: "Content: classes for the overlay." },
  ]),
  keyboard: [
    { keys: "Tab / Shift+Tab", action: "Cycle focus inside the dialog" },
    { keys: "Escape", action: "Close (when dismissible) and return focus" },
  ],
  a11y: [
    "role=dialog with aria-modal, labelled by DialogTitle and described by DialogDescription.",
    "Focus is trapped and returns to the trigger when the dialog closes.",
    "The close button comes last in the DOM, so the first tabbable is real content.",
  ],
  reducedMotion: "Fades in without the scale and slide.",
};

export default item;
