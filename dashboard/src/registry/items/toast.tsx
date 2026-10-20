import { Button, Toaster, toast, type ToasterProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  position: NonNullable<ToasterProps["position"]>;
  max: number;
  durationMs: number;
  showClose: boolean;
  layout: NonNullable<ToasterProps["layout"]>;
  showProgress: boolean;
};

const defaults: DemoProps = {
  position: "bottom-right",
  max: 3,
  durationMs: 5000,
  showClose: true,
  layout: "stack",
  showProgress: true,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Toaster {...props} />
      <Button
        variant="outline"
        tone="neutral"
        onClick={() => toast({ title: "Event created", description: "Friday, 10:00 AM" })}
      >
        Show toast
      </Button>
      <Button variant="soft" tone="success" onClick={() => toast.success("Changes saved")}>
        Success
      </Button>
      <Button variant="soft" tone="danger" onClick={() => toast.danger("Upload failed", { description: "Check your connection." })}>
        Danger
      </Button>
      <Button
        variant="ghost"
        tone="neutral"
        onClick={() =>
          toast({
            title: "Message archived",
            action: { label: "Undo", onClick: () => toast.info("Restored") },
          })
        }
      >
        With action
      </Button>
      <Button
        variant="soft"
        tone="primary"
        onClick={() => {
          void toast.promise(wait(1500), { loading: "Uploading…", success: "Uploaded", error: "Upload failed" });
        }}
      >
        Promise
      </Button>
      <Button variant="ghost" tone="neutral" onClick={() => toast.loading("Syncing workspace…")}>
        Loading
      </Button>
      <Button
        variant="outline"
        tone="neutral"
        onClick={() => {
          toast({ title: "Deploy started", description: "main → production" });
          toast.info("3 new comments");
          toast.success("Build passed", { description: "All 1,284 tests green" });
        }}
      >
        Stack 3
      </Button>
    </div>
  );
}

function Mini() {
  // Static picture of a toast; the live Toaster is on the item page.
  return (
    <div
      aria-hidden="true"
      className="flex w-56 items-start gap-2 rounded-pui-lg border border-pui-border bg-pui-surface p-3 text-xs text-pui-surface-foreground shadow-pui-lg"
    >
      <span className="mt-1 size-2 shrink-0 rounded-pui-full bg-pui-success" />
      <span>
        <span className="block font-medium">Changes saved</span>
        <span className="block text-pui-muted-foreground">Just now</span>
      </span>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    {
      type: "select",
      prop: "position",
      label: "Position",
      options: ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"],
    },
    { type: "number", prop: "max", label: "Max visible", min: 1, max: 5, step: 1 },
    { type: "number", prop: "durationMs", label: "Duration (ms)", min: 1000, max: 10000, step: 500 },
    { type: "boolean", prop: "showClose", label: "Close button" },
    { type: "select", prop: "layout", label: "Layout", options: ["stack", "list"] },
    { type: "boolean", prop: "showProgress", label: "Progress" },
  ],
  snippet: (props) =>
    `${toJsx<Record<string, unknown>>("Toaster", props, defaults)}\n\ntoast({ title: "Event created", description: "Friday, 10:00 AM" });\ntoast.success("Changes saved");\ntoast.promise(upload(), { loading: "Uploading…", success: "Uploaded", error: "Upload failed" });`,
  propsTable: propDocs<ToasterProps>()([
    {
      name: "position",
      type: '"top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"',
      default: '"bottom-right"',
      description: "Where the stack sits.",
    },
    { name: "max", type: "number", default: "3", description: "Visible toasts; the rest queue." },
    { name: "durationMs", type: "number", default: "5000", description: "Default lifetime (per-toast durationMs wins; Infinity is sticky)." },
    { name: "showClose", type: "boolean", default: "true", description: "Close button on each toast." },
    {
      name: "layout",
      type: '"stack" | "list"',
      default: '"stack"',
      description: "A collapsed deck that fans out on hover or focus, or a plain column. Reduced motion uses the list.",
    },
    { name: "showProgress", type: "boolean", default: "true", description: "Hairline showing each timed toast's remaining lifetime." },
    { name: "gap", type: "number", default: "8", description: "Gap between toasts in px." },
    { name: "hotkey", type: "string | null", default: '"F8"', description: "Focuses the notification region." },
    { name: "label", type: "string", default: '"Notifications"', description: "Region name." },
    { name: "closeLabel", type: "string", default: '"Dismiss notification"', description: "Close button name." },
    { name: "container", type: "HTMLElement | null", description: "Portal target." },
  ]),
  keyboard: [
    { keys: "F8", action: "Focus the notification region (the stack fans out)" },
    { keys: "Tab", action: "Move through toast actions and close buttons" },
  ],
  a11y: [
    "Toasts are announced through persistent polite / assertive (danger) live regions.",
    "Timers pause while the stack is hovered or focused, and while the tab is hidden.",
    "Loading toasts set aria-busy; toast.promise re-announces the toast when it settles (errors assertively).",
    "toast.loading(title), toast.update(id, patch) and toast.promise(promise, { loading, success, error }) return or reuse one id.",
  ],
  reducedMotion: "Toasts fade in and out in a plain list, without the deck, sliding or progress hairline.",
};

export default item;
