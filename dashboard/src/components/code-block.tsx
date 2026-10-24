import { CopyButton, cn } from "changelui";
import { useMemo } from "react";
import { highlight } from "sugar-high";
import { analytics } from "../lib/analytics/client";
import type { CopySurface, SnippetKind } from "../lib/analytics/events";
import { INSTALL_COMMAND } from "../lib/nav";

/** What a copy from this block reports (code_copied, or install_command_copied for the install command). */
export interface CodeBlockAnalytics {
  snippet: SnippetKind;
  surface: CopySurface;
  /** The item or template slug, when the snippet belongs to one. */
  component?: string | null;
}

function trackCopy({ snippet, surface, component }: CodeBlockAnalytics, code: string): void {
  if (snippet === "install" && component == null && code === INSTALL_COMMAND && surface !== "item_page") {
    analytics.track("install_command_copied", { surface });
  } else {
    analytics.track("code_copied", { component: component ?? null, snippet_kind: snippet, surface });
  }
}

export interface CodeBlockProps {
  code: string;
  /** Accessible name of the copy button. */
  copyLabel?: string;
  /** Hides the copy button (when a caller renders its own). */
  copy?: boolean;
  className?: string;
  "data-testid"?: string;
  /** Reports successful copies; without it nothing is tracked. */
  analytics?: CodeBlockAnalytics;
}

/**
 * Syntax-highlighted code (sugar-high, design F12). Token colors come from the dashboard-only
 * `--sh-*` variables in index.css, which are built from library tokens, so both themes work.
 */
export function CodeBlock({
  code,
  copyLabel = "Copy code",
  copy = true,
  className,
  "data-testid": testId,
  analytics: tracking,
}: CodeBlockProps) {
  const html = useMemo(() => highlight(code), [code]);
  return (
    <div className={cn("relative min-w-0", className)}>
      {/* Focusable so keyboard users can scroll long lines (WCAG 2.1.1). */}
      <pre
        tabIndex={0}
        data-testid={testId}
        className="pui-code max-h-[32rem] overflow-auto rounded-pui-lg border border-pui-border bg-pui-background p-4 pe-12 font-mono text-[13px] leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      {copy ? (
        <CopyButton
          value={code}
          label={copyLabel}
          size="sm"
          variant="ghost"
          tone="neutral"
          className="absolute right-2 top-2"
          onCopied={tracking ? (copied) => trackCopy(tracking, copied) : undefined}
        />
      ) : null}
    </div>
  );
}
