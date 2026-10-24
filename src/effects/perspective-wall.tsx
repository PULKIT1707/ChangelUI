"use client";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface PerspectiveWallProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tiles, in reading order. They are dealt round-robin into the columns. */
  items: readonly React.ReactNode[];
  /** Default 4. */
  columns?: number;
  /** Seconds for one loop of the first column; later columns drift a little slower. Default 36. */
  duration?: number;
  /** Tilt back, degrees. Default 38. */
  tiltX?: number;
  /** Turn, degrees (negative leans left). Default -22. */
  tiltZ?: number;
  /** CSS height of the wall. Default "30rem". */
  height?: string;
  /** CSS gap between tiles and columns. Default "1rem". */
  gap?: string;
  /** Tiles per column before repeating, so short lists still fill the wall. Default 4. */
  minPerColumn?: number;
  /** Lift the hovered or focused tile face-on. Default true. */
  flattenOnFocus?: boolean;
  /** Pause button for the drift (needed for motion longer than five seconds). Default true. */
  showControls?: boolean;
  /** Start paused. Default false. */
  defaultPaused?: boolean;
  /** Classes for every tile wrapper. */
  tileClassName?: string;
  /** Accessible name of the region. Default "Gallery". */
  label?: string;
}

function makeInert(el: HTMLElement | null): void {
  if (el) el.inert = true;
}

function PauseGlyph({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={cn(blockReset, "size-3.5")}>
      {paused ? <path d="M5 3.5v9l7.5-4.5z" /> : <path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" />}
    </svg>
  );
}

/**
 * An isometric wall of tiles: columns drift in alternating directions on a plane tilted back in
 * CSS 3D. Hovering or focusing pauses the drift and turns that tile face-on, so screenshots and
 * customer stories become browsable instead of hiding in a carousel. Pure CSS animation, no JS loop.
 */
export const PerspectiveWall = React.forwardRef<HTMLDivElement, PerspectiveWallProps>(function PerspectiveWall(
  {
    items,
    columns = 4,
    duration = 36,
    tiltX = 38,
    tiltZ = -22,
    height = "30rem",
    gap = "1rem",
    minPerColumn = 4,
    flattenOnFocus = true,
    showControls = true,
    defaultPaused = false,
    tileClassName,
    label = "Gallery",
    className,
    style,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = React.useState(defaultPaused);
  const cols = Math.max(1, Math.floor(columns));
  const moving = !reduced && !paused;

  // Deal items into columns; repeat to fill short columns. Repeats are hidden from AT.
  const lanes = React.useMemo(() => {
    const out: { node: React.ReactNode; key: string; repeat: boolean }[][] = Array.from({ length: cols }, () => []);
    if (items.length === 0) return out;
    items.forEach((node, i) => out[i % cols]?.push({ node, key: `i${i}`, repeat: false }));
    const per = Math.max(minPerColumn, Math.ceil(items.length / cols));
    out.forEach((lane, c) => {
      for (let k = lane.length; k < per; k++) {
        lane.push({ node: items[(c + k * cols + c) % items.length], key: `r${k}`, repeat: true });
      }
    });
    return out;
  }, [items, cols, minPerColumn]);

  const vars = {
    "--pw-rx": `${tiltX}deg`,
    "--pw-rz": `${tiltZ}deg`,
    "--pui-marquee-gap": gap,
    height,
  } as React.CSSProperties;

  const tile = cn(
    blockReset,
    "relative overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-lg",
    flattenOnFocus &&
      "transition-[transform,box-shadow] duration-(--pui-duration-slow) ease-pui-out hover:z-10 hover:shadow-pui-xl hover:[transform:rotateZ(calc(var(--pw-rz)*-1))_rotateX(calc(var(--pw-rx)*-1))_translateZ(48px)_scale(1.04)] focus-within:z-10 focus-within:shadow-pui-xl focus-within:[transform:rotateZ(calc(var(--pw-rz)*-1))_rotateX(calc(var(--pw-rx)*-1))_translateZ(48px)_scale(1.04)] motion-reduce:transition-none",
    tileClassName,
  );

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      aria-roledescription="tilted gallery"
      data-state={reduced ? "static" : paused ? "paused" : "running"}
      {...props}
      style={{ ...vars, ...style }}
      className={cn(
        blockReset,
        "group/wall relative w-full overflow-hidden [perspective:1600px] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)]",
        className,
      )}
    >
      <div
        className={cn(
          blockReset,
          "absolute top-1/2 left-1/2 grid w-[150%] [gap:var(--pui-marquee-gap)] [transform-style:preserve-3d]",
        )}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          transform: `translate(-50%, -50%) rotateX(var(--pw-rx)) rotateZ(var(--pw-rz))`,
          height: "170%",
        }}
      >
        {lanes.map((lane, c) => (
          <div key={c} className={cn(blockReset, "flex min-w-0 flex-col [gap:var(--pui-marquee-gap)] [transform-style:preserve-3d]")}>
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                ref={copy === 1 ? makeInert : undefined}
                aria-hidden={copy === 1 ? true : undefined}
                className={cn(
                  listReset,
                  "flex shrink-0 flex-col [gap:var(--pui-marquee-gap)] [transform-style:preserve-3d]",
                  !reduced && "motion-safe:animate-pui-marquee-y",
                  c % 2 === 1 && "[animation-direction:reverse]",
                  !moving && "[animation-play-state:paused]",
                  "group-hover/wall:[animation-play-state:paused] group-focus-within/wall:[animation-play-state:paused]",
                )}
                style={{ "--pui-marquee-duration": `${duration * (1 + c * 0.14)}s` } as React.CSSProperties}
              >
                {lane.map((entry) => (
                  <li
                    key={entry.key}
                    ref={entry.repeat && copy === 0 ? makeInert : undefined}
                    aria-hidden={entry.repeat && copy === 0 ? true : undefined}
                    className={tile}
                  >
                    {entry.node}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>
      {showControls && !reduced ? (
        <button
          type="button"
          aria-pressed={paused}
          aria-label={paused ? "Play gallery motion" : "Pause gallery motion"}
          onClick={() => setPaused((p) => !p)}
          className={cn(
            controlReset,
            focusRing,
            "absolute right-3 bottom-3 z-20 inline-flex size-8 cursor-pointer items-center justify-center rounded-pui-full border border-pui-border bg-pui-surface/90 text-pui-surface-foreground shadow-pui-md backdrop-blur-sm transition-colors hover:bg-pui-muted",
          )}
        >
          <PauseGlyph paused={paused} />
        </button>
      ) : null}
    </div>
  );
});
