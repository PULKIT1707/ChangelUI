"use client";
// Shared screen-reader helpers for the standalone charts (pie, scatter, sparkline): the sr-only
// class and a polite live region debounced 150 ms, so arrow-key repeat doesn't flood the reader.
import * as React from "react";

/** Visually hidden but read by assistive tech. */
export const srOnly = "absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]";

export function ChartLiveRegion({ text }: { text: string }) {
  const [spoken, setSpoken] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => setSpoken(text), 150);
    return () => clearTimeout(id);
  }, [text]);
  return (
    // A span, so it is valid inside inline parents (sparklines in a sentence).
    <span role="status" aria-live="polite" className={srOnly}>
      {spoken}
    </span>
  );
}
