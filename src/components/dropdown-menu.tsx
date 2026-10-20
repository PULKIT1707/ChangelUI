"use client";

import { AnimatePresence, motion, useIsPresent } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { CheckIcon, ChevronRightIcon } from "../lib/icons";
import { useLayer } from "../lib/layers";
import { MenuContext, useMenu, type MenuContextValue, type MenuFocusTarget } from "../lib/menu-context";
import { easings, springs } from "../lib/motion";
import { Portal } from "../lib/portal";
import { usePosition } from "../lib/position";
import { RovingFocusProvider, useRovingFocus, useRovingItem } from "../lib/roving-focus";
import { Slot } from "../lib/slot";
import { blockReset, controlReset } from "../lib/styles";
import type { Align, MotionSafeHTMLProps, Side } from "../lib/types";
import { useLatestRef } from "../lib/use-latest-ref";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export interface DropdownMenuContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Default "bottom". */
  side?: Side;
  /** Default "start". */
  align?: Align;
  /** Default 6 px. */
  sideOffset?: number;
  /** Wrap arrow navigation. Default true. */
  loop?: boolean;
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
}

export interface DropdownMenuItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Called on activation; event.preventDefault() keeps the menu open. */
  onSelect?: (event: Event) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  /** Shortcut hint shown at the end, e.g. "⌘K". */
  shortcut?: string;
  /** Default "neutral". */
  tone?: "neutral" | "danger";
  /** Render the single child element (e.g. <a href>) as the item. */
  asChild?: boolean;
}

export interface DropdownMenuCheckboxItemProps extends Omit<DropdownMenuItemProps, "asChild" | "tone"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export interface DropdownMenuSubProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export type DropdownMenuSubTriggerProps = Omit<DropdownMenuItemProps, "asChild" | "onSelect">;

export interface DropdownMenuSubContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Gap to the trigger in px; negative overlaps the parent menu. Default -4. */
  sideOffset?: number;
  /** Shift along the trigger in px, so the first item lines up with it. Default -5. */
  alignOffset?: number;
  /** Wrap arrow navigation. Default true. */
  loop?: boolean;
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
}

export interface DropdownMenuRadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export interface DropdownMenuRadioItemProps extends Omit<DropdownMenuItemProps, "asChild" | "tone"> {
  value: string;
}

export type DropdownMenuLabelProps = React.HTMLAttributes<HTMLDivElement>;
export type DropdownMenuSeparatorProps = React.HTMLAttributes<HTMLDivElement>;
export type DropdownMenuGroupProps = React.HTMLAttributes<HTMLDivElement>;

type FocusTarget = MenuFocusTarget;

interface ContentContextValue {
  highlighted: string | null;
  setHighlighted: (key: string | null) => void;
  /** Per (sub)menu, so the sliding highlight never flies between a menu and its submenu. */
  layoutGroup: string;
  /** The (sub)menu element; it takes focus when the pointer leaves an item. */
  contentRef: React.RefObject<HTMLDivElement | null>;
  /** True while the pointer travels from a SubTrigger toward its open submenu. */
  isPointerInTransit: () => boolean;
  setPointerInTransit: (inTransit: boolean) => void;
}

interface SubPointer {
  onTriggerMove: () => void;
  onTriggerLeave: (x: number, y: number) => void;
  onContentEnter: () => void;
  reset: () => void;
}

interface SubContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Opens the submenu; "first" focuses its first item once positioned. */
  openWith: (focus: "first" | "none") => void;
  focusTargetRef: React.RefObject<"first" | "none">;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  triggerId: string;
  contentId: string;
  pointer: SubPointer;
}

interface RadioContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
}

const ContentContext = React.createContext<ContentContextValue>({
  highlighted: null,
  setHighlighted: () => {},
  layoutGroup: "",
  contentRef: { current: null },
  isPointerInTransit: () => false,
  setPointerInTransit: () => {},
});
const SubContext = React.createContext<SubContextValue | null>(null);
const RadioContext = React.createContext<RadioContextValue | null>(null);

const ITEM_SELECTOR = "[data-roving-item]:not([data-disabled])";
const TYPEAHEAD_MS = 500;
const HOVER_OPEN_MS = 100;
const CLOSE_GRACE_MS = 300;
/** Tolerance around the pointer's safe triangle toward an open submenu. */
const TRANSIT_PAD = 4;

const enterOffset: Record<Side, { x?: number; y?: number }> = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
};

/** Menu of actions anchored to a trigger (design 7.1 #25). */
export function DropdownMenu({ open: openProp, defaultOpen = false, onOpenChange, children }: DropdownMenuProps) {
  const id = React.useId();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const focusTargetRef = React.useRef<FocusTarget>("first");
  const context = React.useMemo<MenuContextValue>(
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
      anchorRef: triggerRef,
      contentRef,
      triggerId: `${id}-trigger`,
      contentId: `${id}-content`,
      closeAndFocus: () => {
        setOpen(false);
        triggerRef.current?.focus();
      },
    }),
    [id, open, setOpen],
  );
  return <MenuContext.Provider value={context}>{children}</MenuContext.Provider>;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  function DropdownMenuTrigger({ asChild = false, type, onClick, onKeyDown, className, ...props }, ref) {
    const menu = useMenu("DropdownMenuTrigger");
    const mergedRef = React.useMemo(() => mergeRefs(menu.triggerRef, ref), [menu.triggerRef, ref]);
    const shared = {
      id: menu.triggerId,
      "aria-haspopup": "menu" as const,
      "aria-expanded": menu.open,
      "aria-controls": menu.open ? menu.contentId : undefined,
      "data-state": menu.open ? "open" : "closed",
      ...props,
      onKeyDown: composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
          event.preventDefault();
          menu.openWith("first");
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          menu.openWith("last");
        }
      }),
      onClick: composeEventHandlers(onClick, (event: React.MouseEvent<HTMLElement>) => {
        // Keyboard-generated clicks are handled in onKeyDown.
        if (event.detail === 0 && menu.open) return;
        if (menu.open) menu.setOpen(false);
        else menu.openWith(event.detail === 0 ? "first" : "content");
      }),
    };
    // asChild: the child (often a library Button) applies its own reset. controlReset here would
    // land after the child's variant classes and strip its border, padding and background.
    if (asChild) return <Slot ref={mergedRef} {...shared} className={className} />;
    return <button ref={mergedRef} type={type ?? "button"} {...shared} className={cn(controlReset, className)} />;
  },
);

type ContentImplProps = Omit<DropdownMenuContentProps, "container"> & { forwardedRef: React.Ref<HTMLDivElement> };

function enabledItems(content: HTMLElement): HTMLElement[] {
  return [...content.querySelectorAll<HTMLElement>(ITEM_SELECTOR)].filter(
    (el) => el.closest("[data-roving-container]") === content,
  );
}

interface TypeaheadState {
  buffer: string;
  timer: number;
}

/** Shared by menus and submenus: Home/End from the content, typeahead, then roving arrows. */
function handleMenuKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  state: TypeaheadState,
  rovingKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void,
): void {
  const content = event.currentTarget;
  const items = enabledItems(content);
  if (event.target === content) {
    const first = event.key === "ArrowDown" || event.key === "Home";
    const last = event.key === "ArrowUp" || event.key === "End";
    if (first || last) {
      event.preventDefault();
      (first ? items[0] : items[items.length - 1])?.focus();
      return;
    }
  }
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " ") {
    window.clearTimeout(state.timer);
    state.buffer += event.key.toLowerCase();
    state.timer = window.setTimeout(() => {
      state.buffer = "";
    }, TYPEAHEAD_MS);
    const current = items.indexOf(event.target as HTMLElement);
    // A repeated single letter cycles through the matches.
    const repeated = state.buffer.split("").every((c) => c === state.buffer[0]);
    const search = repeated ? (state.buffer[0] ?? "") : state.buffer;
    const ordered = [...items.slice(current + 1), ...items.slice(0, current + 1)];
    const candidates = repeated ? ordered : items;
    const match = candidates.find((el) => (el.textContent ?? "").trim().toLowerCase().startsWith(search));
    if (match) {
      event.preventDefault();
      match.focus();
    }
    return;
  }
  rovingKeyDown(event);
}

function MenuContentImpl({
  side = "bottom",
  align = "start",
  sideOffset = 6,
  loop = true,
  forwardedRef,
  className,
  style,
  onKeyDown,
  children,
  ...props
}: ContentImplProps) {
  const menu = useMenu("DropdownMenuContent");
  const isPresent = useIsPresent();
  const reduced = usePrefersReducedMotion();
  const [highlighted, setHighlighted] = React.useState<string | null>(null);
  const appliedRef = React.useRef(false);
  const typeahead = React.useRef({ buffer: "", timer: 0 });
  const ref = React.useMemo(() => mergeRefs(menu.contentRef, forwardedRef), [menu.contentRef, forwardedRef]);
  const position = usePosition({
    anchor: menu.anchorRef,
    floating: menu.contentRef,
    open: true,
    side,
    align,
    sideOffset,
  });
  const { containerProps, value: rovingValue } = useRovingFocus({ orientation: "vertical", loop, manageTabStop: false });

  useLayer(isPresent, {
    kind: "menu",
    onEscape: menu.closeAndFocus,
    onPointerDownOutside: () => menu.setOpen(false),
    contentEls: () => [menu.contentRef.current, menu.anchorRef.current],
  });

  // The requested focus target is applied once the content is positioned (and focusable).
  const { ready } = position;
  React.useEffect(() => {
    const content = menu.contentRef.current;
    if (!isPresent || !ready || appliedRef.current || !content) return;
    appliedRef.current = true;
    const items = enabledItems(content);
    const target = menu.focusTargetRef.current;
    const el = target === "first" ? items[0] : target === "last" ? items[items.length - 1] : undefined;
    (el ?? content).focus({ preventScroll: true });
  }, [isPresent, ready, menu.contentRef, menu.focusTargetRef]);

  React.useEffect(() => {
    const state = typeahead.current;
    return () => window.clearTimeout(state.timer);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Keys from a portaled submenu bubble here through the React tree; the submenu handles them.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.key === "Tab") {
      event.preventDefault();
      menu.closeAndFocus();
      return;
    }
    handleMenuKeyDown(event, typeahead.current, containerProps.onKeyDown);
  };

  const transitRef = React.useRef(false);
  const contentContext = React.useMemo<ContentContextValue>(
    () => ({
      highlighted,
      setHighlighted,
      layoutGroup: menu.id,
      contentRef: menu.contentRef,
      isPointerInTransit: () => transitRef.current,
      setPointerInTransit: (inTransit) => {
        transitRef.current = inTransit;
      },
    }),
    [highlighted, menu.id, menu.contentRef],
  );
  const offset = reduced ? {} : enterOffset[side];

  return (
    <RovingFocusProvider value={rovingValue}>
      <ContentContext.Provider value={contentContext}>
        <motion.div
          ref={ref}
          id={menu.contentId}
          role="menu"
          aria-labelledby={menu.triggerId}
          aria-orientation="vertical"
          tabIndex={-1}
          data-state={isPresent ? "open" : "closed"}
          data-side={position.side}
          data-align={position.align}
          data-roving-container=""
          initial={{ opacity: 0, scale: reduced ? 1 : 0.96, ...offset }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          {...props}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented) handleKeyDown(event);
          }}
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            visibility: position.ready ? undefined : "hidden",
            ...style,
          }}
          className={cn(
            blockReset,
            "z-(--pui-z-popover) min-w-44 max-w-[calc(100vw-1rem)] rounded-pui-lg border border-pui-border bg-pui-surface backdrop-blur-(--pui-surface-blur) p-1 text-sm text-pui-surface-foreground shadow-pui-lg outline-hidden",
            className,
          )}
        >
          {children}
        </motion.div>
      </ContentContext.Provider>
    </RovingFocusProvider>
  );
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuContent({ container, ...props }, ref) {
    const menu = useMenu("DropdownMenuContent");
    return (
      <Portal container={container}>
        <AnimatePresence>
          {menu.open ? <MenuContentImpl key="menu" {...props} forwardedRef={ref} /> : null}
        </AnimatePresence>
      </Portal>
    );
  },
);

interface ItemBaseProps extends Omit<DropdownMenuItemProps, "role"> {
  role: "menuitem" | "menuitemcheckbox" | "menuitemradio";
  checked?: boolean;
  indicator?: React.ReactNode;
  onActivate?: () => void;
  /** Replaces the select-and-close semantics (SubTrigger opens its submenu instead). */
  activateOverride?: () => void;
  /** Keep the highlight while the item's submenu is open. */
  forceHighlight?: boolean;
  /** Trailing content after the shortcut (SubTrigger chevron). */
  trailing?: React.ReactNode;
  forwardedRef: React.Ref<HTMLDivElement>;
  /** The submenu's anchor (SubTrigger only). */
  subTriggerRef?: React.Ref<HTMLDivElement>;
}

const itemTones = {
  neutral: "text-pui-surface-foreground",
  danger: "text-pui-danger-text",
} as const;

const highlightTones = {
  neutral: "bg-pui-muted",
  danger: "bg-pui-danger/12",
} as const;

function MenuItemBase({
  role,
  checked,
  indicator,
  onActivate,
  activateOverride,
  forceHighlight = false,
  trailing,
  subTriggerRef,
  onSelect,
  disabled = false,
  icon,
  shortcut,
  tone = "neutral",
  asChild = false,
  forwardedRef,
  className,
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  onPointerMove,
  onPointerLeave,
  children,
  ...props
}: ItemBaseProps) {
  const menu = useMenu("DropdownMenuItem");
  const content = React.useContext(ContentContext);
  const key = React.useId();
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(
    () => mergeRefs(localRef, forwardedRef, subTriggerRef),
    [forwardedRef, subTriggerRef],
  );
  const roving = useRovingItem(key, { ref: localRef, disabled });
  const highlighted = content.highlighted === key;
  const showHighlight = highlighted || forceHighlight;
  const checkable = role !== "menuitem";

  const activate = () => {
    if (disabled) return;
    if (activateOverride) {
      activateOverride();
      return;
    }
    onActivate?.();
    const event = new Event("pui.menu.select", { cancelable: true });
    onSelect?.(event);
    if (!event.defaultPrevented) menu.closeAndFocus();
  };

  const Comp: React.ElementType = asChild ? Slot : "div";
  return (
    <Comp
      ref={mergedRef}
      role={role}
      aria-checked={checkable ? checked === true : undefined}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      data-highlighted={showHighlight ? "" : undefined}
      data-state={checkable ? (checked ? "checked" : "unchecked") : undefined}
      data-tone={tone}
      {...props}
      tabIndex={roving.tabIndex}
      data-roving-item={roving["data-roving-item"]}
      data-key={roving["data-key"]}
      onFocus={composeEventHandlers(onFocus, (event: React.FocusEvent<HTMLElement>) => {
        roving.onFocus();
        if (event.target === event.currentTarget) content.setHighlighted(key);
      })}
      onBlur={composeEventHandlers(onBlur, () => {
        if (content.highlighted === key) content.setHighlighted(null);
      })}
      onPointerMove={composeEventHandlers(onPointerMove, (event: React.PointerEvent<HTMLElement>) => {
        // Crossing siblings on the way into an open submenu must not steal focus or close it.
        if (content.isPointerInTransit()) return;
        if (!disabled && document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true });
      })}
      onPointerLeave={(event: React.PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(event);
        if (!event.defaultPrevented && document.activeElement === event.currentTarget) {
          content.contentRef.current?.focus({ preventScroll: true });
        }
      }}
      onClick={composeEventHandlers(onClick, activate)}
      onKeyDown={composeEventHandlers(onKeyDown, (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      })}
      className={cn(
        blockReset,
        "relative isolate flex cursor-pointer select-none items-center gap-2 rounded-pui-md px-2 py-1.5 text-sm no-underline outline-hidden",
        itemTones[tone],
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {asChild ? (
        children
      ) : (
        <>
          {showHighlight ? (
            <motion.span
              layoutId={`${content.layoutGroup}-highlight`}
              transition={springs.snappy}
              aria-hidden="true"
              data-pui-menu-highlight=""
              className={cn(blockReset, "absolute inset-0 -z-10 block rounded-pui-md", highlightTones[tone])}
            />
          ) : null}
          {indicator}
          {icon ? <span className={cn(blockReset, "inline-flex size-4 shrink-0 items-center justify-center")}>{icon}</span> : null}
          <span className={cn(blockReset, "flex-1 truncate")}>{children}</span>
          {shortcut ? (
            <span className={cn(blockReset, "ms-auto ps-4 text-xs tracking-wide text-pui-muted-foreground")}>{shortcut}</span>
          ) : null}
          {trailing}
        </>
      )}
    </Comp>
  );
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(function DropdownMenuItem(
  props,
  ref,
) {
  return <MenuItemBase {...props} role="menuitem" forwardedRef={ref} />;
});

export const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  function DropdownMenuCheckboxItem({ checked: checkedProp, defaultChecked = false, onCheckedChange, ...props }, ref) {
    const [checked, setChecked] = useControllableState({
      value: checkedProp,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });
    return (
      <MenuItemBase
        {...props}
        role="menuitemcheckbox"
        checked={checked}
        onActivate={() => setChecked(!checked)}
        indicator={
          <span aria-hidden="true" className={cn(blockReset, "inline-flex size-4 shrink-0 items-center justify-center")}>
            {checked ? <CheckIcon className="size-3.5" /> : null}
          </span>
        }
        forwardedRef={ref}
      />
    );
  },
);

export const DropdownMenuRadioGroup = React.forwardRef<HTMLDivElement, DropdownMenuRadioGroupProps>(
  function DropdownMenuRadioGroup({ value: valueProp, defaultValue, onValueChange, className, ...props }, ref) {
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange as ((value: string | undefined) => void) | undefined,
    });
    const context = React.useMemo<RadioContextValue>(() => ({ value, setValue }), [value, setValue]);
    return (
      <RadioContext.Provider value={context}>
        <div ref={ref} role="group" {...props} className={cn(blockReset, className)} />
      </RadioContext.Provider>
    );
  },
);

export const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  function DropdownMenuRadioItem({ value, ...props }, ref) {
    const group = React.useContext(RadioContext);
    if (!group) throw new Error("[changelui] DropdownMenuRadioItem must be used inside DropdownMenuRadioGroup");
    const checked = group.value === value;
    return (
      <MenuItemBase
        {...props}
        role="menuitemradio"
        checked={checked}
        onActivate={() => group.setValue(value)}
        indicator={
          <span aria-hidden="true" className={cn(blockReset, "inline-flex size-4 shrink-0 items-center justify-center")}>
            {checked ? <span className={cn(blockReset, "block size-1.5 rounded-pui-full bg-current")} /> : null}
          </span>
        }
        forwardedRef={ref}
      />
    );
  },
);

type Point = { x: number; y: number };

function inTriangle(p: Point, [a, b, c]: readonly [Point, Point, Point]): boolean {
  const side = (p1: Point, p2: Point, p3: Point) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = side(p, a, b);
  const d2 = side(p, b, c);
  const d3 = side(p, c, a);
  const negative = d1 < 0 || d2 < 0 || d3 < 0;
  const positive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(negative && positive);
}

/** Nested menu state; place a SubTrigger and a SubContent inside it. */
export function DropdownMenuSub({ open: openProp, defaultOpen = false, onOpenChange, children }: DropdownMenuSubProps) {
  const id = React.useId();
  const menu = useMenu("DropdownMenuSub");
  const parent = React.useContext(ContentContext);
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const focusTargetRef = React.useRef<"first" | "none">("none");
  const timers = React.useRef({ open: 0, close: 0, move: null as ((event: PointerEvent) => void) | null });
  const openRef = useLatestRef(open);
  const setOpenRef = useLatestRef(setOpen);
  const parentRef = useLatestRef(parent);

  // Pointer intent (design: safe triangle). Leaving the trigger toward the open submenu keeps it
  // open while the pointer stays inside the triangle from the exit point to the submenu's near edge;
  // leaving it elsewhere closes the submenu after a short grace period.
  const pointer = React.useMemo<SubPointer>(() => {
    const clearOpen = () => {
      window.clearTimeout(timers.current.open);
      timers.current.open = 0;
    };
    const clearClose = () => {
      window.clearTimeout(timers.current.close);
      timers.current.close = 0;
    };
    const endTransit = () => {
      const { move } = timers.current;
      if (move) document.removeEventListener("pointermove", move);
      timers.current.move = null;
      parentRef.current.setPointerInTransit(false);
    };
    const scheduleClose = () => {
      clearClose();
      timers.current.close = window.setTimeout(() => {
        timers.current.close = 0;
        setOpenRef.current(false);
      }, CLOSE_GRACE_MS);
    };
    return {
      onTriggerMove() {
        clearClose();
        endTransit();
        if (openRef.current || timers.current.open) return;
        timers.current.open = window.setTimeout(() => {
          timers.current.open = 0;
          focusTargetRef.current = "none";
          setOpenRef.current(true);
        }, HOVER_OPEN_MS);
      },
      onTriggerLeave(x, y) {
        clearOpen();
        endTransit();
        const content = contentRef.current;
        if (!openRef.current || !content) return;
        const rect = content.getBoundingClientRect();
        const toRight = rect.left + rect.width / 2 >= x;
        const edge = toRight ? rect.left : rect.right;
        const triangle = [
          { x: x + (toRight ? -TRANSIT_PAD : TRANSIT_PAD), y },
          { x: edge, y: rect.top - TRANSIT_PAD },
          { x: edge, y: rect.bottom + TRANSIT_PAD },
        ] as const;
        const move = (event: PointerEvent) => {
          const p = { x: event.clientX, y: event.clientY };
          const insideContent = p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
          if (insideContent) endTransit();
          else if (!inTriangle(p, triangle)) {
            endTransit();
            scheduleClose();
          }
        };
        timers.current.move = move;
        document.addEventListener("pointermove", move);
        parentRef.current.setPointerInTransit(true);
      },
      onContentEnter() {
        clearClose();
        endTransit();
      },
      reset() {
        clearOpen();
        clearClose();
        endTransit();
      },
    };
  }, [openRef, setOpenRef, parentRef]);

  React.useEffect(() => {
    if (!open) pointer.reset();
  }, [open, pointer]);
  React.useEffect(() => () => pointer.reset(), [pointer]);

  const context = React.useMemo<SubContextValue>(
    () => ({
      open: open && menu.open,
      setOpen,
      openWith: (focus) => {
        focusTargetRef.current = focus;
        // Already open (by hover): move focus in now instead of waiting for the next open.
        const content = contentRef.current;
        if (open && content) {
          if (focus === "first") enabledItems(content)[0]?.focus({ preventScroll: true });
        } else setOpen(true);
      },
      focusTargetRef,
      triggerRef,
      contentRef,
      triggerId: `${id}-sub-trigger`,
      contentId: `${id}-sub-content`,
      pointer,
    }),
    [open, menu.open, setOpen, id, pointer],
  );
  return <SubContext.Provider value={context}>{children}</SubContext.Provider>;
}

function useSub(part: string): SubContextValue {
  const context = React.useContext(SubContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside DropdownMenuSub`);
  return context;
}

/** Menu item that opens its DropdownMenuSub (hover, ArrowRight, Enter or Space). */
export const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  function DropdownMenuSubTrigger({ onKeyDown, onPointerMove, onPointerLeave, disabled, ...props }, ref) {
    const sub = useSub("DropdownMenuSubTrigger");
    const content = React.useContext(ContentContext);
    return (
      <MenuItemBase
        id={sub.triggerId}
        aria-haspopup="menu"
        aria-expanded={sub.open}
        aria-controls={sub.open ? sub.contentId : undefined}
        data-state={sub.open ? "open" : "closed"}
        {...props}
        disabled={disabled}
        role="menuitem"
        activateOverride={() => sub.openWith("first")}
        forceHighlight={sub.open && content.highlighted === null}
        trailing={<ChevronRightIcon className="ms-auto size-4 text-pui-muted-foreground" />}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || disabled || event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            sub.openWith("first");
          }
        }}
        onPointerMove={(event: React.PointerEvent<HTMLDivElement>) => {
          onPointerMove?.(event);
          if (!event.defaultPrevented && !disabled) sub.pointer.onTriggerMove();
        }}
        onPointerLeave={(event: React.PointerEvent<HTMLDivElement>) => {
          onPointerLeave?.(event);
          if (event.defaultPrevented) return;
          sub.pointer.onTriggerLeave(event.clientX, event.clientY);
          // Keep focus on the trigger while its submenu is open.
          if (sub.open) event.preventDefault();
        }}
        forwardedRef={ref}
        subTriggerRef={sub.triggerRef}
      />
    );
  },
);

type SubContentImplProps = Omit<DropdownMenuSubContentProps, "container"> & {
  forwardedRef: React.Ref<HTMLDivElement>;
};

function SubContentImpl({
  sideOffset = -4,
  alignOffset = -5,
  loop = true,
  forwardedRef,
  className,
  style,
  onKeyDown,
  onPointerEnter,
  children,
  ...props
}: SubContentImplProps) {
  const menu = useMenu("DropdownMenuSubContent");
  const sub = useSub("DropdownMenuSubContent");
  const root = React.useContext(ContentContext);
  const isPresent = useIsPresent();
  const reduced = usePrefersReducedMotion();
  const [highlighted, setHighlighted] = React.useState<string | null>(null);
  const appliedRef = React.useRef(false);
  const typeahead = React.useRef<TypeaheadState>({ buffer: "", timer: 0 });
  const transitRef = React.useRef(false);
  const ref = React.useMemo(() => mergeRefs(sub.contentRef, forwardedRef), [sub.contentRef, forwardedRef]);
  const position = usePosition({
    anchor: sub.triggerRef,
    floating: sub.contentRef,
    open: true,
    side: "right",
    align: "start",
    sideOffset,
    alignOffset,
  });
  const { containerProps, value: rovingValue } = useRovingFocus({ orientation: "vertical", loop, manageTabStop: false });

  const closeToTrigger = () => {
    sub.setOpen(false);
    sub.triggerRef.current?.focus({ preventScroll: true });
  };
  useLayer(isPresent, {
    kind: "menu",
    onEscape: closeToTrigger,
    // A pointerdown back in the parent menu closes only this submenu; anywhere else closes the menu.
    onPointerDownOutside: (event) => {
      const target = event.target;
      const inParent =
        target instanceof Node &&
        (root.contentRef.current?.contains(target) === true || menu.anchorRef.current?.contains(target) === true);
      if (inParent) sub.setOpen(false);
      else menu.setOpen(false);
    },
    contentEls: () => [sub.contentRef.current, sub.triggerRef.current],
  });

  const { ready } = position;
  React.useEffect(() => {
    const content = sub.contentRef.current;
    if (!isPresent || !ready || appliedRef.current || !content) return;
    appliedRef.current = true;
    if (sub.focusTargetRef.current === "first") enabledItems(content)[0]?.focus({ preventScroll: true });
  }, [isPresent, ready, sub.contentRef, sub.focusTargetRef]);

  React.useEffect(() => {
    const state = typeahead.current;
    return () => window.clearTimeout(state.timer);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.key === "Tab") {
      event.preventDefault();
      menu.closeAndFocus();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      closeToTrigger();
      return;
    }
    handleMenuKeyDown(event, typeahead.current, containerProps.onKeyDown);
  };

  const contentContext = React.useMemo<ContentContextValue>(
    () => ({
      highlighted,
      setHighlighted,
      layoutGroup: sub.contentId,
      contentRef: sub.contentRef,
      isPointerInTransit: () => transitRef.current,
      setPointerInTransit: (inTransit) => {
        transitRef.current = inTransit;
      },
    }),
    [highlighted, sub.contentId, sub.contentRef],
  );
  const shift = reduced ? 0 : position.side === "left" ? 4 : -4;

  return (
    <RovingFocusProvider value={rovingValue}>
      <ContentContext.Provider value={contentContext}>
        <motion.div
          ref={ref}
          id={sub.contentId}
          role="menu"
          aria-labelledby={sub.triggerId}
          aria-orientation="vertical"
          tabIndex={-1}
          data-state={isPresent ? "open" : "closed"}
          data-side={position.side}
          data-roving-container=""
          initial={{ opacity: 0 }}
          animate={ready ? { opacity: 1, x: [shift, 0] } : { opacity: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1, ease: easings.out } }}
          transition={{ duration: 0.12, ease: easings.out }}
          {...props}
          onPointerEnter={(event) => {
            onPointerEnter?.(event);
            sub.pointer.onContentEnter();
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented) handleKeyDown(event);
          }}
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            visibility: position.ready ? undefined : "hidden",
            ...style,
          }}
          className={cn(
            blockReset,
            "z-(--pui-z-popover) min-w-40 max-w-[calc(100vw-1rem)] rounded-pui-lg border border-pui-border bg-pui-surface backdrop-blur-(--pui-surface-blur) p-1 text-sm text-pui-surface-foreground shadow-pui-lg outline-hidden",
            className,
          )}
        >
          {children}
        </motion.div>
      </ContentContext.Provider>
    </RovingFocusProvider>
  );
}

/** The submenu panel; opens beside its SubTrigger and flips to the other side when needed. */
export const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  function DropdownMenuSubContent({ container, ...props }, ref) {
    const sub = useSub("DropdownMenuSubContent");
    return (
      <Portal container={container}>
        <AnimatePresence>{sub.open ? <SubContentImpl key="sub" {...props} forwardedRef={ref} /> : null}</AnimatePresence>
      </Portal>
    );
  },
);

export const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(function DropdownMenuLabel(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      {...props}
      className={cn(blockReset, "px-2 py-1.5 text-xs font-medium text-pui-muted-foreground", className)}
    />
  );
});

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  function DropdownMenuSeparator({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        {...props}
        className={cn(blockReset, "-mx-1 my-1 h-px bg-pui-border", className)}
      />
    );
  },
);

export const DropdownMenuGroup = React.forwardRef<HTMLDivElement, DropdownMenuGroupProps>(function DropdownMenuGroup(
  { className, ...props },
  ref,
) {
  return <div ref={ref} role="group" {...props} className={cn(blockReset, className)} />;
});
