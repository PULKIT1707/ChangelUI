"use client";

import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";
import { Button, type ButtonProps } from "./button";

export interface RippleButtonProps extends Omit<ButtonProps, "asChild"> {
  /** Ripple color, rendered at 25% opacity. Default "currentColor". */
  rippleColor?: string;
  /** Seconds per ripple. Default 0.6. */
  duration?: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

const MAX_RIPPLES = 5;

/** Button with a material-style ripple from the pointer (keyboard: from the center) (design 7.1 #4). */
export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(function RippleButton(
  { rippleColor = "currentColor", duration = 0.6, onClick, className, children, ...props },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const nextId = React.useRef(0);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (reduced || event.defaultPrevented) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const fromKeyboard = event.detail === 0;
    const x = fromKeyboard ? rect.width / 2 : event.clientX - rect.left;
    const y = fromKeyboard ? rect.height / 2 : event.clientY - rect.top;
    const id = nextId.current++;
    setRipples((current) => [...current, { id, x, y, size }].slice(-MAX_RIPPLES));
  };

  const remove = (id: number) => setRipples((current) => current.filter((ripple) => ripple.id !== id));

  return (
    <Button ref={ref} {...props} onClick={handleClick} className={cn("overflow-hidden", className)}>
      {children}
      <span aria-hidden="true" className={cn(blockReset, "pointer-events-none absolute inset-0 block overflow-hidden rounded-[inherit]")}>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            data-pui-ripple=""
            className={cn(blockReset, "absolute block rounded-pui-full")}
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: rippleColor,
            }}
            initial={{ scale: 0, opacity: 0.25 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration, ease: "easeOut" }}
            onAnimationComplete={() => remove(ripple.id)}
          />
        ))}
      </span>
    </Button>
  );
});
