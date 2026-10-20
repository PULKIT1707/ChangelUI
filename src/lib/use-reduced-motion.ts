"use client";

import { MotionConfigContext } from "motion/react";
import { useContext } from "react";
import { useMediaQuery } from "../hooks/use-media-query";

/**
 * True when motion should be reduced (design 6): always under <MotionConfig reducedMotion="always">,
 * otherwise whenever the OS asks for reduced motion. No MotionConfig is needed for the OS setting.
 * The OS value is read through useSyncExternalStore with a server snapshot of false, so server HTML
 * and the hydration render both take the full-motion branch and the OS value applies right after
 * hydration (client-only mounts see it on their first render); it also follows live OS changes.
 * Motion's default context is "never", which can't be told apart from an explicit "never", so an
 * explicit reducedMotion="never" does not suppress the OS preference here.
 */
export function usePrefersReducedMotion(): boolean {
  const { reducedMotion } = useContext(MotionConfigContext);
  const os = useMediaQuery("(prefers-reduced-motion: reduce)");
  return reducedMotion === "always" || os;
}
