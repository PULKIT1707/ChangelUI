/**
 * Hero: Spotlight. The default landing hero: a shimmering announcement pill, a masked word-by-word
 * headline, two calls to action over a grid lit by slow light rays, and a marquee of customer logos.
 *
 * Copy-only template. It is responsive to its container (container queries), so it also works in
 * a narrow column. Wrap your app in <MotionConfig reducedMotion="user"> to let Motion honor the OS
 * setting; every library piece used here already has its own reduced-motion fallback.
 */
import { Avatar, AvatarGroup } from "changelui/avatar";
import { Button } from "changelui/button";
import { GridPattern } from "changelui/grid-pattern";
import { LightRays } from "changelui/light-rays";
import { Marquee } from "changelui/marquee";
import { Rating } from "changelui/rating";
import { ShimmerButton } from "changelui/shimmer-button";
import { SplitText } from "changelui/split-text";
import { TextShimmer } from "changelui/text-shimmer";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { motion } from "motion/react";

const LOGOS = [
  { name: "Northwind", shape: "M4 18 12 4l8 14H4Z" },
  { name: "Lumen", shape: "M12 3a9 9 0 1 0 0 18 6 6 0 1 1 0-18Z" },
  { name: "Quanta", shape: "M5 5h14v14H5z M9 9h6v6H9z" },
  { name: "Helix", shape: "M6 3c0 6 12 6 12 12M6 21c0-6 12-6 12-12" },
  { name: "Orbital", shape: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z M2 12h3m14 0h3" },
  { name: "Vertex", shape: "M3 6h18L12 20 3 6Z" },
  { name: "Nimbus", shape: "M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11 2 3 3 0 0 1 0 6H7Z" },
  { name: "Polaris", shape: "M12 2v20M2 12h20M5 5l14 14M19 5 5 19" },
];

const PEOPLE = ["Ada Park", "Malik Osei", "Rina Sato", "Leo Grant", "Ivy Chen"];

function ArrowRight() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export default function HeroSpotlight() {
  const reduced = usePrefersReducedMotion();
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 12, filter: "blur(6px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { type: "spring" as const, stiffness: 220, damping: 26, delay },
        };

  return (
    <section className="@container relative isolate overflow-hidden bg-pui-background text-pui-foreground">
      <GridPattern cellSize={44} mask="radial" className="-z-10 opacity-70" squares={[[4, 2], [9, 3], [6, 6], [13, 1], [2, 5]]} />
      <LightRays origin="top" rays={7} intensity={0.45} spread={80} className="-z-10" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,color-mix(in_oklab,var(--pui-primary)_18%,transparent),transparent)]"
      />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-5 pb-14 pt-20 text-center @3xl:px-8 @3xl:pb-20 @3xl:pt-28">
        <motion.a
          href="#changelog"
          {...rise(0)}
          className="group inline-flex items-center gap-2 rounded-pui-full border border-pui-border bg-pui-surface/70 py-1 pe-3 ps-1 text-sm shadow-pui-xs backdrop-blur transition-colors hover:border-pui-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
        >
          <span className="rounded-pui-full bg-pui-primary px-2 py-0.5 text-xs font-semibold text-pui-primary-foreground">New</span>
          <TextShimmer className="font-medium">Version 2.0 is out: themes, charts and 60 new blocks</TextShimmer>
          <span className="text-pui-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
            <ArrowRight />
          </span>
        </motion.a>

        <SplitText
          as="h1"
          by="word"
          preset="maskUp"
          trigger="mount"
          delay={0.1}
          className="mt-7 max-w-3xl text-balance text-4xl font-bold tracking-tight @xl:text-5xl @4xl:text-7xl"
        >
          Interfaces that feel alive, shipped in an afternoon
        </SplitText>

        <motion.p {...rise(0.45)} className="mt-6 max-w-xl text-pretty text-base text-pui-muted-foreground @xl:text-lg">
          Accessible React components with motion built in. Copy a file, theme it with tokens, and spend your time on the
          product instead of the plumbing.
        </motion.p>

        <motion.div {...rise(0.6)} className="mt-9 flex w-full flex-col items-stretch gap-3 @md:w-auto @md:flex-row @md:items-center">
          <ShimmerButton size="lg" className="justify-center">
            Start building free
          </ShimmerButton>
          <Button asChild size="lg" variant="outline" tone="neutral">
            <a href="#components">
              Browse components
              <ArrowRight />
            </a>
          </Button>
        </motion.div>

        <motion.div {...rise(0.75)} className="mt-8 flex flex-col items-center gap-3 @md:flex-row">
          <AvatarGroup size="sm" max={5} tooltips={false}>
            {PEOPLE.map((name) => (
              <Avatar key={name} name={name} />
            ))}
          </AvatarGroup>
          <div className="flex flex-col items-center gap-0.5 @md:items-start">
            <Rating readOnly allowHalf value={4.9} size="sm" getLabel={() => "Rated 4.9 out of 5"} />
            <p className="text-xs text-pui-muted-foreground">
              Loved by <span className="font-semibold text-pui-foreground">12,000+</span> developers
            </p>
          </div>
        </motion.div>
      </div>

      <div className="border-t border-pui-border/70 bg-pui-background/60 py-8 backdrop-blur-sm">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.18em] text-pui-muted-foreground">
          Trusted by product teams at
        </p>
        <Marquee duration={36} gap="3rem" className="mx-auto max-w-5xl">
          {LOGOS.map((logo) => (
            <span key={logo.name} className="flex shrink-0 items-center gap-2 text-pui-muted-foreground transition-colors hover:text-pui-foreground">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
                <path d={logo.shape} />
              </svg>
              <span className="text-lg font-semibold tracking-tight">{logo.name}</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
