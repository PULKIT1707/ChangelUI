import type * as React from "react";

export type { Category } from "../../../scripts/entries";
import type { Category } from "../../../scripts/entries";

/** Pure registry metadata (meta.ts). index.ts adds `load` (design 10.2, plan P3). */
export interface RegistryMeta {
  slug: string;
  title: string;
  category: Category;
  description: string;
  keywords: string[];
  /** Names shown in the import line. */
  exports: string[];
  /** Bento footprint; default "1x1". */
  span?: "1x1" | "2x1" | "1x2" | "2x2";
  replayable: boolean;
  isNew?: boolean;
}

export interface RegistryEntry extends RegistryMeta {
  load: () => Promise<{ default: ItemModule }>;
}

export interface PropDoc {
  name: string;
  /** As shown, e.g. '"sm" | "md" | "lg"'. */
  type: string;
  /** As shown, e.g. '"md"'; omitted when there is none. */
  default?: string;
  description: string;
  required?: boolean;
}

export type ControlSpec<P> =
  | { type: "select"; prop: keyof P & string; label: string; options: readonly string[] }
  | { type: "boolean"; prop: keyof P & string; label: string }
  | { type: "number"; prop: keyof P & string; label: string; min: number; max: number; step: number }
  | { type: "text"; prop: keyof P & string; label: string; maxLength?: number };

export interface ItemModule<P extends Record<string, unknown> = Record<string, unknown>> {
  Preview: React.ComponentType<{ props: P }>;
  /** Non-interactive bento preview. */
  Mini: React.ComponentType;
  defaults: P;
  /** May be []. */
  controls: ControlSpec<P>[];
  snippet: (props: P) => string;
  propsTable: PropDoc[];
  keyboard?: { keys: string; action: string }[];
  a11y?: string[];
  /** One-line behavior note. */
  reducedMotion?: string;
  /** Extra live demos shown under the preview (variants, compositions, real-world layouts). */
  examples?: ItemExample[];
}

export interface ItemExample {
  title: string;
  description?: string;
  Demo: React.ComponentType;
  /** Spans both columns of the examples grid. */
  wide?: boolean;
}
