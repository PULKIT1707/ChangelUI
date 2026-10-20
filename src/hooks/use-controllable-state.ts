"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { devWarn } from "../lib/dev";
import { useLatestRef } from "../lib/use-latest-ref";

export interface UseControllableStateParams<T> {
  /** Controlled when !== undefined (null is a value). */
  value?: T;
  defaultValue: T | (() => T);
  /** Called only by the setter, only when !Object.is(prev, next). */
  onChange?: (value: T) => void;
  /** Used in dev warnings. */
  name?: string;
}

export type ControllableStateSetter<T> = (next: T | ((prev: T) => T)) => void;

/**
 * value/defaultValue/onChange state (design 8 #60). The setter is stable; functional updates and
 * onChange read the latest value and callback through refs that are never written during render.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
  name = "value",
}: UseControllableStateParams<T>): [T, ControllableStateSetter<T>] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const valueRef = useLatestRef(current);
  const controlledRef = useLatestRef(controlled);
  const onChangeRef = useLatestRef(onChange);

  const initialModeRef = useRef(controlled);
  useEffect(() => {
    if (initialModeRef.current !== controlled) {
      const [from, to] = controlled ? ["uncontrolled", "controlled"] : ["controlled", "uncontrolled"];
      devWarn(
        `controllable-state:${name}`,
        `A component changed "${name}" from ${from} to ${to}. Pick one mode for the component's lifetime.`,
      );
      initialModeRef.current = controlled;
    }
  }, [controlled, name]);

  const setValue = useCallback<ControllableStateSetter<T>>(
    (next) => {
      const prev = valueRef.current;
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      if (Object.is(prev, resolved)) return;
      if (!controlledRef.current) {
        // Keep consecutive functional updates in one event consistent before the next commit.
        valueRef.current = resolved;
        setInternal(() => resolved);
      }
      onChangeRef.current?.(resolved);
    },
    [valueRef, controlledRef, onChangeRef],
  );

  return [current, setValue];
}
