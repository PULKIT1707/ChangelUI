"use client";

import { AnimatePresence, motion, useIsPresent, type HTMLMotionProps, type Transition } from "motion/react";
import * as React from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { cn } from "../lib/cn";
import { mergeRefs } from "../lib/compose";
import { XIcon } from "../lib/icons";
import { useLayer } from "../lib/layers";
import { easings, springs } from "../lib/motion";
import { Portal } from "../lib/portal";
import { useScrollLock } from "../lib/scroll-lock";
import { blockReset, controlReset, focusRing } from "../lib/styles";
import type { MotionSafeHTMLProps } from "../lib/types";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export interface MorphingDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Spring for the morph. Default springs.layout (380/34). */
  transition?: Transition;
  /** Escape and overlay clicks close it. Default true. */
  dismissible?: boolean;
  children: React.ReactNode;
}

export interface MorphingDialogTriggerProps extends MotionSafeHTMLProps<HTMLButtonElement> {
  /** Corner radius in px, kept undistorted during the morph. Default 16. */
  radius?: number;
}

export interface MorphingDialogContentProps extends MotionSafeHTMLProps<HTMLDivElement> {
  /** Corner radius in px. Default 24. */
  radius?: number;
  /** Portal target. Default document.body. */
  container?: HTMLElement | null;
  overlayClassName?: string;
}

export type MorphingDialogImageProps = Omit<HTMLMotionProps<"img">, "layoutId" | "ref">;
export type MorphingDialogTitleProps = MotionSafeHTMLProps<HTMLHeadingElement>;
export type MorphingDialogSubtitleProps = MotionSafeHTMLProps<HTMLParagraphElement>;
export type MorphingDialogDescriptionProps = MotionSafeHTMLProps<HTMLDivElement>;

export interface MorphingDialogCloseProps extends MotionSafeHTMLProps<HTMLButtonElement> {
  /** Default "Close". */
  "aria-label"?: string;
}

interface MorphingDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  id: string;
  dismissible: boolean;
  transition: Transition;
  reduced: boolean;
}

const MorphingDialogContext = React.createContext<MorphingDialogContextValue | null>(null);
/** Whether a part renders inside the trigger card or the open dialog. */
const PartContext = React.createContext<"trigger" | "content">("trigger");

function useMorphingDialog(part: string): MorphingDialogContextValue {
  const context = React.useContext(MorphingDialogContext);
  if (!context) throw new Error(`[changelui] ${part} must be used inside MorphingDialog`);
  return context;
}

/** Root state for a card that morphs into a dialog. */
export function MorphingDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  transition = springs.layout,
  dismissible = true,
  children,
}: MorphingDialogProps) {
  const id = React.useId();
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const value = React.useMemo<MorphingDialogContextValue>(
    () => ({ open, setOpen, id, dismissible, transition, reduced }),
    [open, setOpen, id, dismissible, transition, reduced],
  );
  return <MorphingDialogContext.Provider value={value}>{children}</MorphingDialogContext.Provider>;
}

/** The card. Its image, title and subtitle fly into the dialog when it opens. */
export const MorphingDialogTrigger = React.forwardRef<HTMLButtonElement, MorphingDialogTriggerProps>(
  function MorphingDialogTrigger({ radius = 16, className, style, children, onClick, ...props }, ref) {
    const dialog = useMorphingDialog("MorphingDialogTrigger");
    return (
      <motion.button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={dialog.open}
        data-state={dialog.open ? "open" : "closed"}
        layoutId={dialog.reduced ? undefined : `${dialog.id}-container`}
        transition={dialog.transition}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) dialog.setOpen(true);
        }}
        style={{ borderRadius: radius, ...style }}
        className={cn(
          controlReset,
          "relative flex cursor-pointer flex-col overflow-hidden border border-pui-border bg-pui-surface text-start text-pui-surface-foreground shadow-pui-sm transition-shadow duration-200 hover:shadow-pui-md",
          focusRing,
          className,
        )}
      >
        <PartContext.Provider value="trigger">{children}</PartContext.Provider>
      </motion.button>
    );
  },
);

interface PanelProps extends MorphingDialogContentProps {
  dialog: MorphingDialogContextValue;
  panelRef: React.Ref<HTMLDivElement>;
}

function MorphingDialogPanel({ dialog, panelRef, radius = 24, className, style, children, ...props }: PanelProps) {
  const isPresent = useIsPresent();
  const localRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useMemo(() => mergeRefs(localRef, panelRef), [panelRef]);
  const { isTopFocusLayer } = useLayer(isPresent, {
    kind: "modal",
    onEscape: () => {
      if (dialog.dismissible) dialog.setOpen(false);
    },
    contentEls: () => [localRef.current],
  });
  useFocusTrap(localRef, { active: isPresent && isTopFocusLayer, initialFocus: "container", returnFocus: !isPresent });
  useScrollLock(isPresent);
  return (
    <div
      className={cn(blockReset, "pointer-events-none fixed inset-0 z-(--pui-z-overlay) flex items-center justify-center p-4")}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialog.id}-title`}
        aria-describedby={`${dialog.id}-description`}
        tabIndex={-1}
        data-state={isPresent ? "open" : "closed"}
        layoutId={dialog.reduced ? undefined : `${dialog.id}-container`}
        transition={dialog.reduced ? { duration: 0.15 } : dialog.transition}
        initial={dialog.reduced ? { opacity: 0 } : undefined}
        animate={dialog.reduced ? { opacity: 1 } : undefined}
        exit={dialog.reduced ? { opacity: 0 } : undefined}
        {...props}
        style={{ borderRadius: radius, ...style }}
        className={cn(
          blockReset,
          "pointer-events-auto relative flex max-h-full w-full max-w-lg flex-col overflow-hidden border border-pui-border bg-pui-surface text-pui-surface-foreground shadow-pui-xl outline-hidden",
          className,
        )}
      >
        <PartContext.Provider value="content">{children}</PartContext.Provider>
      </motion.div>
    </div>
  );
}

/** The dialog the card expands into: overlay, focus trap, scroll lock, Escape and overlay dismissal. */
export const MorphingDialogContent = React.forwardRef<HTMLDivElement, MorphingDialogContentProps>(
  function MorphingDialogContent({ container, overlayClassName, ...props }, ref) {
    const dialog = useMorphingDialog("MorphingDialogContent");
    return (
      <Portal container={container}>
        <AnimatePresence>
          {dialog.open ? (
            <motion.div
              key="overlay"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2, ease: easings.out } }}
              exit={{ opacity: 0, transition: { duration: 0.2, ease: easings.out } }}
              onClick={() => {
                if (dialog.dismissible) dialog.setOpen(false);
              }}
              className={cn(
                blockReset,
                "fixed inset-0 z-(--pui-z-overlay) bg-pui-overlay backdrop-blur-(--pui-overlay-blur)",
                overlayClassName,
              )}
            />
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {dialog.open ? <MorphingDialogPanel key="panel" dialog={dialog} panelRef={ref} {...props} /> : null}
        </AnimatePresence>
      </Portal>
    );
  },
);

/** Shared image: flies between the card and the dialog. Keep the same aspect ratio in both. */
export const MorphingDialogImage = React.forwardRef<HTMLImageElement, MorphingDialogImageProps>(
  function MorphingDialogImage({ className, alt = "", ...props }, ref) {
    const dialog = useMorphingDialog("MorphingDialogImage");
    const part = React.useContext(PartContext);
    return (
      <motion.img
        ref={ref}
        alt={part === "trigger" ? "" : alt}
        layoutId={dialog.reduced ? undefined : `${dialog.id}-image`}
        transition={dialog.transition}
        {...props}
        className={cn(blockReset, "block w-full object-cover", className)}
      />
    );
  },
);

/** Shared title. In the dialog it is the h2 that names it. Only its position animates, so text stays crisp. */
export const MorphingDialogTitle = React.forwardRef<HTMLHeadingElement, MorphingDialogTitleProps>(
  function MorphingDialogTitle({ className, ...props }, ref) {
    const dialog = useMorphingDialog("MorphingDialogTitle");
    const part = React.useContext(PartContext);
    const shared = {
      layoutId: dialog.reduced ? undefined : `${dialog.id}-title`,
      layout: dialog.reduced ? undefined : ("position" as const),
      transition: dialog.transition,
      className: cn(blockReset, "block font-semibold leading-tight tracking-tight", className),
    };
    if (part === "trigger") return <motion.span ref={ref} {...props} {...shared} />;
    return <motion.h2 ref={ref} id={`${dialog.id}-title`} {...props} {...shared} />;
  },
);

/** Shared subtitle (role, price, date...). */
export const MorphingDialogSubtitle = React.forwardRef<HTMLParagraphElement, MorphingDialogSubtitleProps>(
  function MorphingDialogSubtitle({ className, ...props }, ref) {
    const dialog = useMorphingDialog("MorphingDialogSubtitle");
    const part = React.useContext(PartContext);
    const shared = {
      layoutId: dialog.reduced ? undefined : `${dialog.id}-subtitle`,
      layout: dialog.reduced ? undefined : ("position" as const),
      transition: dialog.transition,
      className: cn(blockReset, "block text-sm text-pui-muted-foreground", className),
    };
    if (part === "trigger") return <motion.span ref={ref} {...props} {...shared} />;
    return <motion.p ref={ref} {...props} {...shared} />;
  },
);

/** Dialog-only body text; fades up after the morph and describes the dialog. */
export const MorphingDialogDescription = React.forwardRef<HTMLDivElement, MorphingDialogDescriptionProps>(
  function MorphingDialogDescription({ className, ...props }, ref) {
    const dialog = useMorphingDialog("MorphingDialogDescription");
    return (
      <motion.div
        ref={ref}
        id={`${dialog.id}-description`}
        initial={dialog.reduced ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, transition: { duration: 0.06 } }}
        transition={dialog.reduced ? { duration: 0.15 } : { duration: 0.35, delay: 0.12, ease: easings.out }}
        {...props}
        className={cn(blockReset, "text-sm leading-relaxed text-pui-muted-foreground", className)}
      />
    );
  },
);

/** Round close button for the top corner of the dialog. */
export const MorphingDialogClose = React.forwardRef<HTMLButtonElement, MorphingDialogCloseProps>(
  function MorphingDialogClose({ className, children, onClick, "aria-label": ariaLabel = "Close", ...props }, ref) {
    const dialog = useMorphingDialog("MorphingDialogClose");
    return (
      <motion.button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        initial={dialog.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.06 } }}
        transition={dialog.reduced ? { duration: 0.15 } : { ...springs.bouncy, delay: 0.1 }}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) dialog.setOpen(false);
        }}
        className={cn(
          controlReset,
          "absolute right-3 top-3 z-10 grid size-8 cursor-pointer place-items-center rounded-pui-full bg-pui-background/80 text-pui-foreground shadow-pui-sm backdrop-blur-sm transition-colors hover:bg-pui-background",
          focusRing,
          className,
        )}
      >
        {children ?? <XIcon aria-hidden="true" className="size-4" />}
      </motion.button>
    );
  },
);
