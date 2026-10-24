import { AddressInput, Button, Checkbox, type AddressInputProps, type AddressValue } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  country: string;
  size: NonNullable<AddressInputProps["size"]>;
  preview: boolean;
  showErrors: boolean;
};

const defaults: DemoProps = { country: "GB", size: "md", preview: true, showErrors: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "country", label: "Country", options: ["US", "CA", "GB", "IE", "DE", "FR", "ES", "NL", "JP", "IN", "AU", "SG"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "boolean", prop: "preview", label: "Label preview" },
  { type: "boolean", prop: "showErrors", label: "Show all errors" },
];

const SAMPLES: Record<string, Omit<AddressValue, "country">> = {
  US: { line1: "500 Market St", line2: "Suite 300", city: "San Francisco", region: "CA", postalCode: "94105" },
  CA: { line1: "290 Bremner Blvd", line2: "", city: "Toronto", region: "ON", postalCode: "M5V 3L9" },
  GB: { line1: "10 Downing Street", line2: "", city: "London", region: "", postalCode: "SW1A 2AA" },
  IE: { line1: "1 Grand Canal Square", line2: "", city: "Dublin 2", region: "Dublin", postalCode: "D02 P820" },
  DE: { line1: "Unter den Linden 77", line2: "", city: "Berlin", region: "", postalCode: "10117" },
  FR: { line1: "8 Rue de Rivoli", line2: "", city: "Paris", region: "", postalCode: "75004" },
  ES: { line1: "Calle de Alcalá 42, 3º", line2: "", city: "Madrid", region: "Madrid", postalCode: "28014" },
  NL: { line1: "Damrak 1", line2: "", city: "Amsterdam", region: "", postalCode: "1012 LG" },
  JP: { line1: "1-1 Chiyoda", line2: "Room 402", city: "Chiyoda-ku", region: "Tokyo", postalCode: "100-0001" },
  IN: { line1: "Flat 12B, Lotus Towers", line2: "MG Road", city: "Bengaluru", region: "Karnataka", postalCode: "560001" },
  AU: { line1: "1 Macquarie St", line2: "", city: "Sydney", region: "NSW", postalCode: "2000" },
  SG: { line1: "10 Bayfront Ave", line2: "#12-01", city: "", region: "", postalCode: "018956" },
};

const sample = (country: string): AddressValue => ({ country, ...(SAMPLES[country] ?? SAMPLES.US!) });

function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState<AddressValue>(() => ({ country: props.country, line1: "", line2: "", city: "", region: "", postalCode: "" }));
  const [seen, setSeen] = useState(props.country);
  if (seen !== props.country) {
    setSeen(props.country);
    setValue((v) => ({ ...v, country: props.country }));
  }
  return (
    <div className="w-full max-w-lg">
      <AddressInput legend="Shipping address" value={value} onValueChange={setValue} size={props.size} preview={props.preview} showErrors={props.showErrors} section="shipping" />
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-72 origin-top scale-[0.85]">
      <AddressInput defaultValue={sample("JP")} size="sm" preview={false} />
    </div>
  );
}

/** Same address, four countries: fields glide into each country's order and relabel. */
function CountrySwitchDemo() {
  const [value, setValue] = useState<AddressValue>(() => sample("US"));
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div role="group" aria-label="Load a sample address" className="flex flex-wrap gap-1.5">
        {["US", "GB", "DE", "JP", "IN"].map((c) => (
          <Button key={c} size="sm" variant={value.country === c ? "soft" : "outline"} tone={value.country === c ? "primary" : "neutral"} aria-pressed={value.country === c} onClick={() => setValue(sample(c))}>
            {c}
          </Button>
        ))}
      </div>
      <AddressInput value={value} onValueChange={setValue} size="sm" />
    </div>
  );
}

/** Checkout: billing mirrors shipping until unticked; Continue waits for a complete address. */
function CheckoutDemo() {
  const [shipping, setShipping] = useState<AddressValue>(() => ({ ...sample("CA"), postalCode: "M5V" }));
  const [complete, setComplete] = useState(false);
  const [same, setSame] = useState(true);
  const [done, setDone] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground">
      <AddressInput
        legend="Shipping"
        value={shipping}
        onValueChange={(v, d) => {
          setShipping(v);
          setComplete(d.complete);
          setDone(false);
        }}
        section="shipping"
        size="sm"
        preview={false}
        showErrors
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-pui-foreground">
        <Checkbox checked={same} onCheckedChange={(c) => setSame(c === true)} />
        Billing address is the same
      </label>
      {same ? null : <AddressInput legend="Billing" defaultValue={{ country: shipping.country }} section="billing" size="sm" preview={false} />}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-pui-muted-foreground" aria-live="polite">
          {done ? `Saved. Shipping to ${shipping.city || "this address"}.` : complete ? "Ready to continue." : "Finish the postal code to continue."}
        </span>
        <Button size="sm" disabled={!complete} onClick={() => setDone(true)}>
          Continue
        </Button>
      </div>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<AddressInput\n  legend="Shipping address"\n  defaultValue={{ country: "${props.country}" }}\n  section="shipping"${props.size !== "md" ? `\n  size="${props.size}"` : ""}${props.preview ? "" : "\n  preview={false}"}${props.showErrors ? "\n  showErrors" : ""}\n  onValueChange={(address, { complete, formatted }) => save(address)}\n/>`,
  propsTable: propDocs<AddressInputProps>()([
    { name: "value", type: "AddressValue", description: "{ country, line1, line2, city, region, postalCode } (defaultValue, onValueChange)." },
    { name: "onValueChange", type: "(value, { complete, errors, formatted }) => void", description: "Every edit, with completeness, messages and the label text." },
    { name: "countries", type: "string[]", description: "ISO codes offered, in order. Default: all 12 built-in formats." },
    { name: "legend", type: "ReactNode", description: "Visible fieldset legend." },
    { name: "preview", type: "boolean", default: "true", description: "Live mailing-label preview in the country’s order." },
    { name: "section", type: '"shipping" | "billing"', description: "Autocomplete section so browsers fill the right address." },
    { name: "name", type: "string", description: "Form field prefix: name.line1, name.city, name.country, …" },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field height." },
    { name: "showErrors", type: "boolean", default: "false", description: "Show every message now instead of after each field’s blur." },
    { name: "disabled", type: "boolean", default: "false", description: "Disables the fieldset." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Moves through the fields in the country’s visual order" },
    { keys: "Type in Country", action: "Typeahead jumps to a country" },
  ],
  a11y: [
    "A native fieldset with an optional legend; every field has a visible <label>.",
    "Tab order follows the country’s layout (postcode first in Japan, before the city in Germany).",
    "Fields carry autocomplete tokens (address-line1, address-level2, postal-code) with an optional shipping/billing section.",
    "Errors appear after blur, set aria-invalid and are linked with aria-describedby; the postcode example is described even before an error.",
  ],
  reducedMotion: "Fields jump to their new places instead of gliding, and labels and preview lines fade.",
  examples: [
    { title: "Country switch", description: "Fields reorder and relabel; the postcode keeps its local format.", Demo: CountrySwitchDemo },
    { title: "Checkout", description: "Billing mirrors shipping; Continue waits for a complete address.", Demo: CheckoutDemo },
  ],
};

export default item;
