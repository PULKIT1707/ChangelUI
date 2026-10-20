import type * as React from "react";

/**
 * Calls the child's handler first, then ours unless the child called preventDefault().
 */
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  theirs: ((event: E) => void) | undefined,
  ours: ((event: E) => void) | undefined,
): (event: E) => void {
  return (event: E) => {
    theirs?.(event);
    if (!event.defaultPrevented) ours?.(event);
  };
}

/** Combines refs (callback or object) into one callback ref. */
export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(value);
      // Mutable view: React 18's RefObject types `current` as readonly.
      else if (ref != null) (ref as { current: T | null }).current = value;
    }
  };
}
