import { CopyButton, cn } from "changelui";
import { useMemo } from "react";
import { highlight } from "sugar-high";

export interface CodeBlockProps {
  code: string;
  /** Accessible name of the copy button. */
  copyLabel?: string;
  /** Hides the copy button (when a caller renders its own). */
  copy?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * Syntax-highlighted code (sugar-high, design F12). Token colors come from the dashboard-only
 * `--sh-*` variables in index.css, which are built from library tokens, so both themes work.
 */
export function CodeBlock({ code, copyLabel = "Copy code", copy = true, className, "data-testid": testId }: CodeBlockProps) {
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
        <CopyButton value={code} label={copyLabel} size="sm" variant="ghost" tone="neutral" className="absolute right-2 top-2" />
      ) : null}
    </div>
  );
}
