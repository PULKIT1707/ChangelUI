/**
 * Pricing toggle. A monthly / yearly switch with a savings badge, prices that roll digit by digit
 * when you toggle, plan cards that double as a radio group (arrow keys move between them), a beam
 * around the popular plan and a summary bar that follows the choice.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user"> so Motion honors the OS setting; the library pieces used here
 * already fall back on their own.
 */
import { Badge } from "changelui/badge";
import { BorderBeam } from "changelui/border-beam";
import { Button } from "changelui/button";
import { RadioGroup, RadioGroupItem } from "changelui/radio-group";
import { RollingNumber } from "changelui/rolling-number";
import { SegmentedControl, SegmentedControlItem } from "changelui/segmented-control";
import { springs } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { motion } from "motion/react";
import { useId, useState } from "react";

type Billing = "monthly" | "yearly";

interface Plan {
  id: string;
  name: string;
  blurb: string;
  monthly: number;
  yearly: number;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    blurb: "For side projects and trying things out.",
    monthly: 0,
    yearly: 0,
    features: ["3 projects", "10k events / month", "Community support", "7-day history"],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For growing products that need answers fast.",
    monthly: 24,
    yearly: 19,
    features: ["Unlimited projects", "2M events / month", "Email support", "1-year history", "Custom dashboards"],
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    blurb: "For teams that share, review and ship together.",
    monthly: 59,
    yearly: 47,
    features: ["Everything in Pro", "10M events / month", "SSO and audit log", "Unlimited history", "Priority support"],
  },
];

const USD = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-pui-primary-text" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

export default function PricingToggle() {
  const [billing, setBilling] = useState<Billing>("yearly");
  const [selected, setSelected] = useState("pro");
  const reduced = usePrefersReducedMotion();
  const id = useId();
  const plan = PLANS.find((p) => p.id === selected) ?? PLANS[1]!;
  const price = (p: Plan) => (billing === "yearly" ? p.yearly : p.monthly);

  return (
    <section className="@container bg-pui-background px-5 py-16 text-pui-foreground @3xl:px-8 @3xl:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 id={`${id}-title`} className="text-balance text-3xl font-bold tracking-tight @xl:text-4xl">
            Simple pricing that scales with you
          </h2>
          <p className="mt-3 text-pretty text-pui-muted-foreground">Start free. Upgrade when your traffic does. Cancel any time.</p>
          <div className="mt-8 flex items-center gap-3">
            <SegmentedControl aria-label="Billing period" value={billing} onValueChange={(v) => setBilling(v as Billing)}>
              <SegmentedControlItem value="monthly">Monthly</SegmentedControlItem>
              <SegmentedControlItem value="yearly">Yearly</SegmentedControlItem>
            </SegmentedControl>
            <motion.span
              animate={billing === "yearly" ? { opacity: 1, scale: 1 } : { opacity: 0.5, scale: 0.94 }}
              transition={reduced ? { duration: 0 } : springs.bouncy}
            >
              <Badge tone="success" variant="soft" size="md">
                Save 20%
              </Badge>
            </motion.span>
          </div>
        </div>

        <RadioGroup
          aria-labelledby={`${id}-title`}
          value={selected}
          onValueChange={setSelected}
          orientation="horizontal"
          name="plan"
          className="mt-12 grid gap-4 @3xl:grid-cols-3 @3xl:items-stretch"
        >
          {PLANS.map((p) => {
            const active = p.id === selected;
            const itemId = `${id}-${p.id}`;
            return (
              <label
                key={p.id}
                htmlFor={itemId}
                className={
                  "relative flex cursor-pointer flex-col gap-5 rounded-pui-xl border bg-pui-surface p-6 text-pui-surface-foreground transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pui-ring motion-reduce:transition-none " +
                  (p.popular ? "border-pui-primary/40 shadow-pui-lg" : "border-pui-border shadow-pui-xs")
                }
              >
                {active ? (
                  <motion.span
                    layoutId={`${id}-ring`}
                    aria-hidden="true"
                    transition={reduced ? { duration: 0 } : springs.snappy}
                    className="pointer-events-none absolute -inset-px rounded-[inherit] border-2 border-pui-primary"
                  />
                ) : null}
                {p.popular ? <BorderBeam duration={8} beamSize={120} /> : null}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{p.name}</span>
                      {p.popular ? (
                        <Badge tone="primary" variant="solid" size="sm">
                          Popular
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-pui-muted-foreground">{p.blurb}</p>
                  </div>
                  <RadioGroupItem id={itemId} value={p.id} aria-label={`${p.name} plan`} />
                </div>

                <div className="flex items-baseline gap-1.5">
                  <RollingNumber value={price(p)} format={USD} className="text-4xl font-bold tracking-tight tabular-nums" />
                  <span className="text-sm text-pui-muted-foreground">/ month</span>
                </div>
                <p className="-mt-3 min-h-5 text-xs text-pui-muted-foreground">
                  {p.monthly === 0 ? "Free forever" : billing === "yearly" ? `Billed $${p.yearly * 12} yearly` : "Billed monthly"}
                </p>

                <ul className="flex flex-col gap-2.5 border-t border-pui-border pt-5 text-sm">
                  {p.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check />
                      {feature}
                    </li>
                  ))}
                </ul>
              </label>
            );
          })}
        </RadioGroup>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-pui-xl border border-pui-border bg-pui-muted/50 p-4 @xl:flex-row @xl:ps-6">
          <p className="text-sm" aria-live="polite">
            <span className="font-semibold">{plan.name}</span>
            <span className="text-pui-muted-foreground">
              {" · "}
              {price(plan) === 0 ? "free" : `$${price(plan)} per month, billed ${billing}`}
            </span>
          </p>
          <Button size="lg" className="w-full @xl:w-auto">
            {plan.monthly === 0 ? "Get started free" : `Continue with ${plan.name}`}
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-pui-muted-foreground">Prices in USD, before tax. Need more than 10M events? Talk to us.</p>
      </div>
    </section>
  );
}
