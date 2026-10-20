import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

export type { ClassValue } from "clsx";

// tailwind-merge validates radius/shadow with isTshirtSize and ease/animate with fixed lists,
// so the pui-* theme keys (design 5.10) must be registered to conflict-resolve.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["pui-sm", "pui-md", "pui-lg", "pui-xl", "pui-full"],
      shadow: ["pui-xs", "pui-sm", "pui-md", "pui-lg", "pui-xl", "pui-glow"],
      ease: ["pui-out", "pui-in-out", "pui-spring", "pui-out-expo", "pui-in-quint"],
      animate: [
        "pui-shimmer-slide",
        "pui-spin-around",
        "pui-text-shimmer",
        "pui-gradient-pan",
        "pui-marquee-x",
        "pui-marquee-y",
        "pui-meteor",
        "pui-ripple",
        "pui-aurora",
        "pui-orbit",
        "pui-shine",
        "pui-skeleton-shimmer",
        "pui-indeterminate",
        "pui-blink",
        "pui-dot-bounce",
        "pui-bar-scale",
        "pui-toast-progress",
      ],
    },
  },
});

/** Merge class names: clsx for conditionals, tailwind-merge for conflicts (later classes win). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
