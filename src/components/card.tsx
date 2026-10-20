"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { Slot } from "../lib/slot";
import { blockReset } from "../lib/styles";

export type CardVariant = "outline" | "elevated" | "soft";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "outline". */
  variant?: CardVariant;
  /** Hover lift -2px + shadow-pui-md (CSS, motion-safe). Default false. */
  interactive?: boolean;
  /** Render the single child element (for example a link) as the card. */
  asChild?: boolean;
}

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Default "h3". */
  as?: "h2" | "h3" | "h4";
}

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const variants: Record<CardVariant, string> = {
  outline: "bg-pui-surface border border-pui-border",
  elevated: "bg-pui-surface shadow-pui-md",
  soft: "bg-pui-muted",
};
const interactiveClasses =
  "cursor-pointer transition-[translate,box-shadow] duration-(--pui-duration-base) ease-pui-out hover:shadow-pui-md motion-safe:hover:-translate-y-0.5";

/** Surface container with header, content and footer parts (design 7.1 #29). */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "outline", interactive = false, asChild = false, className, ...props },
  ref,
) {
  const Comp: React.ElementType = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      data-variant={variant}
      data-interactive={interactive ? "" : undefined}
      {...props}
      className={cn(
        blockReset,
        "rounded-pui-lg text-pui-surface-foreground",
        variants[variant],
        interactive && interactiveClasses,
        className,
      )}
    />
  );
});

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} {...props} className={cn(blockReset, "flex flex-col gap-1.5 p-5", className)} />;
});

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { as = "h3", className, ...props },
  ref,
) {
  const Tag = as;
  return (
    <Tag
      ref={ref}
      {...props}
      className={cn(blockReset, "text-lg font-semibold leading-tight tracking-tight", className)}
    />
  );
});

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(function CardDescription(
  { className, ...props },
  ref,
) {
  return <p ref={ref} {...props} className={cn(blockReset, "text-sm text-pui-muted-foreground", className)} />;
});

/** Drops its top padding when it follows another card part. */
export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { className, ...props },
  ref,
) {
  return <div ref={ref} {...props} className={cn(blockReset, "p-5 [*+&]:pt-0", className)} />;
});

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { className, ...props },
  ref,
) {
  return (
    <div ref={ref} {...props} className={cn(blockReset, "flex items-center gap-2 p-5 [*+&]:pt-0", className)} />
  );
});
