"use client";

import * as React from "react";

/** Where focus goes once a menu opens: its first item, its last item, or the menu itself. */
export type MenuFocusTarget = "first" | "last" | "content";

/**
 * Root state shared by DropdownMenu and ContextMenu. Every DropdownMenu part (content, items,
 * submenus) reads it, so a ContextMenu can provide its own value and reuse all of them.
 */
export interface MenuContextValue {
  id: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  openWith: (target: MenuFocusTarget) => void;
  focusTargetRef: React.RefObject<MenuFocusTarget>;
  /** The element focus returns to (the trigger button, or the context-menu region). */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** The element the content is positioned against and that never counts as "outside". */
  anchorRef: React.RefObject<Element | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  triggerId: string;
  contentId: string;
  closeAndFocus: () => void;
}

export const MenuContext = React.createContext<MenuContextValue | null>(null);

export function useMenu(part: string): MenuContextValue {
  const context = React.useContext(MenuContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside DropdownMenu or ContextMenu`);
  return context;
}
