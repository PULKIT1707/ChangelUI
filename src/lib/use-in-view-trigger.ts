"use client";

import { useInView, type UseInViewOptions } from "motion/react";
import { useRef, type RefObject } from "react";
import type { Trigger } from "./types";
import { useIsClient } from "./use-is-client";

export interface InViewTriggerOptions {
  /** "inView" (default) waits for the element to enter the viewport; "mount" is active immediately. */
  trigger?: Trigger;
  /** Stay active after the first entry. Default true. */
  once?: boolean;
  margin?: UseInViewOptions["margin"];
}

/**
 * Entrance trigger (design 6). Server and hydration renders are inactive for "inView"; after mount,
 * a browser without IntersectionObserver (or jsdom) treats the element as in view immediately.
 */
export function useInViewTrigger(
  ref: RefObject<Element | null>,
  { trigger = "inView", once = true, margin }: InViewTriggerOptions = {},
): boolean {
  const isClient = useIsClient();
  const unobserved = useRef<Element | null>(null);
  const hasObserver = typeof IntersectionObserver !== "undefined";
  // Motion's useInView constructs an IntersectionObserver unguarded; give it no element without one.
  const inView = useInView(hasObserver && trigger === "inView" ? ref : unobserved, { once, margin });
  if (trigger === "mount") return true;
  return inView || (isClient && !hasObserver);
}
