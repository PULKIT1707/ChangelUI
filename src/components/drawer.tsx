"use client";

import { useDragControls, type PanInfo } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { composeEventHandlers, mergeRefs } from "../lib/compose";
import { useDialogA11y, useDialogContext } from "../lib/dialog-context";
import { XIcon } from "../lib/icons";
import { ModalLayer } from "../lib/modal";
import { easings, springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import type { Side } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogCloseProps,
  type DialogContentProps,
  type DialogDescriptionProps,
  type DialogFooterProps,
  type DialogHeaderProps,
  type DialogProps,
  type DialogTitleProps,
  type DialogTriggerProps,
} from "./dialog";
import { IconButton } from "./icon-button";

export type DrawerProps = DialogProps;
export type DrawerSize = "sm" | "md" | "lg" | "full";

export interface DrawerContentProps extends Omit<DialogContentProps, "size"> {
  /** Edge the drawer slides in from. Default "right". */
  side?: Side;
  /** left/right widths 320 / 400 / 540 px, top/bottom heights 40 / 60 / 80 dvh, or full. Default "md". */
  size?: DrawerSize;
  /**
   * Drag toward the edge to dismiss (past 30% or faster than 500 px/s). Default true. A swipe starts
   * only from a swipe zone, so content keeps native scrolling, text selection and its own gestures:
   * the grab handle (top edge of bottom drawers, bottom edge of top drawers), an invisible 24 px strip
   * along the inner edge of left/right drawers, or a mouse drag on the panel's own blank padding.
   */
  swipeToDismiss?: boolean;
}

export type DrawerTriggerProps = DialogTriggerProps;
export type DrawerCloseProps = DialogCloseProps;
export type DrawerHeaderProps = DialogHeaderProps;
export type DrawerFooterProps = DialogFooterProps;
export type DrawerTitleProps = DialogTitleProps;
export type DrawerDescriptionProps = DialogDescriptionProps;

const sidePlacement: Record<Side, string> = {
  right: "inset-y-0 right-0 h-full w-full border-s",
  left: "inset-y-0 left-0 h-full w-full border-e",
  top: "inset-x-0 top-0 w-full border-b",
  bottom: "inset-x-0 bottom-0 w-full rounded-t-pui-xl border-t",
};

const sizes: Record<"x" | "y", Record<DrawerSize, string>> = {
  x: { sm: "max-w-[20rem]", md: "max-w-[25rem]", lg: "max-w-[33.75rem]", full: "max-w-none" },
  y: { sm: "h-[40dvh]", md: "h-[60dvh]", lg: "h-[80dvh]", full: "h-dvh" },
};

// Grab handle for top/bottom drawers; the before: box widens the hit area without changing the look.
const handleClasses =
  "relative mx-auto h-1.5 w-12 shrink-0 cursor-grab touch-none select-none rounded-pui-full bg-pui-muted-foreground/40 before:absolute before:-inset-x-6 before:-inset-y-3 before:box-border";

const offscreen: Record<Side, { x?: string; y?: string }> = {
  right: { x: "100%" },
  left: { x: "-100%" },
  top: { y: "-100%" },
  bottom: { y: "100%" },
};

/** Same API and behavior as Dialog (design 7.1 #27). */
export function Drawer(props: DrawerProps) {
  return <Dialog {...props} />;
}

export const DrawerTrigger = React.forwardRef<HTMLButtonElement, DrawerTriggerProps>(function DrawerTrigger(props, ref) {
  return <DialogTrigger ref={ref} {...props} />;
});

export const DrawerClose = React.forwardRef<HTMLButtonElement, DrawerCloseProps>(function DrawerClose(props, ref) {
  return <DialogClose ref={ref} {...props} />;
});

export const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(function DrawerHeader(props, ref) {
  return <DialogHeader ref={ref} {...props} />;
});

export const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(function DrawerFooter(
  { className, ...props },
  ref,
) {
  return <DialogFooter ref={ref} {...props} className={cn("mt-auto pt-6", className)} />;
});

export const DrawerTitle = React.forwardRef<HTMLHeadingElement, DrawerTitleProps>(function DrawerTitle(props, ref) {
  return <DialogTitle ref={ref} {...props} />;
});

export const DrawerDescription = React.forwardRef<HTMLParagraphElement, DrawerDescriptionProps>(
  function DrawerDescription(props, ref) {
    return <DialogDescription ref={ref} {...props} />;
  },
);

/** Edge panel with a smooth slide-in and swipe-to-dismiss. */
export const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(function DrawerContent(
  {
    side = "right",
    size = "md",
    swipeToDismiss = true,
    showClose = true,
    closeLabel = "Close",
    initialFocus,
    container,
    overlayClassName,
    className,
    children,
    onPointerDown,
    onScroll,
    ...props
  },
  ref,
) {
  const dialog = useDialogContext("DrawerContent");
  const dragControls = useDragControls();
  const reduced = usePrefersReducedMotion();
  const aria = useDialogA11y(dialog, props, "Drawer");
  const localRef = React.useRef<HTMLDivElement>(null);
  const mergedRef = React.useMemo(() => mergeRefs(localRef, ref), [ref]);
  const axis = side === "left" || side === "right" ? "x" : "y";
  const swipe = swipeToDismiss && dialog.dismissible;
  const hidden = reduced ? { opacity: 0 } : { opacity: 1, ...offscreen[side] };
  // Drag toward the edge only; the opposite direction is fully constrained.
  const elastic =
    side === "right"
      ? { right: 0.6, left: 0 }
      : side === "left"
        ? { left: 0.6, right: 0 }
        : side === "bottom"
          ? { bottom: 0.6, top: 0 }
          : { top: 0.6, bottom: 0 };

  const onDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const el = localRef.current;
    if (!el) return;
    const sign = side === "right" || side === "bottom" ? 1 : -1;
    const offset = (axis === "x" ? info.offset.x : info.offset.y) * sign;
    const velocity = (axis === "x" ? info.velocity.x : info.velocity.y) * sign;
    const extent = axis === "x" ? el.offsetWidth : el.offsetHeight;
    if (offset > extent * 0.3 || velocity > 500) dialog.setOpen(false);
  };

  const startSwipe = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button === 0) dragControls.start(event);
  };

  // Mouse/pen drags start only on the panel's own blank padding, never on a descendant, so text
  // selection and controls behave natively. Touch on the panel stays with the browser (scrolling).
  const onPanelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (!swipe || event.target !== el || event.pointerType === "touch") return;
    // The scrollbar hit-tests as the panel itself; leave it alone.
    const rect = el.getBoundingClientRect();
    if (event.clientX - rect.left >= el.clientLeft + el.clientWidth) return;
    if (event.clientY - rect.top >= el.clientTop + el.clientHeight) return;
    startSwipe(event);
  };

  // The edge strip is absolute inside the scrolling panel; keep it pinned to the visible area.
  const onPanelScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const edge = event.currentTarget.querySelector<HTMLElement>(":scope > [data-pui-drawer-edge]");
    if (edge) edge.style.transform = `translateY(${event.currentTarget.scrollTop}px)`;
  };

  const handle = (
    <div
      aria-hidden="true"
      data-pui-drawer-handle=""
      onPointerDown={startSwipe}
      className={cn(blockReset, handleClasses, side === "bottom" ? "-mt-3 mb-4" : "mt-4 -mb-3")}
    />
  );

  return (
    <ModalLayer
      open={dialog.open}
      onDismiss={() => dialog.setOpen(false)}
      dismissible={dialog.dismissible}
      container={container}
      initialFocus={initialFocus ?? "first"}
      overlayClassName={overlayClassName}
      initial={hidden}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { ...hidden, transition: { duration: 0.2, ease: easings.inQuint } }
      }
      transition={reduced ? { duration: 0.15 } : springs.heavy}
      drag={swipe ? axis : false}
      // Swipes start from the zones above (dragControls), so Motion leaves the panel's
      // touch-action and user-select alone.
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={elastic}
      dragMomentum={false}
      onDragEnd={swipe ? onDragEnd : undefined}
      data-side={side}
      data-size={size}
      {...props}
      {...aria}
      onPointerDown={composeEventHandlers(onPointerDown, onPanelPointerDown)}
      onScroll={composeEventHandlers(onScroll, onPanelScroll)}
      ref={mergedRef}
      className={cn(
        "flex max-h-dvh flex-col overflow-y-auto border-pui-border bg-pui-surface backdrop-blur-(--pui-surface-blur) p-6 text-pui-surface-foreground shadow-pui-xl outline-hidden",
        sidePlacement[side],
        sizes[axis][size],
        className,
      )}
    >
      {swipe && axis === "x" ? (
        // Inner-edge swipe strip: covers only the panel's 24 px padding, no chrome, never focusable.
        <div
          aria-hidden="true"
          data-pui-drawer-edge=""
          onPointerDown={startSwipe}
          className={cn(
            blockReset,
            "absolute inset-y-0 w-6 cursor-grab touch-pan-y select-none",
            side === "right" ? "left-0" : "right-0",
          )}
        />
      ) : null}
      {side === "bottom" && swipe ? handle : null}
      {children}
      {side === "top" && swipe ? handle : null}
      {showClose ? (
        <IconButton
          aria-label={closeLabel}
          size="sm"
          data-pui-dialog-close=""
          onClick={() => dialog.setOpen(false)}
          className="absolute right-3 top-3"
        >
          <XIcon className="size-4" />
        </IconButton>
      ) : null}
    </ModalLayer>
  );
});
