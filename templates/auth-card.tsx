/**
 * Auth card. A two-step sign-in / sign-up flow in one card: email and password (with a strength
 * meter and rules when creating an account), passkey and SSO options under an "or" divider, then a
 * six-digit email code that shakes on a wrong guess and fills green on success. The card's height
 * springs between steps and each step slides in from the direction you are going.
 *
 * Copy-only template. It is responsive to its container (container queries). Swap the fake
 * `wait()` calls for your auth API. Wrap your app in <MotionConfig reducedMotion="user">.
 */
import { Button } from "changelui/button";
import { Card } from "changelui/card";
import { Checkbox } from "changelui/checkbox";
import { Input } from "changelui/input";
import { OtpInput, type OtpInputStatus } from "changelui/otp-input";
import { PasswordInput, type PasswordRule } from "changelui/password-input";
import { SegmentedControl, SegmentedControlItem } from "changelui/segmented-control";
import { Separator } from "changelui/separator";
import { springs } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useState, type FormEvent } from "react";

type Mode = "sign-in" | "sign-up";
type Step = "credentials" | "verify" | "done";

const ORDER: Step[] = ["credentials", "verify", "done"];

const RULES: PasswordRule[] = [
  { label: "At least 10 characters", test: (value) => value.length >= 10 },
  { label: "A number", test: (value) => /\d/.test(value) },
  { label: "Upper and lower case", test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
];

/** Stand-in for a network request. */
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="m3 6 7 5 7-5" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="10" r="3.5" />
      <path d="M10.5 10H17m-2.5 0v2.5M17 10v2" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 17V4.5A1.5 1.5 0 0 1 5.5 3h6A1.5 1.5 0 0 1 13 4.5V17M13 8h2.5A1.5 1.5 0 0 1 17 9.5V17M2.5 17h15M7 6.5h3M7 9.5h3M7 12.5h3" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 8H3m4-4L3 8l4 4" />
    </svg>
  );
}

function DoneMark() {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.span
      initial={reduced ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springs.bouncy}
      className="grid size-16 place-items-center rounded-pui-full bg-pui-success/15 text-pui-success-text"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="m5 12.5 4.5 4.5L19 7.5" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }} />
      </svg>
    </motion.span>
  );
}

export default function AuthCard() {
  const reduced = usePrefersReducedMotion();
  const id = useId();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [step, setStep] = useState<Step>("credentials");
  const [direction, setDirection] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<OtpInputStatus>("idle");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const go = (next: Step) => {
    setDirection(ORDER.indexOf(next) >= ORDER.indexOf(step) ? 1 : -1);
    setStep(next);
  };

  const submitCredentials = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter an email like you@company.com");
      return;
    }
    setEmailError(null);
    setBusy(true);
    await wait(900);
    setBusy(false);
    setCode("");
    setCodeStatus("idle");
    setResendIn(30);
    go("verify");
  };

  const verify = async (value: string) => {
    setBusy(true);
    await wait(700);
    setBusy(false);
    // Demo rule: every code works except 000000.
    if (value === "000000") {
      setCodeStatus("error");
      return;
    }
    setCodeStatus("success");
    await wait(reduced ? 200 : 650);
    go("done");
  };

  const reset = () => {
    setPassword("");
    setCode("");
    setCodeStatus("idle");
    go("credentials");
  };

  const slide = {
    enter: (dir: number) => (reduced ? { opacity: 0 } : { opacity: 0, x: dir * 40, filter: "blur(4px)" }),
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (dir: number) => (reduced ? { opacity: 0 } : { opacity: 0, x: dir * -40, filter: "blur(4px)" }),
  };

  return (
    <section className="@container relative isolate overflow-hidden bg-pui-background px-5 py-16 text-pui-foreground @3xl:py-24">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-80 bg-radial-[at_50%_0%] from-pui-primary/15 to-transparent to-70%" />
      <div className="mx-auto w-full max-w-md">
        <Card variant="elevated" className="overflow-hidden p-0">
          <motion.div layout={!reduced} transition={springs.layout} className="relative">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={reduced ? { duration: 0.15 } : springs.layout}
                className="flex flex-col gap-6 p-6 @md:p-8"
              >
                {step === "credentials" ? (
                  <>
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span aria-hidden="true" className="mb-1 grid size-11 place-items-center rounded-pui-lg bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3 text-pui-primary-foreground shadow-pui-md">
                        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                          <path d="M4 15c3-6 13-6 16 0M8 15c1.5-2.5 6.5-2.5 8 0" />
                        </svg>
                      </span>
                      <h2 className="text-2xl font-bold tracking-tight">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h2>
                      <p className="text-sm text-pui-muted-foreground">
                        {mode === "sign-in" ? "Sign in to pick up where you left off." : "Free for 14 days. No card needed."}
                      </p>
                    </div>

                    <SegmentedControl aria-label="Account" value={mode} onValueChange={(v) => setMode(v as Mode)} fullWidth>
                      <SegmentedControlItem value="sign-in">Sign in</SegmentedControlItem>
                      <SegmentedControlItem value="sign-up">Create account</SegmentedControlItem>
                    </SegmentedControl>

                    <div className="grid gap-2 @sm:grid-cols-2">
                      <Button variant="outline" tone="neutral" leadingIcon={<KeyIcon />}>
                        Passkey
                      </Button>
                      <Button variant="outline" tone="neutral" leadingIcon={<BuildingIcon />}>
                        Single sign-on
                      </Button>
                    </div>

                    <Separator label="or continue with email" />

                    <form noValidate onSubmit={submitCredentials} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`${id}-email`} className="text-sm font-medium">
                          Work email
                        </label>
                        <Input
                          id={`${id}-email`}
                          type="email"
                          autoComplete="email"
                          placeholder="you@company.com"
                          leadingIcon={<MailIcon />}
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          invalid={emailError !== null}
                          aria-describedby={emailError ? `${id}-email-error` : undefined}
                        />
                        {emailError ? (
                          <p id={`${id}-email-error`} className="text-xs text-pui-danger-text">
                            {emailError}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor={`${id}-password`} className="text-sm font-medium">
                            Password
                          </label>
                          {mode === "sign-in" ? (
                            <a href="#" onClick={(event) => event.preventDefault()} className="rounded-pui-sm text-xs font-medium text-pui-primary-text no-underline hover:underline focus-visible:outline-2 focus-visible:outline-pui-ring">
                              Forgot password?
                            </a>
                          ) : null}
                        </div>
                        <PasswordInput
                          id={`${id}-password`}
                          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                          value={password}
                          onValueChange={setPassword}
                          strength={mode === "sign-up"}
                          rules={mode === "sign-up" ? RULES : undefined}
                        />
                      </div>
                      {mode === "sign-in" ? (
                        <div className="flex items-center gap-2">
                          <Checkbox id={`${id}-remember`} defaultChecked />
                          <label htmlFor={`${id}-remember`} className="cursor-pointer text-sm text-pui-muted-foreground">
                            Keep me signed in for 30 days
                          </label>
                        </div>
                      ) : null}
                      <Button type="submit" size="lg" loading={busy} loadingText="Sending code…" fullWidth>
                        {mode === "sign-in" ? "Continue" : "Create account"}
                      </Button>
                    </form>
                  </>
                ) : null}

                {step === "verify" ? (
                  <>
                    <button
                      type="button"
                      onClick={reset}
                      className="flex w-fit cursor-pointer items-center gap-1.5 rounded-pui-md text-sm text-pui-muted-foreground hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-pui-ring"
                    >
                      <BackIcon />
                      Back
                    </button>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-2xl font-bold tracking-tight">Check your inbox</h2>
                      <p className="text-sm text-pui-muted-foreground">
                        We sent a 6-digit code to <span className="font-medium text-pui-foreground">{email}</span>. It expires in 10 minutes.
                      </p>
                    </div>
                    <OtpInput
                      length={6}
                      groupSize={3}
                      autoFocus
                      label="Verification code"
                      value={code}
                      onValueChange={(value) => {
                        setCode(value);
                        if (codeStatus === "error") setCodeStatus("idle");
                      }}
                      onComplete={(value) => void verify(value)}
                      status={codeStatus}
                      disabled={busy || codeStatus === "success"}
                      className="self-center"
                    />
                    <p className="min-h-5 text-center text-sm" aria-live="polite">
                      {codeStatus === "error" ? (
                        <span className="text-pui-danger-text">That code didn't match. Try again.</span>
                      ) : busy ? (
                        <span className="text-pui-muted-foreground">Checking…</span>
                      ) : codeStatus === "success" ? (
                        <span className="text-pui-success-text">Verified</span>
                      ) : (
                        <span className="text-pui-muted-foreground">Demo: any code works except 000000.</span>
                      )}
                    </p>
                    <div className="flex items-center justify-center gap-1 text-sm text-pui-muted-foreground">
                      Didn't get it?
                      <Button variant="link" size="sm" disabled={resendIn > 0} onClick={() => setResendIn(30)}>
                        {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                      </Button>
                    </div>
                  </>
                ) : null}

                {step === "done" ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <DoneMark />
                    <div className="flex flex-col gap-1">
                      <h2 className="text-2xl font-bold tracking-tight">{mode === "sign-in" ? "You're signed in" : "Account created"}</h2>
                      <p className="text-sm text-pui-muted-foreground">Redirecting you to your workspace…</p>
                    </div>
                    <Button variant="outline" tone="neutral" onClick={reset}>
                      Start over
                    </Button>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </Card>
        <p className="mt-6 text-center text-xs text-pui-muted-foreground">
          By continuing you agree to the{" "}
          <a href="#" onClick={(event) => event.preventDefault()} className="text-pui-foreground underline underline-offset-2">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" onClick={(event) => event.preventDefault()} className="text-pui-foreground underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </section>
  );
}
