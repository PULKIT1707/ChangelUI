/**
 * Waitlist. A pre-launch signup: the email field and button morph into a "you're in" pill with
 * your place in line, confetti bursts from it, the counter ticks up, and a live feed of recent
 * signups slides in beside it. A referral link lets people move up the list.
 *
 * Copy-only template. It is responsive to its container (container queries). Swap `join()` for
 * your API. Wrap your app in <MotionConfig reducedMotion="user">; confetti is skipped and the feed
 * stops moving under reduced motion.
 */
import { Avatar } from "changelui/avatar";
import { Badge } from "changelui/badge";
import { Button } from "changelui/button";
import { confetti } from "changelui/confetti";
import { CopyButton } from "changelui/copy-button";
import { DotPattern } from "changelui/dot-pattern";
import { Input } from "changelui/input";
import { AnimatedList } from "changelui/animated-list";
import { NumberTicker } from "changelui/number-ticker";
import { springs } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

interface Signup {
  id: number;
  name: string;
  city: string;
  ago: string;
}

const NAMES = ["Amara Nwosu", "Jonas Berg", "Priya Raman", "Luca Moretti", "Hana Kato", "Diego Alvarez", "Sofia Lind", "Kai Thompson", "Leila Haddad", "Mateo Cruz", "Elif Demir", "Noah Fischer"];
const CITIES = ["Lagos", "Oslo", "Chennai", "Turin", "Osaka", "Bogotá", "Malmö", "Austin", "Beirut", "Lima", "Izmir", "Leipzig"];
const BASE_COUNT = 4_812;

const makeSignup = (n: number): Signup => ({
  id: n,
  name: NAMES[n % NAMES.length]!,
  city: CITIES[(n * 5) % CITIES.length]!,
  ago: "just now",
});

/** Stand-in for a network request. */
const join = () => new Promise<void>((resolve) => setTimeout(resolve, 1100));

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="m3 6 7 5 7-5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

export default function Waitlist() {
  const reduced = usePrefersReducedMotion();
  const id = useId();
  const pillRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "joined">("idle");
  const [count, setCount] = useState(BASE_COUNT);
  const [place, setPlace] = useState(0);
  const [feed, setFeed] = useState<Signup[]>(() =>
    [3, 2, 1, 0].map((n) => ({ ...makeSignup(n), ago: `${(4 - n) * 2} min ago` })),
  );
  const next = useRef(4);

  // A new signup every few seconds while the tab is visible (the feed holds still under reduced motion).
  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      const signup = makeSignup(next.current++);
      setFeed((items) => [signup, ...items].slice(0, 5));
      setCount((c) => c + 1);
    }, 2800);
    return () => clearInterval(timer);
  }, [reduced]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("That email doesn't look right");
      return;
    }
    setError(null);
    setState("loading");
    await join();
    setPlace(count + 1);
    setCount((c) => c + 1);
    setFeed((items) => [{ id: -1, name: "You", city: "Right here", ago: "just now" }, ...items].slice(0, 5));
    setState("joined");
  };

  // Celebrate once the pill has landed.
  useEffect(() => {
    if (state !== "joined" || !pillRef.current) return;
    const timer = setTimeout(() => {
      void confetti({ origin: pillRef.current, count: 90, spread: 70, startVelocity: 30 });
    }, 180);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <section className="@container relative isolate overflow-hidden bg-pui-background px-5 py-16 text-pui-foreground @3xl:px-8 @3xl:py-24">
      <DotPattern mask="radial" className="-z-10" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 @4xl:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col items-start gap-6">
          <Badge tone="warning" variant="soft" size="md" dot pulse>
            Private beta · opening in waves
          </Badge>
          <h2 className="text-balance text-4xl font-bold tracking-tight @3xl:text-5xl">
            Your inbox, sorted before you open it.
          </h2>
          <p className="max-w-lg text-pretty text-lg text-pui-muted-foreground">
            Halcyon reads the noise so you don't have to. Join the waitlist and we'll send your invite as soon as a seat opens.
          </p>

          <div className="w-full max-w-md">
            <AnimatePresence mode="popLayout" initial={false}>
              {state === "joined" ? (
                <motion.div
                  key="joined"
                  ref={pillRef}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={reduced ? { duration: 0.15 } : springs.bouncy}
                  role="status"
                  className="flex flex-col gap-3 rounded-pui-xl border border-pui-success/40 bg-pui-success/10 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-pui-full bg-pui-success text-pui-success-foreground">
                      <CheckIcon />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">You're on the list</p>
                      <p className="truncate text-sm text-pui-muted-foreground">
                        You're <span className="font-semibold tabular-nums text-pui-foreground">#{place.toLocaleString("en-US")}</span> in line. Share to move up.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-pui-md border border-pui-border bg-pui-surface ps-3">
                    <code className="min-w-0 flex-1 truncate font-pui-mono text-xs text-pui-muted-foreground">example.com/join?ref=h4lc-{place}</code>
                    <CopyButton value={`https://example.com/join?ref=h4lc-${place}`} label="Copy referral link" size="sm" variant="ghost" />
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  noValidate
                  onSubmit={submit}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(4px)" }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-2"
                >
                  <label htmlFor={`${id}-email`} className="sr-only">
                    Email address
                  </label>
                  <div className="flex flex-col gap-2 @md:flex-row">
                    <Input
                      id={`${id}-email`}
                      type="email"
                      size="lg"
                      autoComplete="email"
                      placeholder="you@example.com"
                      leadingIcon={<MailIcon />}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      invalid={error !== null}
                      aria-describedby={error ? `${id}-error` : undefined}
                      disabled={state === "loading"}
                      wrapperClassName="flex-1"
                    />
                    <Button type="submit" size="lg" loading={state === "loading"} loadingText="Joining…">
                      Join the waitlist
                    </Button>
                  </div>
                  <p id={`${id}-error`} className="min-h-4 text-xs text-pui-danger-text" aria-live="polite">
                    {error ?? ""}
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <p className="text-sm text-pui-muted-foreground">
            <NumberTicker value={count} from={BASE_COUNT - 400} className="font-semibold tabular-nums text-pui-foreground" /> people are already waiting. No spam,
            one email when you're in.
          </p>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[2rem] bg-linear-to-br from-pui-gradient-1/20 via-pui-gradient-2/10 to-transparent blur-2xl" />
          <div className="rounded-pui-xl border border-pui-border bg-pui-surface/90 p-4 shadow-pui-lg backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm font-semibold">Recent signups</p>
              <span className="flex items-center gap-1.5 text-xs text-pui-muted-foreground">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-pui-success motion-safe:animate-pulse" />
                Live
              </span>
            </div>
            <AnimatedList label="Recent signups" max={5} className="flex min-h-[19rem] flex-col gap-2">
              {feed.map((signup) => (
                <div key={signup.id} className="flex items-center gap-3 rounded-pui-lg border border-pui-border bg-pui-background px-3 py-2.5">
                  <Avatar name={signup.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{signup.name === "You" ? "You joined" : `${signup.name.split(" ")[0]} joined`}</p>
                    <p className="truncate text-xs text-pui-muted-foreground">{signup.city}</p>
                  </div>
                  <span className="shrink-0 text-xs text-pui-muted-foreground">{signup.ago}</span>
                </div>
              ))}
            </AnimatedList>
          </div>
        </div>
      </div>
    </section>
  );
}
