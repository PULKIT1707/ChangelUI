"use client";

import { AnimatePresence, motion, useIsPresent, type HTMLMotionProps, type TargetAndTransition } from "motion/react";
import * as React from "react";
import { useFocusTrap, type UseFocusTrapOptions } from "../hooks/use-focus-trap";
import { cn } from "./cn";
import { mergeRefs } from "./compose";
import { useLayer } from "./layers";
import { easings, springs } from "./motion";
import { Portal } from "./portal";
import { useScrollLock } from "./scroll-lock";
import { blockReset } from "./styles";
import { usePrefersReducedMotion } from "./use-reduced-motion";

export type ModalDismissReason = "escape" | "overlay";

export interface ModalLayerProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  open: boolean;
  /** Escape or a full click (pointerdown + pointerup) on the overlay, when dismissible. */
  onDismiss: (reason: ModalDismissReason) => void;
  /** Default true. false still swallows Escape so it never reaches layers below. */
  dismissible?: boolean;
  container?: Element | DocumentFragment | null;
  initialFocus?: UseFocusTrapOptions["initialFocus"];
  returnFocus?: UseFocusTrapOptions["returnFocus"];
  overlayClassName?: string;
  overlayProps?: Omit<HTMLMotionProps<"div">, "ref">;
  /**
   * Internal: while another modal sits above this one, scale the content back slightly
   * (nested dialogs). Only applies when `animate` is a plain target object.
   */
  recede?: boolean;
  children?: React.ReactNode;
}

const RECEDE = { scale: 0.97, y: -6 } as const;

type ModalContentProps = Omit<ModalLayerProps, "open" | "container"> & { contentRef: React.Ref<HTMLDivElement> };

function ModalContent({
  onDismiss,
  dismissible = true,
  initialFocus,
  returnFocus,
  overlayClassName,
  overlayProps,
  contentRef,
  recede = false,
  className,
  children,
  ...contentProps
}: ModalContentProps) {
  const isPresent = useIsPresent();
  const reduced = usePrefersReducedMotion();
  const localRef = React.useRef<HTMLDivElement>(null);
  const pointerDownOnOverlay = React.useRef(false);
  const ref = React.useMemo(() => mergeRefs(localRef, contentRef), [contentRef]);

  const { isTopFocusLayer, underModal } = useLayer(isPresent, {
    kind: "modal",
    onEscape: () => {
      if (dismissible) onDismiss("escape");
    },
    contentEls: () => [localRef.current],
  });
  // The trap pauses while another focus layer is on top. Only a real close (exit) returns focus, so
  // a nested layer opening does not pull focus out of this modal.
  useFocusTrap(localRef, {
    active: isPresent && isTopFocusLayer,
    initialFocus,
    returnFocus: isPresent ? false : (returnFocus ?? true),
  });
  useScrollLock(isPresent);

  const { animate, transition, ...restContent } = contentProps;
  const receding = recede && isPresent && underModal && !reduced;
  const plainTarget = typeof animate === "object" && animate !== null && !Array.isArray(animate);
  const contentAnimate =
    receding && plainTarget
      ? ({ ...(animate as TargetAndTransition), ...RECEDE, transition: springs.layout } satisfies TargetAndTransition)
      : (animate ?? { opacity: 1 });

  return (
    <>
      <motion.div
        aria-hidden="true"
        data-state={isPresent ? "open" : "closed"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: reduced ? 0.15 : 0.2, ease: easings.out } }}
        exit={{ opacity: 0, transition: { duration: 0.15, ease: easings.inQuint } }}
        {...overlayProps}
        className={cn(
          blockReset,
          "fixed inset-0 z-(--pui-z-overlay) bg-pui-overlay backdrop-blur-(--pui-overlay-blur)",
          overlayClassName,
        )}
        onPointerDown={(event) => {
          overlayProps?.onPointerDown?.(event);
          pointerDownOnOverlay.current = event.target === event.currentTarget;
        }}
        onPointerUp={(event) => {
          overlayProps?.onPointerUp?.(event);
          const full = pointerDownOnOverlay.current && event.target === event.currentTarget;
          pointerDownOnOverlay.current = false;
          if (full && dismissible) onDismiss("overlay");
        }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        data-state={isPresent ? "open" : "closed"}
        data-under-modal={underModal ? "" : undefined}
        initial={{ opacity: 0 }}
        exit={{ opacity: 0 }}
        {...restContent}
        animate={contentAnimate}
        transition={transition}
        ref={ref}
        className={cn(blockReset, "fixed z-(--pui-z-overlay)", className)}
      >
        {children}
      </motion.div>
    </>
  );
}

/**
 * Shared modal layer for Dialog and Drawer (design 6): Portal, overlay, then content with
 * role="dialog" aria-modal. Wires the layer stack (kind modal), the focus trap (only while the
 * top focus layer), scroll lock, and Escape/overlay dismissal. The ref goes to the content.
 */
export const ModalLayer = React.forwardRef<HTMLDivElement, ModalLayerProps>(function ModalLayer(
  { open, container, ...props },
  ref,
) {
  return (
    <Portal container={container}>
      <AnimatePresence>{open ? <ModalContent key="modal" {...props} contentRef={ref} /> : null}</AnimatePresence>
    </Portal>
  );
});
