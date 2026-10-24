"use client";
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, 15_000);
  return () => clearInterval(timer);
};
/** Stable within a minute, so useSyncExternalStore sees the same snapshot until the minute turns. */
const getSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const getServerSnapshot = () => null;

/**
 * The current time rounded down to the minute: null on the server and during hydration, then the
 * client clock, updated as minutes pass. For relative labels ("5m") and "next run" lists.
 */
export function useMinuteClock(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
