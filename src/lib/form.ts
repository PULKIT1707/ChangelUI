"use client";

import { useEffect, type RefObject } from "react";
import { devWarn } from "./dev";
import { useLatestRef } from "./use-latest-ref";

/** Visually hidden, non-interactive native input that mirrors a custom control's value (design 6). */
export const hiddenInputClasses = "pointer-events-none absolute size-px overflow-hidden opacity-0 [clip:rect(0,0,0,0)]";

/**
 * Calls `onReset` when the element's owning form fires `reset` (design 6, hidden form inputs).
 * Uncontrolled components restore their default; controlled ones call their change callback.
 */
export function useFormReset(ref: RefObject<HTMLElement | null>, onReset: () => void): void {
  const onResetRef = useLatestRef(onReset);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const handler = () => onResetRef.current();
    form.addEventListener("reset", handler);
    return () => form.removeEventListener("reset", handler);
  }, [ref, onResetRef]);
}

interface NameProps {
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * Dev warning when a control has no accessible name: no aria-label, no aria-labelledby and (for
 * labelable elements) no associated <label>. Checked after mount, from the DOM (design 9).
 */
export function useAccessibleNameWarning(
  ref: RefObject<HTMLElement | null>,
  props: NameProps,
  key: string,
  message: string,
): void {
  const label = props["aria-label"];
  const labelledBy = props["aria-labelledby"];
  useEffect(() => {
    const el = ref.current;
    if (!el || (label && label.trim() !== "") || labelledBy) return;
    const labels = (el as Partial<HTMLButtonElement>).labels;
    if (labels && labels.length > 0) return;
    devWarn(key, message);
  }, [ref, label, labelledBy, key, message]);
}
