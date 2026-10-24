"use client";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type DeviceKind = "browser" | "phone" | "laptop";

export interface DeviceFrameProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Default "browser". */
  device?: DeviceKind;
  /** Address bar text (browser and laptop). Default "app.example.com". */
  url?: string;
  /** Status bar time (phone). Default "9:41". */
  time?: string;
  /** Tilted back in 3D, flattening as it scrolls into view. Default false. */
  scrollTilt?: boolean;
  /** Starting tilt, degrees. Default 20. */
  tiltAngle?: number;
  /** Scroll container for scrollTilt. Default: the window. */
  container?: React.RefObject<HTMLElement | null>;
  /** CSS aspect ratio of the screen, e.g. "16 / 10". Default per device. */
  aspectRatio?: string;
  /** Soft gradient glow behind the device. Default false. */
  glow?: boolean;
  /** Extra classes for the screen (where children render). */
  screenClassName?: string;
}

const ratios: Record<DeviceKind, string> = { browser: "16 / 10", phone: "9 / 19.5", laptop: "16 / 10" };
// Adaptive bezel: light graphite on light themes, deep graphite on dark ones, from tokens only.
const bezel = "bg-[color-mix(in_oklab,var(--pui-foreground)_14%,var(--pui-surface))]";

function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className={cn(blockReset, "size-3 shrink-0")}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

function BrowserChrome({ url, compact }: { url: string; compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        blockReset,
        "flex items-center gap-3 border-b border-pui-border bg-pui-muted",
        compact ? "h-7 px-2.5" : "h-10 px-3.5",
      )}
    >
      <span className={cn(blockReset, "flex shrink-0 gap-1.5")}>
        <span className={cn(blockReset, "size-2.5 rounded-pui-full bg-pui-danger/80")} />
        <span className={cn(blockReset, "size-2.5 rounded-pui-full bg-pui-warning/80")} />
        <span className={cn(blockReset, "size-2.5 rounded-pui-full bg-pui-success/80")} />
      </span>
      <span
        className={cn(
          blockReset,
          "mx-auto flex min-w-0 max-w-[60%] flex-1 items-center justify-center gap-1.5 rounded-pui-md bg-pui-background px-3 text-pui-muted-foreground",
          compact ? "h-4.5 text-[10px]" : "h-6 text-xs",
        )}
      >
        <LockGlyph />
        <span className={cn(blockReset, "truncate")}>{url}</span>
      </span>
      <span className={cn(blockReset, "w-[42px] shrink-0")} />
    </div>
  );
}

/**
 * CSS-only browser, phone and laptop frames for live UI or screenshots, themed from tokens so they
 * follow light and dark. Optional scroll tilt: the device leans back in 3D and settles flat as it
 * reaches the middle of the viewport.
 */
export const DeviceFrame = React.forwardRef<HTMLDivElement, DeviceFrameProps>(function DeviceFrame(
  {
    device = "browser",
    url = "app.example.com",
    time = "9:41",
    scrollTilt = false,
    tiltAngle = 20,
    container,
    aspectRatio,
    glow = false,
    screenClassName,
    children,
    className,
    style,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const refs = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  const { scrollYProgress } = useScroll({ target: rootRef, container, offset: ["start end", "center center"] });
  const eased = useSpring(scrollYProgress, { stiffness: 160, damping: 30, restDelta: 0.001 });
  const tilting = scrollTilt && !reduced;
  const rotateX = useTransform(eased, [0, 1], [tiltAngle, 0]);
  const scale = useTransform(eased, [0, 1], [0.9, 1]);
  const ratio = aspectRatio ?? ratios[device];

  const screen = (
    <div
      className={cn(blockReset, "relative overflow-hidden bg-pui-background text-pui-foreground", screenClassName)}
      style={{ aspectRatio: ratio }}
    >
      {children}
    </div>
  );

  let body: React.ReactNode;
  if (device === "phone") {
    body = (
      <div className={cn(blockReset, "relative rounded-[2.6rem] border border-pui-border p-2.5 shadow-pui-xl", bezel)}>
        {/* Side buttons */}
        <span aria-hidden="true" className={cn(blockReset, "absolute top-24 -left-[3px] h-8 w-[3px] rounded-l-pui-sm", bezel)} />
        <span aria-hidden="true" className={cn(blockReset, "absolute top-36 -left-[3px] h-12 w-[3px] rounded-l-pui-sm", bezel)} />
        <span aria-hidden="true" className={cn(blockReset, "absolute top-28 -right-[3px] h-16 w-[3px] rounded-r-pui-sm", bezel)} />
        <div className={cn(blockReset, "@container relative overflow-hidden rounded-[2rem] ring-1 ring-pui-border")}>
          <div
            aria-hidden="true"
            className={cn(
              blockReset,
              "absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between px-6 text-[11px] font-semibold text-pui-foreground",
            )}
          >
            {/* Tiny phones keep only the island: the time and icons would collide with it. */}
            <span className={cn(blockReset, "min-w-6 tabular-nums @max-[11rem]:invisible")}>{time}</span>
            <span className={cn(blockReset, "absolute top-2 left-1/2 h-5 w-[34%] -translate-x-1/2 rounded-pui-full", bezel)} />
            <span className={cn(blockReset, "flex items-end gap-[2px] @max-[11rem]:invisible")}>
              {[4, 6, 8, 10].map((h) => (
                <span key={h} className={cn(blockReset, "w-[3px] rounded-[1px] bg-current")} style={{ height: h }} />
              ))}
              <span className={cn(blockReset, "ml-1 h-2.5 w-5 rounded-[3px] border border-current p-px")}>
                <span className={cn(blockReset, "block h-full w-3/4 rounded-[1px] bg-current")} />
              </span>
            </span>
          </div>
          {screen}
          <span
            aria-hidden="true"
            className={cn(blockReset, "absolute bottom-1.5 left-1/2 h-1 w-1/3 -translate-x-1/2 rounded-pui-full bg-pui-foreground/40")}
          />
        </div>
      </div>
    );
  } else if (device === "laptop") {
    body = (
      <div className={cn(blockReset, "flex flex-col items-center")}>
        <div className={cn(blockReset, "relative w-[86%] rounded-t-[1.1rem] border border-pui-border p-[1.6%] pb-[2.4%] shadow-pui-lg", bezel)}>
          <span aria-hidden="true" className={cn(blockReset, "absolute top-[0.6%] left-1/2 size-1.5 -translate-x-1/2 rounded-pui-full bg-pui-foreground/30")} />
          <div className={cn(blockReset, "overflow-hidden rounded-pui-sm ring-1 ring-pui-border")}>
            <BrowserChrome url={url} compact />
            {screen}
          </div>
        </div>
        <div
          aria-hidden="true"
          className={cn(blockReset, "relative h-3 w-full rounded-b-[0.9rem] rounded-t-[2px] border border-pui-border shadow-pui-md", bezel)}
        >
          <span className={cn(blockReset, "absolute top-0 left-1/2 h-1.5 w-[14%] -translate-x-1/2 rounded-b-pui-md bg-pui-foreground/10")} />
        </div>
      </div>
    );
  } else {
    body = (
      <div className={cn(blockReset, "overflow-hidden rounded-pui-xl border border-pui-border bg-pui-surface shadow-pui-xl")}>
        <BrowserChrome url={url} />
        {screen}
      </div>
    );
  }

  return (
    <div
      ref={refs}
      data-device={device}
      data-tilt={tilting ? "scroll" : "none"}
      {...props}
      style={{ perspective: tilting ? 1400 : undefined, ...style }}
      className={cn(blockReset, "relative w-full", device === "phone" && "max-w-72", className)}
    >
      {glow ? (
        <div
          aria-hidden="true"
          className={cn(
            blockReset,
            "pointer-events-none absolute inset-[8%] -z-10 rounded-pui-full bg-linear-to-tr from-pui-gradient-1 via-pui-gradient-2 to-pui-gradient-3 opacity-35 blur-3xl",
          )}
        />
      ) : null}
      <motion.div
        className={cn(blockReset, "origin-bottom")}
        style={tilting ? { rotateX, scale, transformStyle: "preserve-3d" } : undefined}
      >
        {body}
      </motion.div>
    </div>
  );
});
