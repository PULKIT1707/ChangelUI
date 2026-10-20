"use client";

import { motion } from "motion/react";

/**
 * Static tag -> motion component lookup for polymorphic `as` props (design 7.2, C10). The map is
 * built once at module level, so components are never created during render.
 */
export const motionTags = {
  span: motion.span,
  p: motion.p,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  strong: motion.strong,
  em: motion.em,
  label: motion.label,
  section: motion.section,
  article: motion.article,
  li: motion.li,
  ul: motion.ul,
  ol: motion.ol,
};

export type MotionTagName = keyof typeof motionTags;

/**
 * Every entry renders an HTMLElement with the same motion props, so the union is narrowed to one
 * member type for JSX (a union of 17 component types is too complex for the checker).
 */
export const motionTagMap = motionTags as unknown as Record<MotionTagName, typeof motion.span>;
