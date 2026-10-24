"use client";
import { motion, useMotionValue, useSpring, useTransform, useVelocity } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, focusRing, listReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface HoverRevealItem {
  /** Stable key. Defaults to the index. */
  id?: string;
  title: React.ReactNode;
  /** Image shown in the floating preview (decorative: the title names the row). */
  image: string;
  /** Renders the row as a link. */
  href?: string;
  /** Short line under the title. */
  description?: React.ReactNode;
  /** Right-aligned detail such as a year, client or category. */
  meta?: React.ReactNode;
}
export interface HoverRevealListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: readonly HoverRevealItem[];
  /** Rows without href become buttons that call this. */
  onSelect?: (item: HoverRevealItem, index: number) => void;
  /** Preview width in px. Default 260. */
  previewWidth?: number;
  /** CSS aspect-ratio of the preview. Default "4 / 3". */
  aspectRatio?: string;
  /** Most tilt in degrees from horizontal pointer speed. Default 8. */
  tilt?: number;
  /** Show 01, 02 … before each title. Default true. */
  numbered?: boolean;
  /** Default "md". */
  size?: "md" | "lg";
  /** Class for each row's interactive element. */
  rowClassName?: string;
}
const titleSize = { md: "text-xl sm:text-2xl", lg: "text-2xl sm:text-4xl" } as const;
const rowPad = { md: "py-4", lg: "py-6" } as const;
const GAP = 28;
/**
 * An editorial list of links (work, case studies, articles) where hovering or focusing a row
 * floats a preview of what is behind it. The preview trails the pointer on a spring, tilts with
 * its speed and scrolls like a film reel between rows, while the other rows dim. Keyboard focus
 * docks the preview beside the row, touch shows inline thumbnails and reduced motion docks it too.
 */
export const HoverRevealList = React.forwardRef<HTMLDivElement, HoverRevealListProps>(function HoverRevealList(
  {
    items,
    onSelect,
    previewWidth = 260,
    aspectRatio = "4 / 3",
    tilt = 8,
    numbered = true,
    size = "md",
    rowClassName,
    className,
    onPointerMove,
    onPointerLeave,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = React.useState<number | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 220, damping: 26, mass: 0.6 });
  const y = useSpring(py, { stiffness: 220, damping: 26, mass: 0.6 });
  const velocity = useVelocity(x);
  const rotate = useTransform(velocity, [-1600, 0, 1600], [-tilt, 0, tilt], { clamp: true });
  const height = previewWidth / ratioOf(aspectRatio);
  const place = (left: number, top: number, jump: boolean) => {
    const root = rootRef.current;
    const width = root?.clientWidth ?? 0;
    // Sit to the right of the pointer, flipping left near the edge.
    const nextX = left + GAP + previewWidth > width ? left - GAP - previewWidth : left + GAP;
    const nextY = top - height / 2;
    px.set(nextX);
    py.set(nextY);
    if (jump) {
      x.jump(nextX);
      y.jump(nextY);
    }
  };
  const dock = (row: HTMLElement) => {
    const root = rootRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const b = row.getBoundingClientRect();
    const left = Math.max(0, r.width - previewWidth - 8 - GAP);
    place(left, b.top - r.top + b.height / 2, active === null || reduced);
  };
  const enterRow = (index: number, event?: React.PointerEvent<HTMLElement>) => {
    const root = rootRef.current;
    if (event && root && !reduced) {
      const r = root.getBoundingClientRect();
      place(event.clientX - r.left, event.clientY - r.top, active === null);
    } else if (event) dock(event.currentTarget);
    setActive(index);
  };
  const anyActive = active !== null;
  return (
    <div
      ref={setRefs}
      data-active={anyActive ? active : undefined}
      {...props}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (reduced || event.pointerType === "touch" || active === null) return;
        const r = event.currentTarget.getBoundingClientRect();
        place(event.clientX - r.left, event.clientY - r.top, false);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setActive(null);
      }}
      className={cn(blockReset, "relative w-full text-pui-foreground", className)}
    >
      <ul className={cn(listReset, "border-t border-pui-border")}>
        {items.map((item, index) => {
          const isActive = active === index;
          const rowClass = cn(
            item.href || !onSelect ? blockReset : controlReset,
            focusRing,
            "group/row relative flex w-full items-center gap-4 border-b border-pui-border text-start no-underline text-inherit transition-opacity duration-(--pui-duration-slow) ease-pui-out",
            rowPad[size],
            anyActive && !isActive && "opacity-40",
            rowClassName,
          );
          const body = (
            <>
              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                className={cn(blockReset, "hidden size-12 shrink-0 rounded-pui-md object-cover [@media(hover:none)]:block")}
              />
              {numbered ? (
                <span className={cn(blockReset, "w-8 shrink-0 self-start pt-1.5 font-mono text-xs text-pui-muted-foreground tabular-nums")}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              ) : null}
              <span className={cn(blockReset, "flex min-w-0 flex-1 flex-col gap-1")}>
                <motion.span
                  className={cn(blockReset, "block truncate font-semibold tracking-tight", titleSize[size])}
                  animate={{ x: isActive && !reduced ? 12 : 0 }}
                  transition={springs.smooth}
                >
                  {item.title}
                </motion.span>
                {item.description ? <span className={cn(blockReset, "block truncate text-sm text-pui-muted-foreground")}>{item.description}</span> : null}
              </span>
              {item.meta ? <span className={cn(blockReset, "hidden shrink-0 text-sm text-pui-muted-foreground tabular-nums sm:block")}>{item.meta}</span> : null}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
                className={cn(
                  blockReset,
                  "block size-5 shrink-0 text-pui-primary transition-[opacity,translate] duration-(--pui-duration-slow) ease-pui-out",
                  isActive ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                  "[@media(hover:none)]:translate-x-0 [@media(hover:none)]:opacity-60",
                )}
              >
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </>
          );
          const handlers = {
            onPointerEnter: (event: React.PointerEvent<HTMLElement>) => event.pointerType !== "touch" && enterRow(index, event),
            onFocus: (event: React.FocusEvent<HTMLElement>) => {
              if (!event.currentTarget.matches(":focus-visible")) return;
              dock(event.currentTarget);
              setActive(index);
            },
            onBlur: () => setActive((a) => (a === index ? null : a)),
          };
          return (
            <li key={item.id ?? index} className={cn(blockReset)}>
              {item.href ? (
                <a href={item.href} className={rowClass} {...handlers}>
                  {body}
                </a>
              ) : onSelect ? (
                <button type="button" className={cn(rowClass, "cursor-pointer")} onClick={() => onSelect(item, index)} {...handlers}>
                  {body}
                </button>
              ) : (
                <div className={rowClass} onPointerEnter={handlers.onPointerEnter}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <motion.div
        aria-hidden="true"
        className={cn(
          blockReset,
          "pointer-events-none absolute start-0 top-0 z-10 overflow-hidden rounded-pui-lg bg-pui-muted shadow-pui-xl ring-1 ring-pui-border [@media(hover:none)]:hidden",
        )}
        style={{ width: previewWidth, height, x, y, rotate: reduced ? 0 : rotate }}
        initial={false}
        animate={{ opacity: anyActive ? 1 : 0, scale: anyActive || reduced ? 1 : 0.85 }}
        transition={{ duration: reduced ? durations.fast : durations.slow, ease: easings.out }}
      >
        <motion.div
          className={cn(blockReset, "flex flex-col")}
          initial={false}
          animate={{ y: -(active ?? 0) * height }}
          transition={reduced ? { duration: 0 } : springs.layout}
        >
          {items.map((item, index) => (
            <img
              key={item.id ?? index}
              src={item.image}
              alt=""
              draggable={false}
              decoding="async"
              className={cn(blockReset, "block w-full shrink-0 object-cover")}
              style={{ height }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
});
function ratioOf(aspect: string): number {
  const [w, h] = aspect.split("/").map((part) => parseFloat(part));
  const ratio = w && h ? w / h : w || 4 / 3;
  return ratio > 0 ? ratio : 4 / 3;
}
