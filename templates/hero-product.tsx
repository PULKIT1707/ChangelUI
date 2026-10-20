/**
 * Hero: Product. A SaaS hero over a soft aurora: a liquid-morphing keyword in the headline, a
 * tilting product window with a live chart, and three stat cards that count up as they appear.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user"> so Motion honors the OS setting; the library pieces used here
 * already fall back on their own.
 */
import { AuroraBackground } from "changelui/aurora-background";
import { Badge } from "changelui/badge";
import { Button } from "changelui/button";
import { MorphingText } from "changelui/morphing-text";
import { Sparkline } from "changelui/sparkline";
import { StatCard } from "changelui/stat-card";
import { TiltCard } from "changelui/tilt-card";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { motion } from "motion/react";

const REVENUE = [42, 44, 43, 47, 51, 50, 54, 58, 57, 62, 66, 65, 71, 74, 79, 83];
const SIGNUPS = [320, 340, 310, 380, 410, 395, 440, 470, 455, 520, 560, 610];
const CHURN = [3.4, 3.3, 3.1, 3.2, 2.9, 2.8, 2.7, 2.5, 2.6, 2.3, 2.2, 2.1];

const NAV = ["Overview", "Revenue", "Customers", "Experiments", "Reports"];

function ProductWindow() {
  return (
    <div className="overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-xl">
      <div className="flex items-center gap-2 border-b border-pui-border px-4 py-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-pui-full bg-pui-danger/70" />
          <span className="size-2.5 rounded-pui-full bg-pui-warning/70" />
          <span className="size-2.5 rounded-pui-full bg-pui-success/70" />
        </span>
        <span className="mx-auto rounded-pui-md bg-pui-muted px-3 py-0.5 text-[11px] text-pui-muted-foreground">app.pulse.dev/overview</span>
      </div>
      <div className="grid grid-cols-[auto_1fr]">
        <div aria-hidden="true" className="hidden flex-col gap-1 border-e border-pui-border p-3 text-xs @xl:flex">
          {NAV.map((item, i) => (
            <span
              key={item}
              className={
                i === 0
                  ? "rounded-pui-md bg-pui-primary/10 px-2.5 py-1.5 font-medium text-pui-primary-text"
                  : "rounded-pui-md px-2.5 py-1.5 text-pui-muted-foreground"
              }
            >
              {item}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-4 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-pui-muted-foreground">Net revenue · last 16 weeks</p>
              <p className="text-2xl font-semibold tabular-nums">$83,420</p>
            </div>
            <Badge tone="success" variant="soft" dot>
              +18.2%
            </Badge>
          </div>
          <Sparkline data={REVENUE} variant="area" fluid height={120} label="Net revenue" format={{ style: "currency", currency: "USD", maximumFractionDigits: 0, notation: "compact" }} />
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Plans", "1,284"],
              ["Trials", "312"],
              ["NPS", "64"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-pui-md bg-pui-muted/60 px-3 py-2">
                <p className="text-[11px] text-pui-muted-foreground">{label}</p>
                <p className="text-sm font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroProduct() {
  const reduced = usePrefersReducedMotion();
  const enter = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { type: "spring" as const, stiffness: 200, damping: 26, delay },
        };

  return (
    <section className="@container relative isolate overflow-hidden bg-pui-background text-pui-foreground">
      <AuroraBackground intensity="subtle" className="-z-10" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-pui-background to-transparent" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 @3xl:px-8 @3xl:py-24 @5xl:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col items-start gap-6">
          <motion.div {...enter(0)}>
            <Badge tone="primary" variant="outline" size="md" dot pulse>
              Pulse Analytics 3.0
            </Badge>
          </motion.div>
          <motion.h1 {...enter(0.08)} className="text-balance text-4xl font-bold tracking-tight @xl:text-5xl @5xl:text-6xl">
            Your metrics,{" "}
            <MorphingText
              words={["clearer", "faster", "shared", "explained"]}
              align="start"
              className="text-pui-primary-text"
            />
          </motion.h1>
          <motion.p {...enter(0.16)} className="max-w-lg text-pretty text-base text-pui-muted-foreground @xl:text-lg">
            Pulse turns raw events into a dashboard your whole team reads. Ask a question in plain words and get a chart, a
            trend and the reason behind it.
          </motion.p>
          <motion.div {...enter(0.24)} className="flex w-full flex-col gap-3 @md:w-auto @md:flex-row">
            <Button size="lg">Start a free trial</Button>
            <Button size="lg" variant="ghost" tone="neutral">
              Book a demo
            </Button>
          </motion.div>
          <motion.p {...enter(0.32)} className="text-xs text-pui-muted-foreground">
            14-day trial · No credit card · SOC 2 Type II
          </motion.p>
        </div>

        <motion.div {...enter(0.2)} className="min-w-0">
          <TiltCard maxTilt={6} scale={1.01} className="rounded-pui-xl">
            <ProductWindow />
          </TiltCard>
        </motion.div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 @3xl:grid-cols-3 @3xl:px-8 @3xl:pb-24">
        <StatCard
          label="Monthly recurring revenue"
          value={83420}
          format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
          delta={0.182}
          trend={REVENUE}
        />
        <StatCard label="New sign-ups" value={610} delta={0.089} trend={SIGNUPS} trendVariant="bar" />
        <StatCard
          label="Churn"
          value={0.021}
          format={{ style: "percent", maximumFractionDigits: 1 }}
          delta={-0.087}
          invertDelta
          trend={CHURN}
          trendVariant="line"
        />
      </div>
    </section>
  );
}
