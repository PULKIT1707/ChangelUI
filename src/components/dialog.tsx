"use client";

import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../lib/cn";
import { composeEventHandlers } from "../lib/compose";
import {
  createPresenceStore,
  DialogContext,
  useDialogA11y,
  useDialogContext,
  useMarkPresence,
  type DialogContextValue,
} from "../lib/dialog-context";
import { XIcon } from "../lib/icons";
import { ModalLayer } from "../lib/modal";
import { easings, springs } from "../lib/motion";
import { Slot } from "../lib/slot";
import { blockReset, controlReset } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { IconButton } from "./icon-button";

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Escape and overlay clicks close the dialog. Default true. */
  dismissible?: boolean;
  children: React.ReactNode;
}

export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

export interface DialogContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** max-width 384 / 512 / 640 / 768 px, or full = 100vw-2rem x 100dvh-2rem. Default "md". */
  size?: DialogSize;
  /** Render the close button (last in the DOM, top-right). Default true. */
  showClose?: boolean;
  /** Default "Close". */
  closeLabel?: string;
  /** Focused on open; default [data-autofocus], then the first tabbable element. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
  overlayClassName?: string;
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export type DialogCloseProps = DialogTriggerProps;
export type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;
export type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
export type DialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const sizes: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-[40rem]",
  xl: "max-w-3xl",
  full: "h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none",
};

/** Root state for Dialog and Drawer. */
export function Dialog({ open: openProp, defaultOpen = false, onOpenChange, dismissible = true, children }: DialogProps) {
  const id = React.useId();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [presence] = React.useState(createPresenceStore);
  const context = React.useMemo<DialogContextValue>(
    () => ({ open, setOpen, dismissible, titleId: `${id}-title`, descriptionId: `${id}-desc`, presence }),
    [open, setOpen, dismissible, id, presence],
  );
  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>;
}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(function DialogTrigger(
  { asChild = false, type, onClick, className, ...props },
  ref,
) {
  const dialog = useDialogContext("DialogTrigger");
  const shared = {
    "aria-haspopup": "dialog" as const,
    "aria-expanded": dialog.open,
    "data-state": dialog.open ? "open" : "closed",
    ...props,
    onClick: composeEventHandlers(onClick, () => dialog.setOpen(true)),
  };
  // asChild: the child (often a library Button) applies its own reset. controlReset here would
  // land after the child's variant classes and strip its border, padding and background.
  if (asChild) return <Slot ref={ref} {...shared} className={className} />;
  return <button ref={ref} type={type ?? "button"} {...shared} className={cn(controlReset, className)} />;
});

export const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(
  { asChild = false, type, onClick, className, ...props },
  ref,
) {
  const dialog = useDialogContext("DialogClose");
  const shared = { ...props, onClick: composeEventHandlers(onClick, () => dialog.setOpen(false)) };
  // asChild: the child applies its own reset (see DialogTrigger).
  if (asChild) return <Slot ref={ref} {...shared} className={className} />;
  return <button ref={ref} type={type ?? "button"} {...shared} className={cn(controlReset, className)} />;
});

/**
 * Modal dialog: focus trap, scroll lock, Escape/overlay dismissal and a spring entrance (design 7.1 #26).
 * Exits are quick eased tweens. A dialog opened over another makes the one beneath recede slightly.
 * Set `--pui-overlay-blur` (a length, default 0px) to blur the page behind the overlay.
 */
export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  {
    size = "md",
    showClose = true,
    closeLabel = "Close",
    initialFocus,
    container,
    overlayClassName,
    className,
    children,
    ...props
  },
  ref,
) {
  const dialog = useDialogContext("DialogContent");
  const reduced = usePrefersReducedMotion();
  const aria = useDialogA11y(dialog, props, "Dialog");
  const hidden = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 };
  return (
    <ModalLayer
      open={dialog.open}
      onDismiss={() => dialog.setOpen(false)}
      dismissible={dialog.dismissible}
      container={container}
      initialFocus={initialFocus ?? "first"}
      overlayClassName={overlayClassName}
      initial={hidden}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { ...hidden, transition: { duration: 0.15, ease: easings.inQuint } }
      }
      transition={reduced ? { duration: 0.15 } : springs.layout}
      recede
      data-size={size}
      {...props}
      {...aria}
      ref={ref}
      className={cn(
        "inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-pui-xl border border-pui-border bg-pui-surface backdrop-blur-(--pui-surface-blur) p-6 text-pui-surface-foreground shadow-pui-xl outline-hidden",
        sizes[size],
        className,
      )}
    >
      {children}
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

export const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(function DialogHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} {...props} className={cn(blockReset, "mb-4 flex flex-col gap-1.5 pe-8", className)} />;
});

export const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(function DialogFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      {...props}
      className={cn(blockReset, "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    />
  );
});

export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(function DialogTitle(
  { className, children, ...props },
  ref,
) {
  const id = useMarkPresence("title");
  return (
    <h2
      ref={ref}
      id={id}
      {...props}
      className={cn(blockReset, "text-lg font-semibold leading-tight tracking-tight text-pui-surface-foreground", className)}
    >
      {children}
    </h2>
  );
});

export const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription({ className, ...props }, ref) {
    const id = useMarkPresence("description");
    return (
      <p ref={ref} id={id} {...props} className={cn(blockReset, "text-sm leading-relaxed text-pui-muted-foreground", className)} />
    );
  },
);
