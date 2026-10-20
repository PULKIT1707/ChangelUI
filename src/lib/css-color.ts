// Resolves CSS colors (including var(--pui-*) tokens and color-mix) to computed color strings that a
// canvas fillStyle accepts. Probes inherit from `host`, so theme presets and .dark islands apply.
// Internal: call from effects and handlers only, never during render.

/** Computed colors for `colors`, in order. Falls back to the host's text color. */
export function resolveCssColors(host: Element, colors: readonly string[]): string[] {
  const doc = host.ownerDocument;
  const view = doc.defaultView;
  if (!view) return colors.slice();
  const probe = doc.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.display = "none";
  host.appendChild(probe);
  const fallback = view.getComputedStyle(host).color;
  const out = colors.map((color) => {
    probe.style.color = "";
    probe.style.color = color;
    return probe.style.color ? view.getComputedStyle(probe).color : fallback;
  });
  probe.remove();
  return out;
}

/** Calls `onChange` when the page theme (class, data-theme, data-pui-theme, style on <html>) changes. */
export function observeTheme(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined" || typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "data-pui-theme", "style"],
  });
  return () => observer.disconnect();
}

/** True when the user asked for reduced motion (imperative APIs that can't read React context). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
