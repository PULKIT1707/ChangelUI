"use client";
// Public entry for the hook every ChangelUI item uses to honor reduced motion (roadmap W1).
// The implementation lives in src/lib so internal imports stay short; this file only re-exports it.
export { usePrefersReducedMotion } from "../lib/use-reduced-motion";
