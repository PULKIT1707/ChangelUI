"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCopyToClipboardOptions {
  /** How long `copied` / `error` stay set. Default 2000. */
  timeoutMs?: number;
}

export interface UseCopyToClipboardResult {
  /** Resolves true on success, false on failure. Never throws. */
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  error: Error | null;
  reset: () => void;
}

/** Hidden-textarea execCommand fallback for insecure contexts and older browsers. */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/** Copies text with the Clipboard API, falling back to execCommand (design 8 #63, 9). */
export function useCopyToClipboard({ timeoutMs = 2000 }: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    setCopied(false);
    setError(null);
  }, []);

  const copy = useCallback(
    async (text: string) => {
      clearTimeout(timerRef.current);
      let ok = false;
      let failure: Error | null = null;
      try {
        if (typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
          throw new Error("Clipboard API unavailable");
        }
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (cause) {
        ok = legacyCopy(text);
        if (!ok) failure = cause instanceof Error ? cause : new Error(String(cause));
      }
      setCopied(ok);
      setError(failure);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        setError(null);
      }, timeoutMs);
      return ok;
    },
    [timeoutMs],
  );

  return { copy, copied, error, reset };
}
