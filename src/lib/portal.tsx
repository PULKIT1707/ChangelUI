"use client";

import type * as React from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "./use-is-client";

export interface PortalProps {
  children?: React.ReactNode;
  /** Portal target; defaults to document.body. */
  container?: Element | DocumentFragment | null;
}

/** Renders children into container (or body) after mount; null on the server and during hydration. */
export function Portal({ children, container }: PortalProps): React.ReactPortal | null {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(children, container ?? document.body);
}
