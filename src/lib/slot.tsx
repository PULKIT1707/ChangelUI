"use client";

import * as React from "react";
import { cn } from "./cn";
import { composeEventHandlers, mergeRefs } from "./compose";

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

type AnyProps = Record<string, unknown>;
type Handler = (event: { defaultPrevented: boolean }) => void;

const HANDLER = /^on[A-Z]/;

function getChildRef(child: React.ReactElement<AnyProps>): React.Ref<HTMLElement> | undefined {
  // React 19 moved ref into props; reading element.ref there logs a warning.
  if (parseInt(React.version, 10) >= 19) return child.props.ref as React.Ref<HTMLElement> | undefined;
  return (child as unknown as { ref?: React.Ref<HTMLElement> }).ref;
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps };
  for (const key of Object.keys(slotProps)) {
    const ours = slotProps[key];
    const theirs = childProps[key];
    if (HANDLER.test(key) && typeof ours === "function") {
      merged[key] =
        typeof theirs === "function"
          ? composeEventHandlers(theirs as Handler, ours as Handler)
          : ours;
    } else if (key === "style") {
      merged.style = { ...(ours as React.CSSProperties), ...(theirs as React.CSSProperties | undefined) };
    } else if (key === "className") {
      merged.className = cn(ours as string, theirs as string | undefined);
    }
  }
  return merged;
}

/**
 * asChild primitive: renders its single child element with merged props (className via cn,
 * child styles win, handlers composed child-first, refs merged).
 */
export const Slot = React.forwardRef<HTMLElement, SlotProps>(function Slot({ children, ...slotProps }, forwardedRef) {
  if (React.Children.count(children) !== 1 || !React.isValidElement(children)) {
    throw new Error("[changelui] asChild expects a single React element child");
  }
  const child = children as React.ReactElement<AnyProps>;
  const childRef = getChildRef(child);
  return React.cloneElement(child, {
    ...mergeProps(slotProps as AnyProps, child.props),
    ref: childRef ? mergeRefs(forwardedRef, childRef) : forwardedRef,
  });
});
