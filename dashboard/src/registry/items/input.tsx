import { Input, type InputProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<InputProps["size"]>;
  invalid: boolean;
  disabled: boolean;
  icon: boolean;
  placeholder: string;
};

const defaults: DemoProps = { size: "md", invalid: false, disabled: false, icon: true, placeholder: "Search components" };

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Preview({ props }: { props: DemoProps }) {
  const { icon, ...rest } = props;
  return (
    <div className="flex w-full max-w-sm flex-col gap-1.5 text-sm">
      <label htmlFor="demo-input" className="font-medium">
        Search
      </label>
      <Input id="demo-input" {...rest} leadingIcon={icon ? <SearchIcon /> : undefined} />
      {props.invalid ? <span className="text-xs text-pui-danger-text">Enter at least 3 characters.</span> : null}
    </div>
  );
}

function Mini() {
  return <Input aria-label="Email" placeholder="you@example.com" className="w-44" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
    { type: "boolean", prop: "invalid", label: "Invalid" },
    { type: "boolean", prop: "disabled", label: "Disabled" },
    { type: "boolean", prop: "icon", label: "Leading icon" },
    { type: "text", prop: "placeholder", label: "Placeholder", maxLength: 40 },
  ],
  snippet: ({ icon, ...props }) =>
    toJsx<Record<string, unknown>>(
      "Input",
      { id: "search", ...props },
      { size: "md", invalid: false, disabled: false },
    ).replace("<Input", icon ? "<Input leadingIcon={<SearchIcon />}" : "<Input"),
  propsTable: propDocs<InputProps>()([
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "32 / 36 / 44 px high." },
    { name: "invalid", type: "boolean", default: "false", description: "aria-invalid and a danger boundary." },
    { name: "leadingIcon", type: "ReactNode", description: "Decorative icon at the start." },
    { name: "trailingIcon", type: "ReactNode", description: "Decorative icon at the end." },
    { name: "wrapperClassName", type: "string", description: "Wrapper classes (wrapper renders only with an icon)." },
  ]),
  a11y: ["ref and className go to the native <input>.", "Label it with <label htmlFor> or aria-label."],
};

export default item;
