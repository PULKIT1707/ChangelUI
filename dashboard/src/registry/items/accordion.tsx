import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  type AccordionMultipleProps,
  type AccordionProps,
  type AccordionSingleProps,
} from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  type: "single" | "multiple";
  variant: NonNullable<AccordionProps["variant"]>;
  collapsible: boolean;
  disabled: boolean;
};

const defaults: DemoProps = { type: "single", variant: "bordered", collapsible: true, disabled: false };

const faqs = [
  { value: "install", q: "How do I install it?", a: "npm install changelui, then import the stylesheet once." },
  { value: "theme", q: "Does it support dark mode?", a: "Yes. Every token swaps under .dark or [data-theme=dark]." },
  { value: "motion", q: "Can I turn animations off?", a: "Components follow prefers-reduced-motion and MotionConfig." },
];

function Items() {
  return faqs.map((f) => (
    <AccordionItem key={f.value} value={f.value}>
      <AccordionTrigger>{f.q}</AccordionTrigger>
      <AccordionContent>{f.a}</AccordionContent>
    </AccordionItem>
  ));
}

function Preview({ props }: { props: DemoProps }) {
  const { type, collapsible, ...rest } = props;
  return (
    <div className="w-full max-w-md">
      {type === "multiple" ? (
        <Accordion type="multiple" defaultValue={["install"]} {...rest}>
          <Items />
        </Accordion>
      ) : (
        <Accordion defaultValue="install" collapsible={collapsible} {...rest}>
          <Items />
        </Accordion>
      )}
    </div>
  );
}

function Mini() {
  return (
    <Accordion defaultValue="a" className="w-56">
      <AccordionItem value="a">
        <AccordionTrigger>Shipping</AccordionTrigger>
        <AccordionContent>2-3 days.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Returns</AccordionTrigger>
        <AccordionContent>30 days.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "type", label: "Type", options: ["single", "multiple"] },
    { type: "select", prop: "variant", label: "Variant", options: ["bordered", "separated", "plain"] },
    { type: "boolean", prop: "collapsible", label: "Collapsible (single)" },
    { type: "boolean", prop: "disabled", label: "Disabled" },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "Accordion",
      { ...props, collapsible: props.type === "single" ? props.collapsible : undefined },
      defaults,
      faqs
        .map(
          (f) =>
            `<AccordionItem value="${f.value}">\n  <AccordionTrigger>${f.q}</AccordionTrigger>\n  <AccordionContent>…</AccordionContent>\n</AccordionItem>`,
        )
        .join("\n"),
    ),
  propsTable: propDocs<AccordionSingleProps & Omit<AccordionMultipleProps, "type" | "value" | "defaultValue" | "onValueChange"> & AccordionProps>()([
    { name: "type", type: '"single" | "multiple"', default: '"single"', description: "One open item, or any number." },
    { name: "value", type: "string | null | string[]", description: "Controlled open item(s); null means none." },
    { name: "defaultValue", type: "string | null | string[]", description: "Uncontrolled initial open item(s)." },
    { name: "onValueChange", type: "(value) => void", description: "Called with the new open item(s)." },
    { name: "collapsible", type: "boolean", default: "true", description: "Single: allow closing the open item." },
    { name: "variant", type: '"bordered" | "separated" | "plain"', default: '"bordered"', description: "Visual treatment." },
    { name: "headingLevel", type: "2 | 3 | 4 | 5 | 6", default: "3", description: "Heading level wrapping each trigger." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables every item." },
  ]),
  keyboard: [
    { keys: "Enter / Space", action: "Toggle the focused section" },
    { keys: "Up / Down", action: "Previous / next trigger" },
    { keys: "Home / End", action: "First / last trigger" },
  ],
  a11y: [
    "Each trigger sits in a heading and carries aria-expanded and aria-controls.",
    "Content is a region labelled by its trigger.",
  ],
  reducedMotion: "Sections open and close without the height animation.",
};

export default item;
