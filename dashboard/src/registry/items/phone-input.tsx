import { Button, PhoneInput, type PhoneInputDetails, type PhoneInputProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  defaultCountry: string;
  size: NonNullable<PhoneInputProps["size"]>;
  preferred: boolean;
  invalid: boolean;
};
const defaults: DemoProps = { defaultCountry: "US", size: "md", preferred: true, invalid: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "defaultCountry", label: "Default country", options: ["US", "GB", "DE", "FR", "IN", "JP", "BR", "AU"] },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "boolean", prop: "preferred", label: "Suggested countries" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
];
const PREFERRED = ["US", "GB", "IN"];
function Readout({ value, details }: { value: string; details: PhoneInputDetails | null }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-pui-lg border border-pui-border bg-pui-surface px-3 py-2.5 text-xs text-pui-surface-foreground">
      <dt className="text-pui-muted-foreground">E.164 value</dt>
      <dd className="m-0 font-mono tabular-nums">{value || "—"}</dd>
      <dt className="text-pui-muted-foreground">Country</dt>
      <dd className="m-0">{details ? `${details.country.name} (+${details.country.dial})` : "—"}</dd>
      <dt className="text-pui-muted-foreground">Complete</dt>
      <dd className={details?.valid ? "m-0 font-medium text-pui-success-text" : "m-0 text-pui-muted-foreground"}>{details?.valid ? "Yes" : "Not yet"}</dd>
    </dl>
  );
}
function Preview({ props }: { props: DemoProps }) {
  const [value, setValue] = useState("");
  const [details, setDetails] = useState<PhoneInputDetails | null>(null);
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label htmlFor="phone-preview" className="text-sm font-medium text-pui-foreground">
        Mobile number
      </label>
      <PhoneInput
        key={props.defaultCountry}
        id="phone-preview"
        defaultCountry={props.defaultCountry}
        preferredCountries={props.preferred ? PREFERRED : undefined}
        size={props.size}
        invalid={props.invalid}
        onValueChange={(next, d) => {
          setValue(next);
          setDetails(d);
        }}
        aria-describedby="phone-preview-hint"
      />
      <p id="phone-preview-hint" className="m-0 text-xs text-pui-muted-foreground">
        Type or paste any format: “+44 7911 123456”, “0044…” or a local number.
      </p>
      <div className="mt-2">
        <Readout value={value} details={details} />
      </div>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <PhoneInput aria-label="Phone" defaultValue="+14155550132" size="sm" />
    </div>
  );
}
const SAMPLES = [
  { label: "London", value: "+447911123456" },
  { label: "Mumbai", value: "+919876543210" },
  { label: "Tokyo", value: "+819012345678" },
  { label: "São Paulo", value: "+5511987654321" },
];
/** Controlled value from a CRM record: the country follows the number. */
function ControlledDemo() {
  const [value, setValue] = useState(SAMPLES[0]?.value ?? "");
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Load a contact">
        {SAMPLES.map((s) => (
          <Button key={s.label} size="sm" variant={value === s.value ? "soft" : "outline"} tone="neutral" onClick={() => setValue(s.value)}>
            {s.label}
          </Button>
        ))}
      </div>
      <PhoneInput aria-label="Contact phone" value={value} onValueChange={(next) => setValue(next)} />
      <p className="m-0 font-mono text-xs text-pui-muted-foreground">value = {JSON.stringify(value)}</p>
    </div>
  );
}
/** Two-step sign-up form that submits E.164 through a hidden input. */
function SignupDemo() {
  const [sent, setSent] = useState<string | null>(null);
  const [valid, setValid] = useState(false);
  return (
    <form
      className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(String(new FormData(event.currentTarget).get("phone") ?? ""));
      }}
    >
      <div>
        <h3 className="m-0 text-sm font-semibold">Turn on two-step sign-in</h3>
        <p className="m-0 text-xs text-pui-muted-foreground">We’ll text a 6-digit code to this number.</p>
      </div>
      <PhoneInput aria-label="Phone for codes" name="phone" defaultCountry="GB" preferredCountries={["GB", "IE", "FR", "DE"]} onValueChange={(_, d) => setValid(d.valid)} />
      <Button type="submit" disabled={!valid}>
        Send code
      </Button>
      <p role="status" className="m-0 min-h-4 text-xs text-pui-muted-foreground">
        {sent ? `Code sent to ${sent}` : ""}
      </p>
    </form>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<PhoneInput\n  aria-label="Mobile number"\n  defaultCountry="${props.defaultCountry}"${props.preferred ? `\n  preferredCountries={["US", "GB", "IN"]}` : ""}${props.size !== "md" ? `\n  size="${props.size}"` : ""}${props.invalid ? "\n  invalid" : ""}\n  onValueChange={(e164, { valid }) => save(e164, valid)}\n/>`,
  propsTable: propDocs<PhoneInputProps>()([
    { name: "value", type: "string", description: "Controlled E.164 value, e.g. \"+447911123456\" (\"\" when empty)." },
    { name: "defaultValue", type: "string", description: "Initial E.164 value." },
    { name: "onValueChange", type: "(value: string, details: PhoneInputDetails) => void", description: "E.164 value plus { country, digits, formatted, valid }." },
    { name: "defaultCountry", type: "string", default: '"US"', description: "ISO code used until the user picks or pastes another." },
    { name: "onCountryChange", type: "(country: PhoneCountry) => void", description: "Called when the country changes (picked or detected)." },
    { name: "countries", type: "(string | PhoneCountry)[]", description: "ISO codes or custom records to offer, in order. Default: about 30 countries." },
    { name: "preferredCountries", type: "string[]", description: "ISO codes listed first under Suggested." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field height." },
    { name: "invalid", type: "boolean", default: "false", description: "Danger border and aria-invalid." },
    { name: "name", type: "string", description: "Adds a hidden input with the E.164 value for forms." },
    { name: "countryLabel", type: "string", default: '"Country calling code"', description: "Accessible name of the country picker." },
    { name: "wrapperClassName", type: "string", description: "Classes for the root group (className goes there too)." },
  ]),
  keyboard: [
    { keys: "Type / paste +…", action: "Detects the country from the calling code" },
    { keys: "Backspace", action: "Deletes the digit before a separator" },
    { keys: "Letters (picker)", action: "Jump to a country by name" },
  ],
  a11y: [
    "The country picker is a select-only combobox whose name includes the current country and code.",
    "The number field is type=tel with tel autocomplete; detected country changes are announced in a polite status.",
    "The completion check is decorative; validity is reported through onValueChange so the form can describe it.",
  ],
  reducedMotion: "The country picker doesn’t pulse on detection and the check fades in without the spring.",
  examples: [
    { title: "Controlled", description: "Load numbers from records; the country follows the calling code.", Demo: ControlledDemo },
    { title: "Two-step sign-in", description: "Submit stays off until the number is complete; the form posts E.164.", Demo: SignupDemo },
  ],
};
export default item;
