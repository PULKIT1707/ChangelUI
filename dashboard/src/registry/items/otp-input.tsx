import { Button, OtpInput, Spinner, Switch, type OtpInputProps, type OtpInputStatus } from "changelui";
import { useEffect, useId, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  length: number;
  pattern: NonNullable<OtpInputProps["pattern"]>;
  groupSize: number;
  size: NonNullable<OtpInputProps["size"]>;
  status: OtpInputStatus;
  mask: boolean;
  placeholder: string;
  disabled: boolean;
};

const defaults: DemoProps = {
  length: 6,
  pattern: "digits",
  groupSize: 3,
  size: "md",
  status: "idle",
  mask: false,
  placeholder: "",
  disabled: false,
};

const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "length", label: "Length", min: 3, max: 8, step: 1 },
  { type: "select", prop: "pattern", label: "Pattern", options: ["digits", "alnum", "alpha"] },
  { type: "number", prop: "groupSize", label: "Group size (0 = none)", min: 0, max: 4, step: 1 },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md", "lg"] },
  { type: "select", prop: "status", label: "Status", options: ["idle", "success", "error"] },
  { type: "boolean", prop: "mask", label: "Mask" },
  { type: "text", prop: "placeholder", label: "Placeholder", maxLength: 1 },
  { type: "boolean", prop: "disabled", label: "Disabled" },
];

function Preview({ props }: { props: DemoProps }) {
  const id = useId();
  const [value, setValue] = useState("");
  const [completed, setCompleted] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        Enter the code
      </label>
      <OtpInput
        key={`${props.length}-${props.pattern}`}
        inputProps={{ id }}
        length={props.length}
        pattern={props.pattern}
        groupSize={props.groupSize || undefined}
        size={props.size}
        status={props.status}
        mask={props.mask}
        placeholder={props.placeholder || undefined}
        disabled={props.disabled}
        onValueChange={setValue}
        onComplete={setCompleted}
      />
      <p className="m-0 text-xs text-pui-muted-foreground">Type, paste “Your code is 123-456”, or let the browser autofill it.</p>
      <p className="m-0 font-mono text-xs text-pui-muted-foreground" aria-live="polite">
        value: “{value}”{completed ? ` · onComplete(“${completed}”)` : ""}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <OtpInput size="sm" defaultValue="4821" groupSize={3} inputProps={{ tabIndex: -1 }} />
    </div>
  );
}

const CORRECT = "424242";

/** The full flow: verify on complete with a spinner, shake on a wrong code, success fill, resend timer. */
function VerifyDemo() {
  const id = useId();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<OtpInputStatus | "checking">("idle");
  const [seconds, setSeconds] = useState(30);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const verify = (value: string) => {
    setStatus("checking");
    timer.current = setTimeout(() => setStatus(value === CORRECT ? "success" : "error"), 700);
  };
  const shown: OtpInputStatus = status === "checking" ? "idle" : status;
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-6 text-center text-pui-surface-foreground">
      <span aria-hidden="true" className="grid size-11 place-items-center rounded-pui-full bg-pui-primary/12 text-pui-primary-text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </span>
      <div>
        <p className="m-0 text-base font-semibold">Check your inbox</p>
        <p className="m-0 mt-1 text-sm text-pui-muted-foreground">
          We sent a code to <span className="font-medium text-pui-foreground">sam@example.com</span>. Try {CORRECT}.
        </p>
      </div>
      <label htmlFor={id} className="sr-only">
        Verification code
      </label>
      <OtpInput
        inputProps={{ id, readOnly: status === "checking" || status === "success" }}
        value={code}
        onValueChange={(v) => {
          setCode(v);
          if (status === "error") setStatus("idle");
        }}
        onComplete={verify}
        status={shown}
        groupSize={3}
      />
      <div className="flex h-5 items-center gap-2 text-sm" aria-live="polite">
        {status === "checking" ? (
          <>
            <Spinner size="sm" decorative /> <span className="text-pui-muted-foreground">Checking…</span>
          </>
        ) : status === "error" ? (
          <span className="text-pui-danger-text">That code didn’t match. Try again.</span>
        ) : status === "success" ? (
          <span className="font-medium text-pui-success-text">Verified. Welcome aboard.</span>
        ) : (
          <span className="text-pui-muted-foreground">The code expires in 10 minutes.</span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={seconds > 0}
          onClick={() => {
            setSeconds(30);
            setCode("");
            setStatus("idle");
          }}
        >
          {seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
        </Button>
        {status === "success" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCode("");
              setStatus("idle");
            }}
          >
            Start over
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Recovery codes: letters and digits, grouped in fours, uppercase as you type, reveal switch. */
function BackupDemo() {
  const id = useId();
  const [masked, setMasked] = useState(true);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3">
      <label htmlFor={id} className="text-sm font-medium text-pui-foreground">
        Recovery code
      </label>
      <OtpInput inputProps={{ id }} length={8} pattern="alnum" groupSize={4} size="sm" mask={masked} placeholder="·" />
      <label className="flex items-center gap-2 text-xs text-pui-muted-foreground">
        <Switch size="sm" checked={masked} onCheckedChange={setMasked} aria-label="Mask the code" /> Mask
      </label>
    </div>
  );
}

/** Lock screen PIN: four masked large boxes, auto-clears after a wrong PIN. */
function PinDemo() {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<OtpInputStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-4 rounded-pui-xl bg-pui-foreground p-6 text-pui-background">
      <span aria-hidden="true" className="text-2xl">🔒</span>
      <p className="m-0 text-sm font-medium">Enter PIN (it’s 1234)</p>
      <OtpInput
        label="PIN"
        length={4}
        size="lg"
        mask
        value={pin}
        status={status}
        onValueChange={(v) => {
          setPin(v);
          setStatus("idle");
        }}
        onComplete={(v) => {
          const ok = v === "1234";
          setStatus(ok ? "success" : "error");
          if (!ok) {
            timer.current = setTimeout(() => {
              setPin("");
              setStatus("idle");
            }, 700);
          }
        }}
      />
      <p className="m-0 h-4 text-xs opacity-70" aria-live="polite">
        {status === "success" ? "Unlocked" : status === "error" ? "Wrong PIN" : ""}
      </p>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["value={code}", "onValueChange={setCode}", "onComplete={verify}"];
    if (props.length !== 6) attrs.push(`length={${props.length}}`);
    if (props.pattern !== "digits") attrs.push(`pattern="${props.pattern}"`);
    if (props.groupSize) attrs.push(`groupSize={${props.groupSize}}`);
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    if (props.mask) attrs.push("mask");
    if (props.placeholder) attrs.push(`placeholder="${props.placeholder}"`);
    if (props.status !== "idle") attrs.push(`status="${props.status}"`);
    else attrs.push("status={status} // \"idle\" | \"success\" | \"error\"");
    if (props.disabled) attrs.push("disabled");
    return `const [code, setCode] = useState("");

<OtpInput
  ${attrs.join("\n  ")}
/>`;
  },
  propsTable: propDocs<OtpInputProps>()([
    { name: "length", type: "number", default: "6", description: "Number of boxes." },
    { name: "value", type: "string", description: "The code (defaultValue, onValueChange)." },
    { name: "onComplete", type: "(code) => void", description: "Fires when the last box fills (typed, pasted or autofilled)." },
    { name: "pattern", type: '"digits" | "alnum" | "alpha"', default: '"digits"', description: "Allowed characters; others are dropped." },
    { name: "uppercase", type: "boolean", default: "true", description: "Uppercase letters (alnum / alpha)." },
    { name: "status", type: '"idle" | "success" | "error"', default: '"idle"', description: "Error shakes and tints; success fills in sequence." },
    { name: "mask", type: "boolean", default: "false", description: "Dots instead of characters." },
    { name: "groupSize", type: "number", description: "Gap after every N boxes." },
    { name: "placeholder", type: "string", description: "Shown in empty boxes." },
    { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Box size." },
    { name: "label", type: "string", default: '"Verification code"', description: "Accessible name (or use inputProps.id with a <label>)." },
    { name: "name", type: "string", description: "Form field name; reset restores defaultValue." },
    { name: "inputProps", type: "InputHTMLAttributes", description: "For the real input: id, aria-describedby, autoFocus, ..." },
  ]),
  keyboard: [
    { keys: "Type / paste", action: "Fill the boxes (pasted text is filtered, so “123-456” works)" },
    { keys: "Backspace", action: "Clear the last box" },
    { keys: "Escape", action: "Clear the code" },
  ],
  a11y: [
    "One real input with autocomplete=one-time-code and inputmode=numeric, so SMS autofill and password managers work.",
    "The boxes are aria-hidden; screen readers hear a single labelled text field with its value.",
    "status=\"error\" sets aria-invalid; pair it with a visible message in a live region.",
  ],
  reducedMotion: "No pop, ring slide, caret blink or shake; boxes change color only.",
  examples: [
    { title: "Verify email", description: "onComplete → checking → error shake or success fill, with a resend timer.", Demo: VerifyDemo, wide: true },
    { title: "Recovery code", description: 'pattern="alnum", groupSize={4}, mask toggle.', Demo: BackupDemo },
    { title: "PIN pad", description: "Masked large boxes on an inverted surface.", Demo: PinDemo },
  ],
};

export default item;
