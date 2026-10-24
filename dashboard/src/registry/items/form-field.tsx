import { Button, FormField, Input, Textarea, type FormFieldProps } from "changelui";
import { useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  validateOn: NonNullable<FormFieldProps["validateOn"]>;
  debounce: number;
  maxLength: number;
  enforceMaxLength: boolean;
};

const defaults: DemoProps = { validateOn: "blur", debounce: 400, maxLength: 120, enforceMaxLength: false };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "validateOn", label: "Validate on", options: ["blur", "change"] },
  { type: "number", prop: "debounce", label: "Async debounce (ms)", min: 0, max: 1500, step: 100 },
  { type: "number", prop: "maxLength", label: "Bio max length", min: 20, max: 300, step: 10 },
  { type: "boolean", prop: "enforceMaxLength", label: "Hard limit" },
];

const TAKEN = new Set(["admin", "ada", "grace", "support", "team"]);

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

const usernameRules = (v: string) =>
  v.length < 3 ? "Use at least 3 characters" : !/^[a-z0-9_]+$/.test(v) ? "Lowercase letters, numbers and _ only" : null;

const checkUsername = async (v: string, { signal }: { signal: AbortSignal }) => {
  await sleep(700, signal);
  return TAKEN.has(v) ? `@${v} is taken. Try @${v}_${(v.length * 7) % 100}` : null;
};

const emailRule = (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : "Enter an email like name@example.com");

function Preview({ props }: { props: DemoProps }) {
  const [sent, setSent] = useState("");
  return (
    <form
      key={props.validateOn}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setSent(`Created @${String(data.get("username"))}`);
      }}
      onReset={() => setSent("")}
      className="flex w-full max-w-sm flex-col gap-3 rounded-pui-xl border border-pui-border bg-pui-surface p-5 shadow-pui-sm"
    >
      <div className="mb-1">
        <h3 className="text-base font-semibold text-pui-foreground">Create your account</h3>
        <p className="text-sm text-pui-muted-foreground">Errors wait until you leave a field.</p>
      </div>
      <FormField
        label="Username"
        name="username"
        hint="Try “ada” to see a taken name"
        required
        validate={usernameRules}
        validateAsync={checkUsername}
        debounce={props.debounce}
        validateOn={props.validateOn}
        successMessage="Available"
      >
        {(control) => <Input {...control} autoComplete="username" spellCheck={false} leadingIcon={<span className="text-sm">@</span>} />}
      </FormField>
      <FormField label="Email" name="email" hint="For receipts and sign-in links" required validate={emailRule} validateOn={props.validateOn}>
        {(control) => <Input {...control} type="email" autoComplete="email" />}
      </FormField>
      <FormField
        label="Bio"
        name="bio"
        optional
        hint="Shown on your profile"
        maxLength={props.maxLength}
        enforceMaxLength={props.enforceMaxLength}
        validateOn={props.validateOn}
        defaultValue="Product designer working on onboarding and growth. I like small details that make forms feel kind."
      >
        {(control) => <Textarea {...control} rows={3} />}
      </FormField>
      <div className="mt-1 flex items-center gap-2">
        <Button type="submit">Create account</Button>
        <Button type="reset" variant="ghost" tone="neutral">
          Reset
        </Button>
        <p role="status" className="ms-auto text-xs font-medium text-pui-success-text">
          {sent}
        </p>
      </div>
    </form>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex w-64 flex-col gap-1.5">
      <span className="text-xs font-medium text-pui-foreground">Username</span>
      <span className="flex h-8 items-center rounded-pui-md border border-pui-danger px-2.5 text-xs text-pui-foreground">ada</span>
      <span className="flex items-center justify-between text-[0.6875rem]">
        <span className="text-pui-danger-text">@ada is taken. Try @ada_21</span>
        <span className="text-pui-muted-foreground">3/20</span>
      </span>
    </div>
  );
}

/** Live rules from the first keystroke, an "action" in the label row, and a server error. */
function PasswordDemo() {
  const [serverError, setServerError] = useState<string | undefined>(undefined);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <FormField
        label="New password"
        validateOn="change"
        hint="12+ characters with a number"
        validate={(v) => (v.length < 12 ? `${12 - v.length} more ${12 - v.length === 1 ? "character" : "characters"}` : !/\d/.test(v) ? "Add a number" : null)}
        successMessage="Strong enough"
        labelAction={
          <button type="button" className="font-medium text-pui-primary-text underline-offset-2 hover:underline" onClick={() => setServerError(serverError ? undefined : "This password appeared in a data breach. Pick another one.")}>
            {serverError ? "Clear server error" : "Simulate server error"}
          </button>
        }
        error={serverError}
      >
        {(control) => <Input {...control} type="password" autoComplete="new-password" />}
      </FormField>
    </div>
  );
}

/** Works with any control that gives a string: here a native select with a placeholder option. */
function SelectDemo() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <FormField label="Team size" hint="Helps us suggest a plan" required requiredMessage="Pick a team size">
        {(control) => (
          <select
            {...control}
            className="h-9 w-full rounded-pui-md border border-pui-input bg-pui-background px-2.5 text-sm text-pui-foreground aria-invalid:border-pui-danger"
          >
            <option value="">Choose…</option>
            <option value="1">Just me</option>
            <option value="2-10">2–10</option>
            <option value="11-50">11–50</option>
            <option value="51+">51+</option>
          </select>
        )}
      </FormField>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<FormField\n  label="Username"\n  hint="Lowercase letters and numbers"\n  required\n  validate={(v) => (v.length < 3 ? "Use at least 3 characters" : null)}\n  validateAsync={async (v, { signal }) => ((await isTaken(v, signal)) ? "That name is taken" : null)}${props.debounce !== 400 ? `\n  debounce={${props.debounce}}` : ""}${props.validateOn !== "blur" ? `\n  validateOn="${props.validateOn}"` : ""}\n  successMessage="Available"\n>\n  {(control) => <Input {...control} />}\n</FormField>\n\n<FormField label="Bio" optional maxLength={${props.maxLength}}${props.enforceMaxLength ? " enforceMaxLength" : ""}>\n  {(control) => <Textarea {...control} rows={3} />}\n</FormField>`,
  propsTable: propDocs<FormFieldProps>()([
    { name: "label", type: "ReactNode", required: true, description: "Visible label, linked to the control." },
    { name: "children", type: "(control) => ReactNode", required: true, description: "Spread control onto any input, textarea or select: id, value, onChange, onBlur, onInvalid, ref and aria wiring." },
    { name: "hint", type: "ReactNode", description: "Help text; messages take its place without moving the layout." },
    { name: "value", type: "string", description: "Controlled value (defaultValue, onValueChange)." },
    { name: "validate", type: "(value) => string | null", description: "Instant rules. A string is the error." },
    { name: "validateAsync", type: "(value, { signal }) => Promise<string | null>", description: "Slow checks after validate passes; debounced while typing and aborted when superseded." },
    { name: "validateOn", type: '"blur" | "change"', default: '"blur"', description: "Blur: quiet until you leave, then live until fixed. Change: live from the first keystroke." },
    { name: "debounce", type: "number", default: "400", description: "ms before validateAsync runs while typing." },
    { name: "required", type: "boolean", default: "false", description: "Required rule and asterisk; requiredMessage sets the text." },
    { name: "maxLength", type: "number", description: "Counter that warns near the limit; over it is an error." },
    { name: "enforceMaxLength", type: "boolean", default: "false", description: "Pass maxLength to the control so it can't be exceeded." },
    { name: "successMessage", type: "ReactNode", description: "Shown after a passing check." },
    { name: "validatingMessage", type: "ReactNode", default: '"Checking…"', description: "Shown while validateAsync runs." },
    { name: "error", type: "ReactNode", description: "Outside error (e.g. from the server), shown at once." },
    { name: "optional", type: "boolean", default: "false", description: 'Adds "(optional)" after the label.' },
    { name: "labelAction", type: "ReactNode", description: "End of the label row, e.g. a link." },
    { name: "onStatusChange", type: "(status, message) => void", description: '"idle" | "validating" | "valid" | "invalid".' },
  ]),
  keyboard: [
    { keys: "Tab", action: "Leaving a field runs its checks" },
    { keys: "Enter (in a form)", action: "Submit is blocked by failing rules; the first invalid field takes focus" },
  ],
  a11y: [
    "The label targets the control; aria-describedby points at the hint and the current message.",
    "Errors set aria-invalid and land in a polite live region; near the limit the counter announces what's left.",
    "Rules feed setCustomValidity, so native form submit is blocked and the first invalid control is focused, with this message instead of the browser bubble.",
    "Validation waits for blur, so screen reader users aren't interrupted mid-word.",
  ],
  reducedMotion: "Messages fade without sliding and the control doesn't shake on a new error.",
  examples: [
    { title: "Live rules, label action and a server error", description: 'validateOn="change" counts down what\'s missing.', Demo: PasswordDemo },
    { title: "Any control", description: "A native select with a required rule. Submit-free: leave it empty and tab away.", Demo: SelectDemo },
  ],
};

export default item;
