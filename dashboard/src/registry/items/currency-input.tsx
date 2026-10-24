import { CurrencyInput, type CurrencyInputProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  currency: string;
  locale: string;
  size: NonNullable<CurrencyInputProps["size"]>;
  shorthand: boolean;
  showCode: boolean;
  allowNegative: boolean;
};
const defaults: DemoProps = { currency: "USD", locale: "en-US", size: "md", shorthand: true, showCode: true, allowNegative: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "currency", label: "Currency", options: ["USD", "EUR", "GBP", "JPY", "INR", "CHF"] },
  { type: "select", prop: "locale", label: "Locale", options: ["en-US", "en-GB", "de-DE", "fr-FR", "ja-JP", "en-IN"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "boolean", prop: "shorthand", label: "Shorthand (2.5k)" },
  { type: "boolean", prop: "showCode", label: "Currency code" },
  { type: "boolean", prop: "allowNegative", label: "Allow negative" },
];
function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState<number | null>(12500);
  const [minor, setMinor] = useState<number | null>(1250000);
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label htmlFor="money-preview" className="text-sm font-medium text-pui-foreground">
        Campaign budget
      </label>
      <CurrencyInput
        id="money-preview"
        value={value}
        onValueChange={(next, d) => {
          setValue(next);
          setMinor(d.minor);
        }}
        currency={props.currency}
        locale={props.locale}
        size={props.size}
        shorthand={props.shorthand}
        showCode={props.showCode}
        allowNegative={props.allowNegative}
        aria-describedby="money-preview-hint"
      />
      <p id="money-preview-hint" className="m-0 text-xs text-pui-muted-foreground">
        Try “2.5k”, “1.2m”, a comma or a dot for cents, or ↑/↓ to step.
      </p>
      <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2.5 text-xs text-pui-surface-foreground">
        <dt className="text-pui-muted-foreground">value</dt>
        <dd className="m-0 font-mono tabular-nums">{value === null ? "null" : value}</dd>
        <dt className="text-pui-muted-foreground">minor units</dt>
        <dd className="m-0 font-mono tabular-nums">{minor === null ? "null" : minor}</dd>
      </dl>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-56">
      <CurrencyInput aria-label="Amount" defaultValue={2499.5} size="sm" />
    </div>
  );
}
/** Refund with a hard ceiling: amounts over the charge clamp on blur, with a nudge. */
function RefundDemo() {
  const [amount, setAmount] = useState<number | null>(null);
  const charged = 249;
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold">Refund order #4821</h3>
        <span className="text-xs tabular-nums text-pui-muted-foreground">Charged $249.00</span>
      </div>
      <CurrencyInput aria-label="Refund amount" value={amount} onValueChange={setAmount} min={0} max={charged} placeholder="0.00" />
      <div className="flex gap-1.5">
        {[25, 50, 100].map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => setAmount(Math.round(charged * pct) / 100)}
            className="h-7 cursor-pointer rounded-pui-md border border-pui-border bg-transparent px-2.5 text-xs text-pui-foreground hover:bg-pui-muted"
          >
            {pct}%
          </button>
        ))}
      </div>
      <p className="m-0 text-xs text-pui-muted-foreground">Type more than the charge and leave the field: it settles at the maximum.</p>
    </div>
  );
}
const LOCALES: { locale: string; currency: string; label: string }[] = [
  { locale: "en-US", currency: "USD", label: "United States" },
  { locale: "de-DE", currency: "EUR", label: "Germany" },
  { locale: "fr-CH", currency: "CHF", label: "Switzerland" },
  { locale: "ja-JP", currency: "JPY", label: "Japan" },
];
/** One amount, four locales: symbol side, separators and decimals follow each one. */
function LocalesDemo() {
  const [value, setValue] = useState<number | null>(1234567.89);
  return (
    <div className="mx-auto grid w-full max-w-md gap-2.5">
      {LOCALES.map((l) => (
        <div key={l.locale} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
          <span className="text-xs text-pui-muted-foreground">{l.label}</span>
          <CurrencyInput aria-label={`Amount in ${l.currency}`} value={value} onValueChange={setValue} locale={l.locale} currency={l.currency} size="sm" />
        </div>
      ))}
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<CurrencyInput\n  aria-label="Budget"\n  currency="${props.currency}"\n  locale="${props.locale}"${props.size !== "md" ? `\n  size="${props.size}"` : ""}${props.shorthand ? "" : "\n  shorthand={false}"}${props.showCode ? "" : "\n  showCode={false}"}${props.allowNegative ? "\n  allowNegative" : ""}\n  onValueChange={(amount, { minor }) => setCents(minor)}\n/>`,
  propsTable: propDocs<CurrencyInputProps>()([
    { name: "value", type: "number | null", description: "Controlled amount in major units (12.5 = $12.50)." },
    { name: "defaultValue", type: "number | null", default: "null", description: "Initial amount." },
    { name: "onValueChange", type: "(value: number | null, details) => void", description: "Amount plus { minor, formatted }; minor is integer cents." },
    { name: "currency", type: "string", default: '"USD"', description: "ISO 4217 code: symbol, code and decimals." },
    { name: "locale", type: "string", description: "Formatting locale: symbol side and separators. Default: the user’s." },
    { name: "min", type: "number", description: "Clamped on blur with a nudge and an announcement." },
    { name: "max", type: "number", description: "Clamped on blur with a nudge and an announcement." },
    { name: "step", type: "number", default: "1", description: "Arrow key step; Shift steps ten times as far." },
    { name: "decimals", type: "number", description: "Fraction digits. Default: the currency’s (0 for JPY)." },
    { name: "allowNegative", type: "boolean", default: "false", description: "Accept a leading minus." },
    { name: "shorthand", type: "boolean", default: "true", description: "Expand k, m and b as they are typed." },
    { name: "showCode", type: "boolean", default: "true", description: "Show the ISO code after the amount." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field height." },
    { name: "invalid", type: "boolean", default: "false", description: "Danger border and aria-invalid." },
    { name: "name", type: "string", description: "Adds a hidden input with the amount for forms." },
  ]),
  keyboard: [
    { keys: ". or ,", action: "Start the fraction (either mark works)" },
    { keys: "k / m / b", action: "Multiply by a thousand, million or billion" },
    { keys: "↑ / ↓", action: "Step by step (Shift ×10)" },
    { keys: "Backspace", action: "Deletes the digit before a group separator" },
  ],
  a11y: [
    "A native text input with inputMode=decimal, so phones show a number pad and screen readers read the formatted amount.",
    "The symbol and code are aria-hidden; name the field with a label that includes the currency if it matters.",
    "Shorthand expansion and min/max clamping are announced in a polite status.",
  ],
  reducedMotion: "The shorthand pill fades instead of springing and clamping doesn’t shake the field.",
  examples: [
    { title: "Refund with a ceiling", description: "min/max clamp on blur, with a nudge and a spoken note.", Demo: RefundDemo },
    { title: "Locales", description: "One shared value, four locale formats.", Demo: LocalesDemo },
  ],
};
export default item;
