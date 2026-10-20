"use client";

import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { MenuContext, useMenu, type MenuContextValue, type MenuFocusTarget } from "../lib/menu-context";
import { Slot } from "../lib/slot";
import { blockReset } from "../lib/styles";
import { DropdownMenuContent, type DropdownMenuContentProps } from "./dropdown-menu";

export {
  DropdownMenuCheckboxItem as ContextMenuCheckboxItem,
  DropdownMenuGroup as ContextMenuGroup,
  DropdownMenuItem as ContextMenuItem,
  DropdownMenuLabel as ContextMenuLabel,
  DropdownMenuRadioGroup as ContextMenuRadioGroup,
  DropdownMenuRadioItem as ContextMenuRadioItem,
  DropdownMenuSeparator as ContextMenuSeparator,
  DropdownMenuSub as ContextMenuSub,
  DropdownMenuSubContent as ContextMenuSubContent,
  DropdownMenuSubTrigger as ContextMenuSubTrigger,
} from "./dropdown-menu";
export type {
  DropdownMenuCheckboxItemProps as ContextMenuCheckboxItemProps,
  DropdownMenuGroupProps as ContextMenuGroupProps,
  DropdownMenuItemProps as ContextMenuItemProps,
  DropdownMenuLabelProps as ContextMenuLabelProps,
  DropdownMenuRadioGroupProps as ContextMenuRadioGroupProps,
  DropdownMenuRadioItemProps as ContextMenuRadioItemProps,
  DropdownMenuSeparatorProps as ContextMenuSeparatorProps,
  DropdownMenuSubContentProps as ContextMenuSubContentProps,
  DropdownMenuSubProps as ContextMenuSubProps,
  DropdownMenuSubTriggerProps as ContextMenuSubTriggerProps,
} from "./dropdown-menu";

export interface ContextMenuProps {
  /** Called when the menu opens (with the pointer or keyboard) or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Disable the custom menu; the browser's native one shows instead. */
  disabled?: boolean;
  /** Touch press time before the menu opens. Default 500 ms. */
  longPressMs?: number;
  children: React.ReactNode;
}

export interface ContextMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render the single child element as the region. */
  asChild?: boolean;
}

export interface ContextMenuContentProps
  extends Omit<DropdownMenuContentProps, "side" | "align" | "sideOffset"> {
  /** Accessible name of the menu. Default "Context menu". */
  label?: string;
}

interface Point {
  x: number;
  y: number;
}

interface ContextMenuExtra {
  point: Point;
  /** Increments per opening so a second right-click re-places the menu instantly. */
  openCount: number;
  disabled: boolean;
  longPressMs: number;
  openAt: (point: Point, focus: MenuFocusTarget) => void;
}

const ExtraContext = React.createContext<ContextMenuExtra | null>(null);

function useExtra(part: string): ContextMenuExtra {
  const context = React.useContext(ExtraContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside ContextMenu`);
  return context;
}

/** Long-press slop: a touch that moves farther than this is a scroll, not a press. */
const MOVE_TOLERANCE = 10;

/**
 * Right-click (long-press on touch, Shift+F10 or the Menu key) menu that opens at the pointer.
 * Its items are the DropdownMenu parts, re-exported under ContextMenu names.
 */
export function ContextMenu({ onOpenChange, disabled = false, longPressMs = 500, children }: ContextMenuProps) {
  const id = React.useId();
  const [open, setOpen] = useControllableState({ defaultValue: false, onChange: onOpenChange });
  const [point, setPoint] = React.useState<Point>({ x: 0, y: 0 });
  const [openCount, setOpenCount] = React.useState(0);
  const triggerRef = React.useRef<HTMLElement>(null);
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const focusTargetRef = React.useRef<MenuFocusTarget>("content");
  /** The element that had focus when the menu opened; focus goes back to it. */
  const returnRef = React.useRef<HTMLElement | null>(null);

  const menu = React.useMemo<MenuContextValue>(
    () => ({
      id,
      open,
      setOpen,
      openWith: (target) => {
        focusTargetRef.current = target;
        setOpen(true);
      },
      focusTargetRef,
      triggerRef,
      anchorRef,
      contentRef,
      triggerId: `${id}-trigger`,
      contentId: `${id}-content`,
      closeAndFocus: () => {
        setOpen(false);
        const target = returnRef.current?.isConnected ? returnRef.current : triggerRef.current;
        target?.focus({ preventScroll: true });
      },
    }),
    [id, open, setOpen],
  );

  const extra = React.useMemo<ContextMenuExtra>(
    () => ({
      point,
      openCount,
      disabled,
      longPressMs,
      openAt: (next, focus) => {
        const active = document.activeElement;
        returnRef.current =
          active instanceof HTMLElement && triggerRef.current?.contains(active) ? active : triggerRef.current;
        focusTargetRef.current = focus;
        setPoint(next);
        setOpenCount((count) => count + 1);
        setOpen(true);
      },
    }),
    [point, openCount, disabled, longPressMs, setOpen],
  );

  return (
    <MenuContext.Provider value={menu}>
      <ExtraContext.Provider value={extra}>
        {children}
        {/* The zero-size anchor the menu is positioned against (fixed at the pointer). */}
        <span
          ref={anchorRef}
          aria-hidden="true"
          data-pui-context-menu-anchor=""
          style={{ position: "fixed", left: point.x, top: point.y, width: 0, height: 0, pointerEvents: "none" }}
          className={cn(blockReset, "block")}
        />
      </ExtraContext.Provider>
    </MenuContext.Provider>
  );
}

/** The area that opens the menu. Focusable descendants (or the region itself) get Shift+F10. */
export const ContextMenuTrigger = React.forwardRef<HTMLDivElement, ContextMenuTriggerProps>(function ContextMenuTrigger(
  {
    asChild = false,
    onContextMenu,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    className,
    style,
    ...props
  },
  ref,
) {
  const menu = useMenu("ContextMenuTrigger");
  const extra = useExtra("ContextMenuTrigger");
  const mergedRef = React.useMemo(() => mergeRefs(menu.triggerRef, ref), [menu.triggerRef, ref]);
  const press = React.useRef<{ timer: number; x: number; y: number; fired: boolean }>({
    timer: 0,
    x: 0,
    y: 0,
    fired: false,
  });

  React.useEffect(() => {
    const state = press.current;
    return () => window.clearTimeout(state.timer);
  }, []);

  const cancelPress = () => {
    window.clearTimeout(press.current.timer);
    press.current.timer = 0;
  };

  const openFromElement = (target: Element) => {
    const rect = target.getBoundingClientRect();
    extra.openAt({ x: rect.left + Math.min(16, rect.width / 2), y: rect.top + Math.min(rect.height, 32) }, "first");
  };

  const shared = {
    id: menu.triggerId,
    "data-state": menu.open ? "open" : "closed",
    "data-disabled": extra.disabled ? "" : undefined,
    ...props,
    onContextMenu: composeEventHandlers(onContextMenu, (event: React.MouseEvent<HTMLElement>) => {
      if (extra.disabled) return;
      event.preventDefault();
      // Android fires contextmenu after a long press that already opened the menu.
      if (press.current.fired) {
        press.current.fired = false;
        return;
      }
      // Keyboard-originated contextmenu events (Menu key) report 0,0 in some browsers.
      if (event.clientX === 0 && event.clientY === 0 && event.target instanceof Element) openFromElement(event.target);
      else extra.openAt({ x: event.clientX, y: event.clientY }, "content");
    }),
    onKeyDown: composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLElement>) => {
      if (extra.disabled) return;
      if ((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu") {
        event.preventDefault();
        openFromElement(event.target instanceof Element ? event.target : event.currentTarget);
      }
    }),
    onPointerDown: composeEventHandlers(onPointerDown, (event: React.PointerEvent<HTMLElement>) => {
      press.current.fired = false;
      if (extra.disabled || event.pointerType !== "touch") return;
      cancelPress();
      const { clientX: x, clientY: y } = event;
      press.current.x = x;
      press.current.y = y;
      press.current.timer = window.setTimeout(() => {
        press.current.timer = 0;
        press.current.fired = true;
        navigator.vibrate?.(8);
        extra.openAt({ x, y }, "content");
      }, extra.longPressMs);
    }),
    onPointerMove: composeEventHandlers(onPointerMove, (event: React.PointerEvent<HTMLElement>) => {
      if (!press.current.timer) return;
      if (Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > MOVE_TOLERANCE) cancelPress();
    }),
    onPointerUp: composeEventHandlers(onPointerUp, cancelPress),
    onPointerCancel: composeEventHandlers(onPointerCancel, cancelPress),
    style: { WebkitTouchCallout: "none", ...style } as React.CSSProperties,
  };
  if (asChild) return <Slot ref={mergedRef} {...shared} className={className} />;
  return <div ref={mergedRef} {...shared} className={cn(blockReset, className)} />;
});

/** The menu itself; place ContextMenuItem, ContextMenuSub, ... inside. */
export const ContextMenuContent = React.forwardRef<HTMLDivElement, ContextMenuContentProps>(function ContextMenuContent(
  { label = "Context menu", className, ...props },
  ref,
) {
  const extra = useExtra("ContextMenuContent");
  return (
    <DropdownMenuContent
      key={extra.openCount}
      ref={ref}
      side="bottom"
      align="start"
      sideOffset={2}
      aria-labelledby={undefined}
      aria-label={label}
      {...props}
      className={cn("origin-top-left data-[side=top]:origin-bottom-left", className)}
    />
  );
});
