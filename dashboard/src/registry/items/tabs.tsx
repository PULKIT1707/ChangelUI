import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsListProps, type TabsProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  variant: NonNullable<TabsListProps["variant"]>;
  size: NonNullable<TabsListProps["size"]>;
  orientation: NonNullable<TabsProps["orientation"]>;
  activationMode: NonNullable<TabsProps["activationMode"]>;
  fullWidth: boolean;
};

const defaults: DemoProps = {
  variant: "pill",
  size: "md",
  orientation: "horizontal",
  activationMode: "automatic",
  fullWidth: false,
};

const sections = [
  { value: "overview", label: "Overview", body: "A quick summary of the project and its current status." },
  { value: "activity", label: "Activity", body: "Recent commits, reviews and deployments." },
  { value: "settings", label: "Settings", body: "Notifications, access and integrations." },
];

function Preview({ props }: { props: DemoProps }) {
  const { variant, size, fullWidth, ...root } = props;
  return (
    <Tabs defaultValue="overview" {...root} className="w-full max-w-md">
      <TabsList aria-label="Project" variant={variant} size={size} fullWidth={fullWidth}>
        {sections.map((s) => (
          <TabsTrigger key={s.value} value={s.value}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((s) => (
        <TabsContent key={s.value} value={s.value} className="p-1 text-sm text-pui-muted-foreground">
          {s.body}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function Mini() {
  return (
    <Tabs defaultValue="a">
      <TabsList aria-label="Example" size="sm">
        <TabsTrigger value="a">Account</TabsTrigger>
        <TabsTrigger value="b">Billing</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "variant", label: "Variant", options: ["pill", "underline", "enclosed"] },
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "select", prop: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
    { type: "select", prop: "activationMode", label: "Activation", options: ["automatic", "manual"] },
    { type: "boolean", prop: "fullWidth", label: "Full width" },
  ],
  snippet: ({ variant, size, fullWidth, ...root }) =>
    toJsx<Record<string, unknown>>(
      "Tabs",
      { defaultValue: "overview", ...root },
      { orientation: "horizontal", activationMode: "automatic" },
      [
        toJsx<Record<string, unknown>>(
          "TabsList",
          { "aria-label": "Project", variant, size, fullWidth },
          { variant: "pill", size: "md", fullWidth: false },
          sections.map((s) => `<TabsTrigger value="${s.value}">${s.label}</TabsTrigger>`).join("\n"),
        ),
        ...sections.map((s) => `<TabsContent value="${s.value}">…</TabsContent>`),
      ].join("\n"),
    ),
  propsTable: propDocs<TabsProps & TabsListProps>()([
    { name: "value", type: "string", description: "Tabs: controlled active tab." },
    { name: "defaultValue", type: "string", description: "Tabs: uncontrolled initial tab." },
    { name: "onValueChange", type: "(value: string) => void", description: "Tabs: called when the active tab changes." },
    { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Tabs: arrow keys and layout." },
    {
      name: "activationMode",
      type: '"automatic" | "manual"',
      default: '"automatic"',
      description: "Tabs: manual moves focus with arrows and selects on Enter / Space.",
    },
    { name: "variant", type: '"pill" | "underline" | "enclosed"', default: '"pill"', description: "TabsList: indicator style." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "TabsList: trigger size." },
    { name: "fullWidth", type: "boolean", default: "false", description: "TabsList: triggers share the full width." },
    { name: "loop", type: "boolean", default: "true", description: "TabsList: wrap arrow navigation." },
  ]),
  keyboard: [
    { keys: "Left / Right (Up / Down when vertical)", action: "Move to the previous / next tab" },
    { keys: "Home / End", action: "First / last tab" },
    { keys: "Enter / Space", action: "Activate the focused tab (manual mode)" },
  ],
  a11y: [
    "tablist / tab / tabpanel roles with aria-selected, aria-controls and aria-labelledby.",
    "One tab stop: the active tab. Panels are focusable.",
  ],
  reducedMotion: "The indicator jumps and panels appear without the slide.",
};

export default item;
