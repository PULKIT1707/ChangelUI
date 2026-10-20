// Shared literal class strings for Input and Textarea (design 7.1 #17-#18): boundary, focus glow
// and invalid state.

export const fieldClasses =
  "w-full min-w-0 rounded-pui-md border border-pui-input bg-transparent text-pui-foreground placeholder:text-pui-muted-foreground outline-hidden transition-[border-color,box-shadow] duration-(--pui-duration-base) ease-pui-out focus-visible:border-pui-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-ring)_25%,transparent)] disabled:cursor-not-allowed disabled:opacity-50";

export const invalidClasses =
  "border-pui-danger focus-visible:border-pui-danger focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--pui-danger)_25%,transparent)]";
