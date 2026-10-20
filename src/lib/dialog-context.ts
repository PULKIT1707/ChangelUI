"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { devWarn } from "./dev";
import { useIsomorphicLayoutEffect } from "./use-latest-ref";

// Shared by Dialog and Drawer (design 7.1 #26, #27): the root context and the per-dialog
// Title/Description presence store (child-to-parent registration through useSyncExternalStore).

export type PresencePart = "title" | "description";

export interface PresenceStore {
  subscribe: (listener: () => void) => () => void;
  has: (part: PresencePart) => boolean;
  mark: (part: PresencePart) => () => void;
}

export function createPresenceStore(): PresenceStore {
  const counts: Record<PresencePart, number> = { title: 0, description: 0 };
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    has: (part) => counts[part] > 0,
    mark(part) {
      counts[part] += 1;
      notify();
      return () => {
        counts[part] -= 1;
        notify();
      };
    },
  };
}

export interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  dismissible: boolean;
  titleId: string;
  descriptionId: string;
  presence: PresenceStore;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext(part: string): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside Dialog or Drawer`);
  return context;
}

/** Title/Description register their presence from a layout effect. */
export function useMarkPresence(part: PresencePart): string {
  const dialog = useDialogContext(part === "title" ? "DialogTitle" : "DialogDescription");
  const { presence } = dialog;
  useIsomorphicLayoutEffect(() => presence.mark(part), [presence, part]);
  return part === "title" ? dialog.titleId : dialog.descriptionId;
}

/**
 * aria-labelledby / aria-describedby for the dialog content, set only while the referenced
 * Title / Description exists, plus a dev warning for an unnamed dialog (checked in the DOM after mount).
 */
export function useDialogA11y(
  dialog: DialogContextValue,
  props: { "aria-label"?: string; "aria-labelledby"?: string; "aria-describedby"?: string },
  component: string,
) {
  const { presence, titleId, descriptionId, open } = dialog;
  const hasTitle = useSyncExternalStore(presence.subscribe, () => presence.has("title"), () => false);
  const hasDescription = useSyncExternalStore(presence.subscribe, () => presence.has("description"), () => false);
  const label = props["aria-label"];
  const labelledBy = props["aria-labelledby"];
  useEffect(() => {
    if (!open || label || labelledBy) return;
    if (typeof document !== "undefined" && document.getElementById(titleId)) return;
    devWarn(`${component}:name`, `${component} needs a ${component}Title or an aria-label.`);
  }, [open, label, labelledBy, titleId, component]);
  return {
    "aria-labelledby": labelledBy ?? (hasTitle ? titleId : undefined),
    "aria-describedby": props["aria-describedby"] ?? (hasDescription ? descriptionId : undefined),
  };
}
