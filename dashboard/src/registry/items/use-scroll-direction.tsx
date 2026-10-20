import { motion } from "motion/react";
import { springs, usePrefersReducedMotion, useScrollDirection, type UseScrollDirectionOptions } from "changelui";
import { useRef } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = { threshold: number; topOffset: number };
const defaults: DemoProps = { threshold: 8, topOffset: 0 };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "threshold", label: "Threshold (px)", min: 0, max: 60, step: 2 },
  { type: "number", prop: "topOffset", label: "Top offset (px)", min: 0, max: 120, step: 10 },
];

const posts = Array.from({ length: 12 }, (_, i) => i);

/** A phone-sized feed: the header shrinks once scrolled, hides going down, returns going up. */
function Feed({ threshold, topOffset }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const direction = useScrollDirection({ container: ref, threshold, topOffset });
  const reduced = usePrefersReducedMotion();
  const transition = reduced ? { duration: 0 } : springs.snappy;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-80 w-64 overflow-hidden rounded-[2rem] border-4 border-pui-foreground/80 bg-pui-background shadow-pui-lg">
        <motion.header
          className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-pui-border bg-pui-surface/85 px-4 backdrop-blur-md"
          animate={{ y: direction === "down" ? "-100%" : "0%", height: direction === "top" ? 56 : 44 }}
          transition={transition}
        >
          <motion.span
            className="font-semibold text-pui-foreground"
            animate={{ scale: direction === "top" ? 1 : 0.9 }}
            transition={transition}
            style={{ originX: 0 }}
          >
            Feed
          </motion.span>
          <span className="size-6 rounded-pui-full bg-pui-primary/80" aria-hidden="true" />
        </motion.header>
        <div
          ref={ref}
          tabIndex={0}
          aria-label="Scrollable feed demo"
          className="h-full overflow-y-auto focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-pui-ring"
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-3 pt-16">
            {posts.map((i) => (
              <li key={i} className="flex gap-2 rounded-pui-md border border-pui-border bg-pui-surface p-2.5">
                <span className="size-8 shrink-0 rounded-pui-full bg-pui-muted" aria-hidden="true" />
                <span className="flex flex-1 flex-col gap-1.5 pt-1" aria-hidden="true">
                  <span className="h-2 w-2/3 rounded-pui-full bg-pui-muted" />
                  <span className="h-2 w-full rounded-pui-full bg-pui-muted/70" />
                </span>
                <span className="sr-only">Post {i + 1}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <span
        aria-live="polite"
        data-state={direction}
        className="rounded-pui-full bg-pui-muted px-3 py-1 font-mono text-xs text-pui-foreground data-[state=down]:bg-pui-primary data-[state=down]:text-pui-primary-foreground"
      >
        direction: {direction}
      </span>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return <Feed {...props} />;
}

function Mini() {
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-pui-muted-foreground" aria-hidden="true">
      <span className="text-lg text-pui-primary">↑</span> up · down <span className="text-lg">↓</span>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const opts = [
      props.threshold !== 8 ? `threshold: ${props.threshold}` : "",
      props.topOffset ? `topOffset: ${props.topOffset}` : "",
    ].filter(Boolean);
    return [
      `const direction = useScrollDirection(${opts.length ? `{ ${opts.join(", ")} }` : ""});`,
      "",
      '<motion.header animate={{ y: direction === "down" ? "-100%" : "0%" }} />;',
    ].join("\n");
  },
  propsTable: [
    ...propDocs<UseScrollDirectionOptions>()([
      { name: "threshold", type: "number", default: "8", description: "px of travel before the direction flips." },
      { name: "topOffset", type: "number", default: "0", description: 'Scroll offset that still counts as "top".' },
      { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll box to watch. Default: the window." },
      { name: "enabled", type: "boolean", default: "true", description: 'false stops listening and returns "top".' },
    ]),
    { name: "returns", type: '"up" | "down" | "top"', description: 'Re-renders only when it changes. "top" on the server.' },
  ],
  a11y: ["Hidden headers must come back on keyboard focus too; scrolling up is not the only way back."],
  reducedMotion: "The demo header hides and shows without sliding.",
};
export default item;
