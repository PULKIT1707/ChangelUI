import { Alert, Button, type AlertProps } from "changelui";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  tone: NonNullable<AlertProps["tone"]>;
  variant: NonNullable<AlertProps["variant"]>;
  title: string;
  live: boolean;
  dismissible: boolean;
};

const defaults: DemoProps = { tone: "info", variant: "soft", title: "New version available", live: false, dismissible: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "tone", label: "Tone", options: ["neutral", "primary", "success", "warning", "danger", "info"] },
  { type: "select", prop: "variant", label: "Variant", options: ["soft", "outline", "solid"] },
  { type: "text", prop: "title", label: "Title", maxLength: 60 },
  { type: "boolean", prop: "live", label: "Live region" },
  { type: "boolean", prop: "dismissible", label: "Dismissible" },
];

function Preview({ props }: { props: DemoProps }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      <AnimatePresence initial={false}>
        {open ? (
          <Alert
            key="alert"
            tone={props.tone}
            variant={props.variant}
            title={props.title}
            live={props.live}
            onDismiss={props.dismissible ? () => setOpen(false) : undefined}
          >
            ChangelUI 0.2 adds new components. Reload to update.
          </Alert>
        ) : null}
      </AnimatePresence>
      {open ? null : (
        <Button size="sm" variant="outline" tone="neutral" onClick={() => setOpen(true)}>
          Show again
        </Button>
      )}
    </div>
  );
}

function Mini() {
  return (
    <Alert tone="success" title="Saved" className="max-w-56">
      All changes synced.
    </Alert>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ dismissible, ...props }) => {
    // Component defaults (title has none, so it is always shown).
    const base: Record<string, unknown> = { tone: "info", variant: "soft", live: false };
    const jsx = toJsx<Record<string, unknown>>("Alert", props, base, "ChangelUI 0.2 adds new components. Reload to update.");
    return dismissible ? jsx.replace("<Alert", "<Alert onDismiss={() => setOpen(false)}") : jsx;
  },
  propsTable: propDocs<AlertProps>()([
    { name: "tone", type: '"neutral" | "primary" | "success" | "warning" | "danger" | "info"', default: '"info"', description: "Semantic color; also picks the default icon." },
    { name: "variant", type: '"soft" | "outline" | "solid"', default: '"soft"', description: "Visual treatment." },
    { name: "title", type: "ReactNode", description: "Bold first line." },
    { name: "icon", type: "ReactNode | false", description: "Overrides the tone icon; false hides it." },
    { name: "action", type: "ReactNode", description: "Trailing action, for example a Button." },
    { name: "onDismiss", type: "() => void", description: "Renders a dismiss IconButton." },
    { name: "dismissLabel", type: "string", default: '"Dismiss"', description: "Accessible name of the dismiss button." },
    { name: "live", type: "boolean", default: "false", description: 'Announce: role="alert" for warning/danger, role="status" otherwise.' },
  ]),
  a11y: [
    "Static callouts have no role. Set live for messages that appear after the page loads.",
    "The dismiss button is an IconButton with dismissLabel as its accessible name.",
  ],
  reducedMotion: "Enter and exit fade without movement.",
};

export default item;
