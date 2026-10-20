import { Textarea, type TextareaProps } from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = {
  autoResize: boolean;
  minRows: number;
  maxRows: number;
  showCount: boolean;
  maxLength: number;
  invalid: boolean;
};

const defaults: DemoProps = { autoResize: true, minRows: 3, maxRows: 8, showCount: true, maxLength: 200, invalid: false };

function Preview({ props }: { props: DemoProps }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-1.5 text-sm">
      <label htmlFor="demo-bio" className="font-medium">
        Bio
      </label>
      <Textarea id="demo-bio" placeholder="Tell us about yourself" {...props} />
    </div>
  );
}

function Mini() {
  return <Textarea aria-label="Comment" minRows={2} placeholder="Comment" className="w-44" />;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "boolean", prop: "autoResize", label: "Auto-resize" },
    { type: "number", prop: "minRows", label: "Min rows", min: 1, max: 6, step: 1 },
    { type: "number", prop: "maxRows", label: "Max rows", min: 4, max: 12, step: 1 },
    { type: "boolean", prop: "showCount", label: "Show count" },
    { type: "number", prop: "maxLength", label: "Max length", min: 50, max: 500, step: 50 },
    { type: "boolean", prop: "invalid", label: "Invalid" },
  ],
  snippet: (props) =>
    toJsx<Record<string, unknown>>(
      "Textarea",
      { id: "bio", ...props },
      { autoResize: false, minRows: 3, showCount: false, invalid: false },
    ),
  propsTable: propDocs<TextareaProps>()([
    { name: "invalid", type: "boolean", default: "false", description: "aria-invalid and a danger boundary." },
    { name: "autoResize", type: "boolean", default: "false", description: "Grow with content between minRows and maxRows." },
    { name: "minRows", type: "number", default: "3", description: "Minimum height in rows." },
    { name: "maxRows", type: "number", description: "Maximum height in rows (scrolls beyond)." },
    { name: "showCount", type: "boolean", default: "false", description: "Counter linked via aria-describedby; needs maxLength." },
    { name: "wrapperClassName", type: "string", description: "Wrapper classes (wrapper renders only with showCount)." },
  ]),
  a11y: ["ref and className go to the native <textarea>.", "The counter is referenced by aria-describedby."],
};

export default item;
