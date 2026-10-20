/**
 * CTA banner. The closing call to action: a drifting gradient mesh panel (a highlight blob follows
 * the pointer), a headline that rises word by word, a confetti button that celebrates the click,
 * social proof and a quiet secondary action. A slim announcement strip variant sits below.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user"> so Motion honors the OS setting; the library pieces used here
 * already fall back on their own (the mesh holds still, confetti is skipped).
 */
import { Avatar, AvatarGroup } from "changelui/avatar";
import { Badge } from "changelui/badge";
import { Button } from "changelui/button";
import { ConfettiButton } from "changelui/confetti";
import { GradientMesh } from "changelui/gradient-mesh";
import { NoiseOverlay } from "changelui/noise-overlay";
import { SplitText } from "changelui/split-text";
import { springs } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const PEOPLE = ["Noor Haddad", "Tomas Reyes", "Mei Lin", "Owen Brooks", "Zara Ali"];

function ArrowRight() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function Sparkle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
      <path d="M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8l5.1-1.4Z" />
    </svg>
  );
}

export default function CtaBanner() {
  const reduced = usePrefersReducedMotion();
  const [claimed, setClaimed] = useState(false);

  return (
    <section className="@container bg-pui-background px-5 py-16 text-pui-foreground @3xl:px-8 @3xl:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="relative isolate overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface shadow-pui-lg">
          <GradientMesh followPointer blur={70} speed={0.8} className="-z-20" />
          {/* A scrim keeps body text at full contrast in every preset; the mesh still glows through. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-pui-background/40 via-pui-background/65 to-pui-background/85" />
          <NoiseOverlay opacity={0.06} className="-z-10" />

          <div className="flex flex-col items-center gap-6 px-6 py-14 text-center @3xl:px-16 @3xl:py-20">
            <Badge tone="primary" variant="soft" size="md" className="gap-1.5">
              <Sparkle />
              Launch week: 3 months of Pro free
            </Badge>
            <SplitText as="h2" by="word" preset="maskUp" className="max-w-3xl text-balance text-4xl font-bold tracking-tight @3xl:text-6xl">
              Ship the dashboard your team keeps open all day
            </SplitText>
            <p className="max-w-xl text-pretty text-base text-pui-muted-foreground @3xl:text-lg">
              Connect a data source, drop in a template and share a live link before lunch. No credit card, no setup call.
            </p>

            <div className="flex w-full flex-col items-center justify-center gap-3 @md:w-auto @md:flex-row">
              <ConfettiButton
                size="lg"
                className="w-full @md:w-auto"
                trailingIcon={claimed ? undefined : <ArrowRight />}
                onClick={() => setClaimed(true)}
                options={{ count: 120, spread: 80, startVelocity: 38 }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={claimed ? "claimed" : "claim"}
                    initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                    transition={reduced ? { duration: 0.15 } : springs.snappy}
                  >
                    {claimed ? "Offer claimed" : "Claim the offer"}
                  </motion.span>
                </AnimatePresence>
              </ConfettiButton>
              <Button size="lg" variant="outline" className="w-full bg-pui-surface/60 @md:w-auto">
                Book a 15 min demo
              </Button>
            </div>
            <p className="sr-only" aria-live="polite">
              {claimed ? "Offer claimed. Check your inbox for the code." : ""}
            </p>

            <div className="flex flex-col items-center gap-3 @md:flex-row">
              <AvatarGroup size="sm" max={5}>
                {PEOPLE.map((name) => (
                  <Avatar key={name} name={name} />
                ))}
              </AvatarGroup>
              <p className="text-sm text-pui-muted-foreground">
                <span className="font-semibold text-pui-foreground">12,400+ teams</span> switched this year
              </p>
            </div>
          </div>
        </div>

        {/* Compact strip: same message for page footers and in-app upsells. */}
        <div className="relative isolate flex flex-col items-start gap-4 overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface p-5 @xl:flex-row @xl:items-center @xl:justify-between @xl:p-6">
          <GradientMesh animate={false} blobs={4} seed={7} className="-z-20 opacity-60" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-pui-surface/75" />
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-pui-lg bg-pui-primary text-pui-primary-foreground shadow-pui-md">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
              </svg>
            </span>
            <div>
              <p className="font-semibold">Need SSO, audit logs or a custom contract?</p>
              <p className="text-sm text-pui-muted-foreground">Talk to the team behind the product. Replies in under a day.</p>
            </div>
          </div>
          <Button variant="soft" className="shrink-0" trailingIcon={<ArrowRight />}>
            Contact sales
          </Button>
        </div>
      </div>
    </section>
  );
}
