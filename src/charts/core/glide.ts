"use client";
// useGlide: springs a small numeric tuple (a visible window, an axis domain) toward its target and
// re-renders per frame, for charts whose geometry is computed in React from those numbers.
import { animate, type Transition } from "motion/react";
import * as React from "react";
import { chartMotion } from "./use-chart-motion";

/** Glides a numeric tuple to `target` on a spring; returns the target directly when disabled. */
export function useGlide(target: readonly number[], enabled: boolean, transition: Transition = chartMotion.update): readonly number[] {
  const [cur, setCur] = React.useState<readonly number[]>(target);
  const ref = React.useRef<readonly number[]>(target);
  const key = target.join(",");
  React.useEffect(() => {
    const goal = key.split(",").map(Number);
    if (!enabled) {
      // Keep the resting value in sync, so re-enabling starts from here instead of a stale frame.
      ref.current = goal;
      const id = requestAnimationFrame(() => setCur(goal));
      return () => cancelAnimationFrame(id);
    }
    const from = ref.current.length === goal.length ? ref.current : goal;
    const controls = animate(0, 1, {
      ...transition,
      onUpdate: (t) => {
        const v = goal.map((g, k) => (from[k] as number) + (g - (from[k] as number)) * t);
        ref.current = v;
        setCur(v);
      },
    });
    return () => controls.stop();
  }, [key, enabled, transition]);
  return enabled && cur.length === target.length ? cur : target;
}

