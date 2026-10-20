import type { Category } from "../../../scripts/entries";

/** Sidebar group headings (design 10.3). */
export const CATEGORY_LABELS: Record<Category, string> = {
  components: "Components",
  text: "Text effects",
  effects: "Motion effects",
  backgrounds: "Backgrounds",
  charts: "Charts",
  hooks: "Hooks & utils",
};

/** Short labels for filters, badges and palette groups. */
export const CATEGORY_SHORT: Record<Category, string> = {
  components: "Components",
  text: "Text",
  effects: "Effects",
  backgrounds: "Backgrounds",
  charts: "Charts",
  hooks: "Hooks",
};

export const INSTALL_COMMAND = "npm install changelui motion";
