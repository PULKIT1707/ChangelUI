"use client";

import { motion, type Variants } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { CircleCheckIcon, CircleXIcon, InfoIcon, TriangleAlertIcon, XIcon } from "../lib/icons";
import { blockReset } from "../lib/styles";
import { toneClasses } from "../lib/tone";
import type { MotionSafeHTMLProps, Tone } from "../lib/types";
import { useIsClient } from "../lib/use-is-client";
import { IconButton } from "./icon-button";

export type AlertVariant = "soft" | "outline" | "solid";

export interface AlertProps extends Omit<MotionSafeHTMLProps<HTMLDivElement>, "title"> {
  /** Default "info". */
  tone?: Tone;
  /** Default "soft". */
  variant?: AlertVariant;
  title?: React.ReactNode;
  /** Default: the tone icon. false hides it. */
  icon?: React.ReactNode | false;
  /** Trailing action (for example a Button). */
  action?: React.ReactNode;
  /** Renders a dismiss IconButton. */
  onDismiss?: () => void;
  /** Default "Dismiss". */
  dismissLabel?: string;
  /** true: role="alert" for warning/danger, role="status" otherwise. Default false (static callout). */
  live?: boolean;
}

const variants: Record<AlertVariant, string> = {
  soft: "bg-(--pui-tone)/12 text-(--pui-tone-text)",
  outline: "border border-(--pui-tone)/40 text-(--pui-tone-text)",
  solid: "bg-(--pui-tone) text-(--pui-tone-fg)",
};

const toneIcons: Record<Tone, (props: { className?: string }) => React.ReactElement> = {
  neutral: InfoIcon,
  primary: InfoIcon,
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  danger: CircleXIcon,
};

/** Enter and exit variants; wrap in AnimatePresence to animate dismissal. */
const alertMotion: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

/** Inline callout with tone icon, optional action and dismiss button (design 7.1 #30). */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    tone = "info",
    variant = "soft",
    title,
    icon,
    action,
    onDismiss,
    dismissLabel = "Dismiss",
    live = false,
    className,
    children,
    ...props
  },
  ref,
) {
  const role = live ? (tone === "warning" || tone === "danger" ? "alert" : "status") : undefined;
  const ToneIcon = toneIcons[tone];
  const iconNode = icon === false ? null : (icon ?? <ToneIcon className="size-4" />);
  // Server HTML and hydration render the visible state; only client mounts fade in.
  const isClient = useIsClient();

  return (
    <motion.div
      ref={ref}
      role={role}
      data-tone={tone}
      data-variant={variant}
      variants={alertMotion}
      initial={isClient ? "hidden" : false}
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      {...props}
      className={cn(
        blockReset,
        "relative flex w-full items-start gap-3 rounded-pui-lg p-4 text-sm",
        variants[variant],
        toneClasses[tone],
        className,
      )}
    >
      {iconNode ? (
        <span aria-hidden="true" className={cn(blockReset, "mt-0.5 inline-flex shrink-0")}>
          {iconNode}
        </span>
      ) : null}
      <div className={cn(blockReset, "min-w-0 flex-1 leading-5")}>
        {title ? <div className={cn(blockReset, "font-semibold")}>{title}</div> : null}
        {children ? <div className={cn(blockReset, title ? "mt-1" : undefined)}>{children}</div> : null}
      </div>
      {action ? <div className={cn(blockReset, "shrink-0 self-center")}>{action}</div> : null}
      {onDismiss ? (
        <IconButton
          aria-label={dismissLabel}
          size="sm"
          onClick={onDismiss}
          className="-my-1.5 -me-1.5 size-7 shrink-0 text-current hover:bg-current/10"
        >
          <XIcon className="size-4" />
        </IconButton>
      ) : null}
    </motion.div>
  );
});
