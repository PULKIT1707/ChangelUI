"use client";
import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface UseViewTransitionOptions {
  /** Run updates without a transition when the user prefers reduced motion. Default true. */
  respectReducedMotion?: boolean;
}

export interface ViewTransitionRunOptions {
  /**
   * Set as `data-pui-view-transition="<name>"` on `<html>` while this transition runs, so CSS can
   * style it on its own: `:root[data-pui-view-transition="gallery"]::view-transition-group(*) { … }`.
   */
  name?: string;
  /** View transition types (`:active-view-transition-type(forward)`) where the browser supports them. */
  types?: string[];
  /**
   * Commit React state updates synchronously inside the transition callback (flushSync), so the
   * browser snapshots the new DOM. Default true. Turn off for updates that aren't React state.
   */
  sync?: boolean;
}

export interface ViewTransitionHandle {
  /** True when the update ran without a transition (unsupported browser, reduced motion, server). */
  skipped: boolean;
  /**
   * Resolves once the pseudo-elements exist (true) or the transition was skipped (false). Never
   * rejects, so it is safe to ignore. Animate `::view-transition-*` with WAAPI after it resolves.
   */
  ready: Promise<boolean>;
  /** Resolves when the transition (or the plain update) is done. Never rejects. */
  finished: Promise<void>;
  /** Jumps to the end state. A no-op when skipped. */
  skipTransition: () => void;
}

export type UseViewTransitionResult = (update: () => void, options?: ViewTransitionRunOptions) => ViewTransitionHandle;

interface NativeViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

type TransitionDocument = Document & {
  startViewTransition?: (arg: (() => void) | { update: () => void; types?: string[] }) => NativeViewTransition;
};

const ATTR = "data-pui-view-transition";
// Overlapping runs: only the latest one removes the html attribute.
let runCounter = 0;

/** True in browsers with the View Transitions API (same-document). False on the server. */
export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && typeof (document as TransitionDocument).startViewTransition === "function";
}

function supportsTypes(): boolean {
  const ctor = (globalThis as { ViewTransition?: { prototype: object } }).ViewTransition;
  return ctor !== undefined && "types" in ctor.prototype;
}

function skippedHandle(update: () => void): ViewTransitionHandle {
  update();
  return { skipped: true, ready: Promise.resolve(false), finished: Promise.resolve(), skipTransition: () => {} };
}

/**
 * Wraps `document.startViewTransition` for React: feature detection, a reduced-motion skip,
 * flushSync so state updates land in the snapshot, per-run names for scoped CSS and a handle whose
 * promises never reject. Returns a stable `run(update, options)`. Unsupported browsers and the
 * server just run the update. Give elements a `viewTransitionName` style to morph them.
 */
export function useViewTransition({ respectReducedMotion = true }: UseViewTransitionOptions = {}): UseViewTransitionResult {
  const reduced = usePrefersReducedMotion();
  const skipRef = useLatestRef(respectReducedMotion && reduced);

  return useCallback(
    (update: () => void, { name, types, sync = true }: ViewTransitionRunOptions = {}): ViewTransitionHandle => {
      const commit = sync ? () => flushSync(update) : update;
      if (skipRef.current || !supportsViewTransitions()) return skippedHandle(update);
      const doc = document as TransitionDocument;
      const root = document.documentElement;
      const run = ++runCounter;
      if (name) root.setAttribute(ATTR, name);
      else root.removeAttribute(ATTR);
      let native: NativeViewTransition;
      try {
        native =
          types && types.length > 0 && supportsTypes()
            ? doc.startViewTransition!({ update: commit, types })
            : doc.startViewTransition!(commit);
      } catch {
        if (run === runCounter) root.removeAttribute(ATTR);
        return skippedHandle(update);
      }
      const finished = native.finished.then(
        () => undefined,
        () => undefined,
      );
      void finished.then(() => {
        if (run === runCounter) root.removeAttribute(ATTR);
      });
      return {
        skipped: false,
        ready: native.ready.then(
          () => true,
          () => false,
        ),
        finished,
        skipTransition: () => native.skipTransition(),
      };
    },
    [skipRef],
  );
}
