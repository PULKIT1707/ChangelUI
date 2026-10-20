"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface ProximityGlowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Glow radius in px around the pointer. Default 240. */
  radius?: number;
  /** CSS glow color. Default "var(--pui-primary)". */
  color?: string;
  /** Border ring width in px. Default 1. */
  borderWidth?: number;
  /** Soft inner wash under the pointer as well as the border. Default true. */
  fill?: boolean;
  disabled?: boolean;
}

export type ProximityGlowItemProps = React.HTMLAttributes<HTMLDivElement>;

interface GlowContextValue {
  register: (node: HTMLElement) => () => void;
  enabled: boolean;
}

const GlowContext = React.createContext<GlowContextValue | null>(null);

const layer = "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-(--pui-duration-slow) ease-pui-out";

/**
 * A group of cards whose borders light up by pointer proximity, sharing one glow across every card
 * (Linear-style). One pointermove on the group sets each item's local --pui-glow-x/y; the rest is
 * CSS. Focusing inside an item lights it up for keyboard users.
 */
export const ProximityGlow = React.forwardRef<HTMLDivElement, ProximityGlowProps>(function ProximityGlow(
  { radius = 240, color = "var(--pui-primary)", borderWidth = 1, fill = true, disabled = false, onPointerMove, onPointerLeave, style, className, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const enabled = !reduced && !disabled;
  const items = React.useRef(new Set<HTMLElement>());
  const frame = React.useRef(0);
  const pointer = React.useRef<{ x: number; y: number } | null>(null);
  const [hovering, setHovering] = React.useState(false);

  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const flush = () => {
    frame.current = 0;
    const p = pointer.current;
    if (!p) return;
    // Read every rect first, then write, so the browser lays out once per frame.
    // The glow vars are in the item's own px, so a CSS scale on an ancestor is divided back out.
    const rects = Array.from(items.current, (node) => {
      const rect = node.getBoundingClientRect();
      const kx = node.offsetWidth > 0 && rect.width > 0 ? rect.width / node.offsetWidth : 1;
      const ky = node.offsetHeight > 0 && rect.height > 0 ? rect.height / node.offsetHeight : 1;
      return [node, rect, kx, ky] as const;
    });
    for (const [node, rect, kx, ky] of rects) {
      node.style.setProperty("--pui-glow-x", `${(p.x - rect.left) / kx}px`);
      node.style.setProperty("--pui-glow-y", `${(p.y - rect.top) / ky}px`);
    }
  };

  const context = React.useMemo<GlowContextValue>(
    () => ({
      enabled,
      register: (node) => {
        items.current.add(node);
        return () => items.current.delete(node);
      },
    }),
    [enabled],
  );

  return (
    <GlowContext.Provider value={context}>
      <div
        ref={ref}
        data-state={enabled ? (hovering ? "active" : "idle") : "static"}
        {...props}
        onPointerMove={composeEventHandlers(onPointerMove, (event) => {
          if (!enabled || event.pointerType === "touch") return;
          pointer.current = { x: event.clientX, y: event.clientY };
          if (!hovering) setHovering(true);
          if (!frame.current) frame.current = requestAnimationFrame(flush);
        })}
        onPointerLeave={composeEventHandlers(onPointerLeave, () => {
          pointer.current = null;
          setHovering(false);
        })}
        style={
          {
            "--pui-glow-radius": `${radius}px`,
            "--pui-glow-color": color,
            "--pui-glow-border": `${borderWidth}px`,
            "--pui-glow-fill": fill ? "1" : "0",
            ...style,
          } as React.CSSProperties
        }
        className={cn(blockReset, "group/glow", className)}
      />
    </GlowContext.Provider>
  );
});

/** A card inside ProximityGlow. Style it like any surface; the glow layers sit on top of it. */
export const ProximityGlowItem = React.forwardRef<HTMLDivElement, ProximityGlowItemProps>(function ProximityGlowItem(
  { onFocus, onBlur, className, children, ...props },
  ref,
) {
  const context = React.useContext(GlowContext);
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = React.useState(false);
  const register = context?.register;
  const enabled = context?.enabled ?? false;

  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node || !register) return;
    return register(node);
  }, [register]);

  const glowOn = enabled ? "group-data-[state=active]/glow:opacity-100" : "";

  return (
    <div
      ref={mergeRefs(nodeRef, ref)}
      data-focus={focused ? "" : undefined}
      {...props}
      onFocus={composeEventHandlers(onFocus, (event) => {
        if (!enabled) return;
        const node = event.currentTarget;
        node.style.setProperty("--pui-glow-x", `${node.offsetWidth / 2}px`);
        node.style.setProperty("--pui-glow-y", `${node.offsetHeight / 2}px`);
        setFocused(true);
      })}
      onBlur={composeEventHandlers(onBlur, (event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      })}
      className={cn(
        blockReset,
        "group/item relative isolate rounded-pui-lg border border-pui-border bg-pui-surface text-pui-surface-foreground",
        className,
      )}
    >
      {children}
      {enabled ? (
        <>
          <span
            aria-hidden="true"
            data-pui-glow-fill=""
            className={cn(blockReset, layer, "-z-10 block", glowOn, "group-data-[focus]/item:opacity-100")}
            style={{
              background:
                "radial-gradient(calc(var(--pui-glow-radius) * 0.9) circle at var(--pui-glow-x, -999px) var(--pui-glow-y, -999px), color-mix(in oklab, var(--pui-glow-color) calc(10% * var(--pui-glow-fill)), transparent), transparent 70%)",
            }}
          />
          <span
            aria-hidden="true"
            data-pui-glow-border=""
            className={cn(
              blockReset,
              layer,
              "-inset-px block p-(--pui-glow-border) [mask-image:linear-gradient(black,black),linear-gradient(black,black)] [mask-clip:content-box,border-box] [-webkit-mask-composite:xor] [mask-composite:exclude]",
              glowOn,
              "group-data-[focus]/item:opacity-100",
            )}
            style={{
              background:
                "radial-gradient(var(--pui-glow-radius) circle at var(--pui-glow-x, -999px) var(--pui-glow-y, -999px), var(--pui-glow-color), color-mix(in oklab, var(--pui-glow-color) 30%, transparent) 40%, transparent 70%)",
            }}
          />
        </>
      ) : null}
    </div>
  );
});
