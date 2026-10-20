import type { Tone } from "./types";

/**
 * Each tone sets three variables on the component's own element (design 5.10).
 * Variant classes read only those variables, so 6 tones x 5 variants stay 11 literal strings.
 */
export const toneClasses: Record<Tone, string> = {
  neutral:
    "[--pui-tone:var(--pui-foreground)] [--pui-tone-fg:var(--pui-background)] [--pui-tone-text:var(--pui-foreground)]",
  primary:
    "[--pui-tone:var(--pui-primary)] [--pui-tone-fg:var(--pui-primary-foreground)] [--pui-tone-text:var(--pui-primary-text)]",
  success:
    "[--pui-tone:var(--pui-success)] [--pui-tone-fg:var(--pui-success-foreground)] [--pui-tone-text:var(--pui-success-text)]",
  warning:
    "[--pui-tone:var(--pui-warning)] [--pui-tone-fg:var(--pui-warning-foreground)] [--pui-tone-text:var(--pui-warning-text)]",
  danger:
    "[--pui-tone:var(--pui-danger)] [--pui-tone-fg:var(--pui-danger-foreground)] [--pui-tone-text:var(--pui-danger-text)]",
  info: "[--pui-tone:var(--pui-info)] [--pui-tone-fg:var(--pui-info-foreground)] [--pui-tone-text:var(--pui-info-text)]",
};

export type Variant = "solid" | "soft" | "outline" | "ghost" | "link";

export const variantClasses: Record<Variant, string> = {
  // Inset top highlight plus a small drop shadow; pressing drops the outer shadow so it reads pushed in.
  solid:
    "bg-(--pui-tone) text-(--pui-tone-fg) hover:bg-(--pui-tone)/90 shadow-[inset_0_1px_0_var(--pui-solid-highlight),var(--pui-shadow-xs)] active:shadow-[inset_0_1px_0_var(--pui-solid-highlight)]",
  soft: "bg-(--pui-tone)/12 text-(--pui-tone-text)",
  outline: "border border-(--pui-tone)/40 text-(--pui-tone-text) hover:bg-(--pui-tone)/8",
  ghost: "text-(--pui-tone-text) hover:bg-(--pui-tone)/10",
  link: "text-(--pui-tone-text) underline-offset-4 hover:underline",
};
