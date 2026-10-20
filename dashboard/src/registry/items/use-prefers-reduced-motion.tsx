import { MotionConfig, motion } from "motion/react";
import { usePrefersReducedMotion, variants, reducedVariant } from "changelui";
import { useState } from "react";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { simulate: boolean };
const defaults: DemoProps = { simulate: false };
const controls: ControlSpec<DemoProps>[] = [{ type: "boolean", prop: "simulate", label: 'Wrap in MotionConfig reducedMotion="always"' }];

function Demo() {
  const reduced = usePrefersReducedMotion();
  const [run, setRun] = useState(0);
  const card = reduced ? reducedVariant(variants.popIn) : variants.popIn;
  return (
    <div className="flex flex-col items-center gap-5 text-sm">
      <span
        data-state={reduced ? "reduced" : "full"}
        className="rounded-pui-full px-3 py-1 font-medium data-[state=full]:bg-pui-success data-[state=full]:text-pui-success-foreground data-[state=reduced]:bg-pui-warning data-[state=reduced]:text-pui-warning-foreground"
      >
        {reduced ? "reduced motion" : "full motion"}
      </span>
      <div className="relative h-14 w-64 shrink-0 overflow-hidden rounded-pui-full border border-pui-border bg-pui-muted/60" aria-hidden="true">
        {reduced ? (
          <span className="absolute top-1/2 left-1/2 size-10 -translate-1/2 rounded-pui-full bg-pui-primary" />
        ) : (
          <motion.span
            className="absolute top-1/2 left-2 -mt-5 size-10 rounded-pui-full bg-pui-primary shadow-pui-md"
            animate={{ x: [0, 200, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
      <motion.div
        key={run}
        initial="hidden"
        animate="visible"
        variants={card}
        className="rounded-pui-lg border border-pui-border bg-pui-surface px-4 py-3 text-pui-foreground shadow-pui-sm"
      >
        {reduced ? "Faded in: no scale, no bounce" : "Popped in with a spring"}
      </motion.div>
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="rounded-pui-md border border-pui-border px-3 py-1.5 text-xs font-medium text-pui-foreground hover:bg-pui-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
      >
        Replay entrance
      </button>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return props.simulate ? (
    <MotionConfig reducedMotion="always">
      <Demo />
    </MotionConfig>
  ) : (
    <Demo />
  );
}

function Mini() {
  const reduced = usePrefersReducedMotion();
  return <span className="font-mono text-xs text-pui-muted-foreground">reduced: {String(reduced)}</span>;
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: () =>
    [
      'import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";',
      'import { reducedVariant, variants } from "changelui/motion-presets";',
      "",
      "const reduced = usePrefersReducedMotion();",
      "<motion.div variants={reduced ? reducedVariant(variants.popIn) : variants.popIn} />;",
    ].join("\n"),
  propsTable: [
    {
      name: "returns",
      type: "boolean",
      description:
        'true under <MotionConfig reducedMotion="always"> or when the OS asks for reduced motion. false on the server and during hydration, then follows live OS changes.',
    },
  ],
  a11y: ["Honors prefers-reduced-motion (WCAG 2.3.3) without a provider; MotionConfig can force it on for a subtree."],
  reducedMotion: "The demo stops its loop and swaps the pop for a 150ms fade.",
};
export default item;
