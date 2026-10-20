import {
  Button,
  CopyButton,
  Input,
  PasswordInput,
  estimatePasswordStrength,
  type PasswordInputProps,
  type PasswordRule,
} from "changelui";
import { useId, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  size: NonNullable<PasswordInputProps["size"]>;
  showToggle: boolean;
  strength: boolean;
  rules: boolean;
  capsLockWarning: boolean;
  invalid: boolean;
  disabled: boolean;
};

const defaults: DemoProps = {
  size: "md",
  showToggle: true,
  strength: true,
  rules: true,
  capsLockWarning: true,
  invalid: false,
  disabled: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "boolean", prop: "showToggle", label: "Reveal toggle" },
  { type: "boolean", prop: "strength", label: "Strength meter" },
  { type: "boolean", prop: "rules", label: "Rules checklist" },
  { type: "boolean", prop: "capsLockWarning", label: "Caps Lock hint" },
  { type: "boolean", prop: "invalid", label: "Invalid" },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

const rules: PasswordRule[] = [
  { label: "At least 10 characters", test: (v) => v.length >= 10 },
  { label: "Upper and lower case", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: "A number", test: (v) => /\d/.test(v) },
  { label: "A symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function Preview({ props }: { props: DemoProps }) {
  const id = useId();
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        Password
      </label>
      <PasswordInput
        id={id}
        autoComplete="new-password"
        placeholder="Create a password"
        size={props.size}
        showToggle={props.showToggle}
        strength={props.strength}
        rules={props.rules ? rules : undefined}
        capsLockWarning={props.capsLockWarning}
        invalid={props.invalid}
        disabled={props.disabled}
      />
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-56">
      <PasswordInput aria-label="Password" defaultValue="Moonlit-Harbor-42" strength tabIndex={-1} />
    </div>
  );
}

/** Sign-up: email + password with rules and strength, a confirm field that checks the match live. */
function SignUpDemo() {
  const ids = { email: useId(), pw: useId(), confirm: useId() };
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const strong = estimatePasswordStrength(pw) >= 3 && rules.every((r) => r.test(pw));
  const matches = confirm !== "" && confirm === pw;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setDone(true);
      }}
      className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground"
    >
      <div>
        <p className="m-0 text-base font-semibold">Create your account</p>
        <p className="m-0 mt-1 text-sm text-pui-muted-foreground">Start your 14-day trial. No card needed.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.email} className="text-sm font-medium">
          Email
        </label>
        <Input id={ids.email} type="email" autoComplete="email" defaultValue="sam@example.com" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.pw} className="text-sm font-medium">
          Password
        </label>
        <PasswordInput id={ids.pw} autoComplete="new-password" value={pw} onValueChange={setPw} strength rules={rules} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.confirm} className="text-sm font-medium">
          Confirm password
        </label>
        <PasswordInput
          id={ids.confirm}
          autoComplete="new-password"
          value={confirm}
          onValueChange={setConfirm}
          invalid={confirm !== "" && !pw.startsWith(confirm)}
          aria-describedby={`${ids.confirm}-hint`}
        />
        <p id={`${ids.confirm}-hint`} aria-live="polite" className={`m-0 h-4 text-xs ${matches ? "text-pui-success-text" : "text-pui-muted-foreground"}`}>
          {confirm === "" ? "" : matches ? "Passwords match" : pw.startsWith(confirm) ? "Keep going…" : "Doesn’t match yet"}
        </p>
      </div>
      <Button type="submit" disabled={!strong || !matches}>
        {done ? "Account created" : "Create account"}
      </Button>
    </form>
  );
}

const WORDS = ["amber", "cobalt", "harbor", "lunar", "maple", "nimbus", "orbit", "pixel", "quartz", "river", "solar", "tidal", "velvet", "willow", "zephyr"];

function generate(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)] ?? "orbit";
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  return `${cap(pick())}-${pick()}-${cap(pick())}-${Math.floor(10 + Math.random() * 90)}`;
}

/** Generate a passphrase: fills the field, reveals it, and lets you copy it. */
function GenerateDemo() {
  const id = useId();
  const [pw, setPw] = useState("Lunar-maple-Orbit-27");
  const [visible, setVisible] = useState(true);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        New password
      </label>
      <div className="flex items-start gap-2">
        <PasswordInput
          id={id}
          autoComplete="new-password"
          value={pw}
          onValueChange={setPw}
          visible={visible}
          onVisibleChange={setVisible}
          strength
          className="font-mono"
        />
        <CopyButton value={pw} variant="outline" label="Copy password" />
      </div>
      <Button
        size="sm"
        variant="soft"
        className="self-start"
        onClick={() => {
          setPw(generate());
          setVisible(true);
        }}
      >
        Generate passphrase
      </Button>
    </div>
  );
}

const passphraseLabels = ["Add words", "One word", "Two words", "Three words", "Passphrase"] as const;

/** Custom strength: count words for a passphrase policy, custom labels, no toggle. */
function PassphraseDemo() {
  const id = useId();
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        Vault passphrase
      </label>
      <PasswordInput
        id={id}
        autoComplete="new-password"
        defaultVisible
        placeholder="four random words"
        strength={(v) => Math.min(4, v.trim().split(/[\s-]+/).filter((w) => w.length >= 3).length)}
        strengthLabels={passphraseLabels}
      />
      <p className="m-0 text-xs text-pui-muted-foreground">strength receives the value and returns 0–4.</p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ['id="password"', 'autoComplete="new-password"'];
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (!props.showToggle) attrs.push("showToggle={false}");
    if (props.strength) attrs.push("strength");
    if (props.rules) attrs.push("rules={rules}");
    if (!props.capsLockWarning) attrs.push("capsLockWarning={false}");
    if (props.invalid) attrs.push("invalid");
    if (props.disabled) attrs.push("disabled");
    const rulesCode = props.rules
      ? `const rules = [
  { label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { label: "A number", test: (v: string) => /\\d/.test(v) },
];

`
      : "";
    return `${rulesCode}<label htmlFor="password">Password</label>
<PasswordInput
  ${attrs.join("\n  ")}
/>`;
  },
  propsTable: propDocs<PasswordInputProps>()([
    { name: "value", type: "string", description: "The password (defaultValue, onValueChange); onChange still fires." },
    { name: "showToggle", type: "boolean", default: "true", description: "Reveal toggle with the blinking eye." },
    { name: "visible", type: "boolean", description: "Shown as text (defaultVisible, onVisibleChange)." },
    { name: "strength", type: "boolean | (value) => number", description: "true: built-in estimate; or your own 0–4 score." },
    { name: "strengthLabels", type: "[string × 5]", default: '["Too weak", …, "Strong"]', description: "Names for scores 0–4." },
    { name: "rules", type: "{ label, test }[]", description: "Checklist that ticks off as you type." },
    { name: "capsLockWarning", type: "boolean", default: "true", description: "Caps pill while focused with Caps Lock on." },
    { name: "toggleLabel", type: "string", default: '"Show password"', description: "Name of the pressed toggle." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Field height." },
    { name: "invalid", type: "boolean", default: "false", description: "aria-invalid + danger boundary." },
    { name: "wrapperClassName", type: "string", description: "Classes for the wrapper; className goes to the input." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Move from the field to the reveal toggle" },
    { keys: "Space / Enter (toggle)", action: "Show or hide the password" },
  ],
  a11y: [
    "The reveal button is a toggle: a fixed name (“Show password”) with aria-pressed.",
    "The meter is role=meter with the strength name as aria-valuetext; meter and rules are linked via aria-describedby.",
    "Rules carry a hidden “met / not met” suffix and a polite summary announces progress; the Caps Lock hint is announced too.",
    "estimatePasswordStrength is a UX hint; always validate on the server.",
  ],
  reducedMotion: "No blink, slash draw or segment fill motion; states switch instantly.",
  examples: [
    { title: "Sign-up form", description: "Rules + strength, live confirm match, submit gated on both.", Demo: SignUpDemo, wide: true },
    { title: "Generate", description: "Controlled visible, a passphrase generator and CopyButton.", Demo: GenerateDemo },
    { title: "Passphrase policy", description: "Custom strength function and labels.", Demo: PassphraseDemo },
  ],
};

export default item;
