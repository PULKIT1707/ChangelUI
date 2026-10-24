"use client";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { djb2 } from "../lib/ids";
import { durations, easings, springs } from "../lib/motion";
import { blockReset, controlReset, listReset } from "../lib/styles";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
export interface PresenceUser {
  id: string;
  name: string;
  /** Horizontal position as a fraction of the area (0 to 1). Values outside pin the cursor to the edge. */
  x: number;
  /** Vertical position as a fraction of the area (0 to 1). */
  y: number;
  /** Cursor and chip color (any CSS color). Default: a chart token picked from the id. */
  color?: string;
  /** Chip text color. Default var(--pui-background), which contrasts with the chart tokens in both themes. */
  textColor?: string;
  /** Short activity shown in the chip, e.g. "Editing title" or "typing…". */
  status?: string;
  /** Image URL for the avatar stack; initials otherwise. */
  avatar?: string;
}
export interface PresenceCursorsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  users: readonly PresenceUser[];
  /** The shared surface (canvas, document, board). */
  children?: React.ReactNode;
  /** Milliseconds without movement before a cursor dims and folds its name chip. Default 6000. 0 disables. */
  idleAfter?: number;
  /** Show the avatar stack. Default true. */
  showStack?: boolean;
  /** Corner for the avatar stack. Default "top-right". */
  stackPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Most avatars before a +N chip. Default 4. */
  maxAvatars?: number;
  /** Reports the local pointer as fractions (null when it leaves), throttled to animation frames. Broadcast it. */
  onLocalMove?: (point: { x: number; y: number } | null) => void;
  /** Accessible label for the avatar list. Default "People here". */
  stackLabel?: string;
}
const PALETTE = ["--pui-chart-1", "--pui-chart-2", "--pui-chart-4", "--pui-chart-5", "--pui-chart-6", "--pui-chart-7", "--pui-chart-3"];
const STACK_POS = {
  "top-right": "right-3 top-3",
  "top-left": "left-3 top-3",
  "bottom-right": "bottom-3 right-3",
  "bottom-left": "bottom-3 left-3",
} as const;
const EDGE = 0.015;
/** Cursors glide between bursty network updates instead of teleporting. */
const glide = { type: "spring", stiffness: 210, damping: 28, mass: 0.7 } as const;
export function presenceColor(user: Pick<PresenceUser, "id" | "color">): string {
  return user.color ?? `var(${PALETTE[djb2(user.id) % PALETTE.length]})`;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}
function clamp01(n: number): number {
  return Math.min(1 - EDGE, Math.max(EDGE, n));
}
/** Angle (deg) pointing from the area's center toward an off-area point, for the edge arrow. */
function edgeAngle(x: number, y: number): number {
  return (Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI;
}
/**
 * Multiplayer presence for any shared surface: remote cursors glide smoothly between bursty
 * updates, carry a name chip with an optional status, dim when idle and pin to the edge with an
 * arrow when someone is outside the visible area. An avatar stack lists who is here; hovering or
 * focusing a person spotlights their cursor. You bring the transport: pass positions in, and
 * `onLocalMove` hands you the local pointer to broadcast.
 */
export const PresenceCursors = React.forwardRef<HTMLDivElement, PresenceCursorsProps>(function PresenceCursors(
  {
    users,
    children,
    idleAfter = 6000,
    showStack = true,
    stackPosition = "top-right",
    maxAvatars = 4,
    onLocalMove,
    stackLabel = "People here",
    className,
    onPointerMove,
    onPointerLeave,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [hoverId, setFocusId] = React.useState<string | null>(null);
  const [pinnedId, setPinnedId] = React.useState<string | null>(null);
  const focusId = hoverId ?? (pinnedId !== null && users.some((u) => u.id === pinnedId) ? pinnedId : null);
  // Idle tracking: when each user last moved. Timestamps are only read and written in effects.
  const lastMove = React.useRef(new Map<string, { x: number; y: number; t: number }>());
  const [idle, setIdle] = React.useState<ReadonlySet<string>>(() => new Set());
  React.useEffect(() => {
    const now = Date.now();
    const seen = lastMove.current;
    for (const u of users) {
      const prev = seen.get(u.id);
      if (!prev || prev.x !== u.x || prev.y !== u.y) seen.set(u.id, { x: u.x, y: u.y, t: now });
    }
    setIdle((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const u of users) {
        if (next.has(u.id) && seen.get(u.id)?.t === now) {
          next.delete(u.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [users]);
  React.useEffect(() => {
    if (!idleAfter) return;
    const tick = window.setInterval(() => {
      const now = Date.now();
      const next = new Set<string>();
      for (const [id, entry] of lastMove.current) if (now - entry.t > idleAfter) next.add(id);
      setIdle((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [idleAfter]);
  const latest = useLatestRef(onLocalMove);
  const frame = React.useRef<number | null>(null);
  const pending = React.useRef<{ x: number; y: number } | null>(null);
  React.useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const report = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!latest.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pending.current = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (pending.current) latest.current?.(pending.current);
    });
  };
  const visible = users.slice(0, maxAvatars);
  const overflow = users.length - visible.length;
  const fade = { duration: reduced ? 0 : durations.base, ease: easings.out };
  return (
    <div
      ref={ref}
      {...props}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        report(event);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        pending.current = null;
        latest.current?.(null);
      }}
      className={cn(blockReset, "relative isolate overflow-hidden", className)}
    >
      {children}
      <div aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-0 z-10")}>
        <AnimatePresence>
          {users.map((user) => {
            const color = presenceColor(user);
            const off = user.x < 0 || user.x > 1 || user.y < 0 || user.y > 1;
            const isIdle = idle.has(user.id);
            const dimmed = focusId !== null && focusId !== user.id;
            const spot = focusId === user.id;
            const flipX = clamp01(user.x) > 0.72;
            const flipY = clamp01(user.y) > 0.86;
            return (
              <motion.div
                key={user.id}
                data-presence-cursor={user.id}
                data-idle={isIdle ? "" : undefined}
                data-offscreen={off ? "" : undefined}
                className={cn(blockReset, "absolute left-0 top-0")}
                initial={{ left: `${clamp01(user.x) * 100}%`, top: `${clamp01(user.y) * 100}%`, opacity: 0, scale: reduced ? 1 : 0.6 }}
                animate={{
                  left: `${clamp01(user.x) * 100}%`,
                  top: `${clamp01(user.y) * 100}%`,
                  opacity: dimmed ? 0.25 : isIdle ? 0.45 : 1,
                  scale: spot && !reduced ? 1.15 : 1,
                }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.6, transition: fade }}
                transition={reduced ? { duration: 0 } : { left: glide, top: glide, opacity: fade, scale: springs.bouncy }}
                style={{ color }}
              >
                {off ? (
                  <span
                    className={cn(blockReset, "absolute -translate-1/2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-pui-md")}
                    style={{ background: color, color: user.textColor ?? "var(--pui-background)" }}
                  >
                    <svg viewBox="0 0 12 12" className="size-3" style={{ rotate: `${edgeAngle(user.x, user.y)}deg` }}>
                      <path d="M2 6h7M6 2.5 9.5 6 6 9.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {user.name}
                  </span>
                ) : (
                  <>
                    <svg viewBox="0 0 20 22" className="-ml-px -mt-px block size-5 drop-shadow-sm" fill="currentColor">
                      <path d="M2.2 1.6c-.4-.2-.8.2-.7.6l5 17.2c.1.5.8.6 1.1.1l2.9-5.2c.1-.2.3-.3.5-.3l5.9-.6c.5 0 .7-.7.3-1L2.2 1.6Z" stroke="var(--pui-background)" strokeWidth={1.4} strokeLinejoin="round" />
                    </svg>
                    <AnimatePresence initial={false}>
                      {!isIdle || spot ? (
                        <motion.span
                          key="chip"
                          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7, x: -4 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7, x: -4 }}
                          transition={reduced ? { duration: 0 } : springs.snappy}
                          className={cn(
                            blockReset,
                            "absolute flex items-baseline gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold leading-5 shadow-pui-md",
                            // Near the right or bottom edge the chip flips to the other side of the arrow so it is never clipped.
                            flipX ? "right-4 origin-top-right rounded-tr-sm" : "left-3.5 origin-top-left rounded-tl-sm",
                            flipY ? "bottom-5 top-auto" : "top-4",
                          )}
                          style={{ background: color, color: user.textColor ?? "var(--pui-background)" }}
                        >
                          {user.name}
                          {user.status ? <span className="text-[11px] font-medium opacity-80">{user.status}</span> : null}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {showStack && users.length > 0 ? (
        <ul aria-label={stackLabel} className={cn(listReset, "absolute z-20 flex items-center -space-x-2", STACK_POS[stackPosition])}>
          {visible.map((user) => {
            const color = presenceColor(user);
            const spoken = `${user.name}${user.status ? `, ${user.status}` : ""}${idle.has(user.id) ? ", idle" : ""}`;
            return (
              <li key={user.id} className={cn(blockReset, "relative")}>
                <button
                  type="button"
                  aria-label={`Spotlight ${spoken}`}
                  aria-pressed={pinnedId === user.id}
                  title={spoken}
                  onClick={() => setPinnedId((id) => (id === user.id ? null : user.id))}
                  onPointerEnter={() => setFocusId(user.id)}
                  onPointerLeave={() => setFocusId((id) => (id === user.id ? null : id))}
                  onFocus={() => setFocusId(user.id)}
                  onBlur={() => setFocusId((id) => (id === user.id ? null : id))}
                  className={cn(
                    controlReset,
                    "relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 bg-pui-surface text-[11px] font-semibold text-pui-surface-foreground shadow-pui-sm transition-transform duration-(--pui-duration-fast) hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring motion-reduce:transition-none",
                  )}
                  style={{ borderColor: color, boxShadow: pinnedId === user.id ? `0 0 0 2px var(--pui-surface), 0 0 0 4px ${color}` : undefined }}
                >
                  {user.avatar ? <img src={user.avatar} alt="" className={cn(blockReset, "size-full object-cover")} /> : initials(user.name)}
                </button>
                {idle.has(user.id) ? null : (
                  <span aria-hidden="true" className={cn(blockReset, "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-pui-surface bg-pui-success")} />
                )}
              </li>
            );
          })}
          {overflow > 0 ? (
            <li className={cn(blockReset, "relative")}>
              <span
                className={cn(blockReset, "flex size-8 items-center justify-center rounded-full border-2 border-pui-surface bg-pui-muted text-[11px] font-semibold text-pui-muted-foreground shadow-pui-sm tabular-nums")}
                title={users.slice(maxAvatars).map((u) => u.name).join(", ")}
              >
                +{overflow}
                <span className="sr-only"> more: {users.slice(maxAvatars).map((u) => u.name).join(", ")}</span>
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
});
