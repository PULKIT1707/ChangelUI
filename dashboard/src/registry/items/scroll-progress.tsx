import { Button, ScrollProgress, type ScrollProgressProps } from "changelui";
import { useEffect, useRef } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  position: NonNullable<ScrollProgressProps["position"]>;
  thickness: number;
  spring: boolean;
};

const defaults: DemoProps = { position: "top", thickness: 3, spring: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "position", label: "Position", options: ["top", "bottom"] },
  { type: "number", prop: "thickness", label: "Thickness (px)", min: 1, max: 8, step: 1 },
  { type: "boolean", prop: "spring", label: "Spring" },
];

const paragraphs = Array.from({ length: 8 }, (_, i) => i);

/** The demo tracks its own scroll box, so it never covers the dashboard. */
function ScrollBox({ props, height }: { props: DemoProps; height: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`relative w-full max-w-md overflow-y-auto rounded-pui-lg border border-pui-border bg-pui-surface ${height}`}
    >
      <ScrollProgress {...props} container={ref} fixed={false} />
      <div className="space-y-3 p-4 text-sm text-pui-muted-foreground">
        {paragraphs.map((i) => (
          <p key={i} className="m-0">
            Scroll this box to fill the bar. Paragraph {i + 1} of {paragraphs.length}.
          </p>
        ))}
        {/* A focusable control keeps the scroll box keyboard reachable. */}
        <Button size="sm" variant="outline" tone="neutral" onClick={() => ref.current?.scrollTo({ top: 0 })}>
          Back to top
        </Button>
      </div>
    </div>
  );
}

function Preview({ props }: { props: DemoProps }) {
  return <ScrollBox props={props} height="h-56" />;
}

function Mini() {
  const ref = useRef<HTMLDivElement>(null);
  // Auto-scroll the tiny box back and forth so the bar fills without interaction.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let direction = 1;
    const id = window.setInterval(() => {
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      if (el.scrollTop >= max) direction = -1;
      else if (el.scrollTop <= 0) direction = 1;
      el.scrollTop += direction * 2;
    }, 30);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div ref={ref} className="relative h-20 w-36 overflow-hidden rounded-pui-md border border-pui-border bg-pui-surface">
      <ScrollProgress container={ref} fixed={false} />
      <div className="space-y-1 p-2">
        {paragraphs.map((i) => (
          <div key={i} className="h-2 rounded-pui-sm bg-pui-muted" />
        ))}
      </div>
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => toJsx("ScrollProgress", props, defaults, undefined, controls),
  propsTable: propDocs<ScrollProgressProps>()([
    { name: "container", type: "RefObject<HTMLElement | null>", description: "Scroll container; default the window." },
    { name: "position", type: '"top" | "bottom"', default: '"top"', description: "Edge to attach to." },
    { name: "thickness", type: "number", default: "3", description: "Bar height in px." },
    { name: "fixed", type: "boolean", default: "true", description: "Fixed to the viewport, or sticky inside the container." },
    { name: "spring", type: "boolean", default: "true", description: "Smooth the bar with a spring." },
  ]),
  a11y: ["Decorative and aria-hidden; it mirrors the native scroll position."],
  reducedMotion: "Follows the scroll position without spring smoothing.",
};

export default item;
