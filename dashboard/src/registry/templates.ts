import type { ComponentType } from "react";
// Copy-only templates (roadmap I-10): one file per block in templates/<slug>.tsx at the repo root.
// They are not part of the npm package; the dashboard previews them and serves their source.

export type TemplateGroup =
  | "Heroes"
  | "Navigation"
  | "Features"
  | "Pricing"
  | "Social proof"
  | "Conversion"
  | "Content"
  | "Support"
  | "Account"
  | "App"
  | "Pages";

export const TEMPLATE_GROUPS: readonly TemplateGroup[] = [
  "Heroes",
  "Navigation",
  "Features",
  "Pricing",
  "Social proof",
  "Conversion",
  "Content",
  "Support",
  "Account",
  "App",
  "Pages",
];

export interface TemplateMeta {
  slug: string;
  title: string;
  group: TemplateGroup;
  description: string;
  keywords: string[];
  isNew?: boolean;
}

export interface TemplateEntry extends TemplateMeta {
  /** Repo-relative path of the template file. */
  file: string;
  load: () => Promise<ComponentType>;
  loadSource: () => Promise<string>;
}

export const templateMeta: TemplateMeta[] = [
  {
    slug: "hero-spotlight",
    title: "Hero: Spotlight",
    group: "Heroes",
    description: "Landing hero with a shimmer announcement pill, a masked word-by-word headline, light rays over a grid and a logo marquee.",
    keywords: ["landing", "hero", "header", "marketing", "split text", "light rays"],
    isNew: true,
  },
  {
    slug: "hero-product",
    title: "Hero: Product",
    group: "Heroes",
    description: "SaaS hero over an aurora with a morphing keyword, a tilting product window with a live chart, and a stat card trio.",
    keywords: ["saas", "hero", "dashboard", "analytics", "aurora", "stat cards"],
    isNew: true,
  },
  {
    slug: "hero-code",
    title: "Hero: Code",
    group: "Heroes",
    description: "Dev-tool hero with an install command (hover for a package card) and a terminal session that types itself out.",
    keywords: ["developer", "cli", "terminal", "install", "hero", "open source"],
    isNew: true,
  },
  {
    slug: "bento-features",
    title: "Bento features",
    group: "Features",
    description: "Feature grid that glows near the pointer: an integration hub with beams, a dot globe, a live sparkline and a framework marquee.",
    keywords: ["bento", "features", "grid", "beams", "globe", "showcase"],
    isNew: true,
  },
  {
    slug: "pricing-toggle",
    title: "Pricing toggle",
    group: "Pricing",
    description: "Monthly / yearly switch with a savings badge, rolling prices, plan cards that work as a radio group, and a beam on the popular plan.",
    keywords: ["pricing", "plans", "billing", "toggle", "subscription", "radio"],
    isNew: true,
  },
  {
    slug: "testimonial-wall",
    title: "Testimonial wall",
    group: "Social proof",
    description: "Three columns of quotes drifting in alternating directions, with ratings and avatars. Pauses on hover and focus.",
    keywords: ["testimonials", "reviews", "quotes", "social proof", "marquee", "wall of love"],
    isNew: true,
  },
  {
    slug: "logo-cloud",
    title: "Logo cloud",
    group: "Social proof",
    description: "Two rows of customer logos drifting in opposite directions, fading at the edges and turning from grayscale to color on hover.",
    keywords: ["logos", "customers", "brands", "trusted by", "marquee"],
    isNew: true,
  },
  {
    slug: "faq",
    title: "FAQ",
    group: "Support",
    description: "Searchable, topic-filtered questions in a separated accordion with highlighted matches, an empty state and a support card.",
    keywords: ["faq", "questions", "help", "accordion", "search", "support"],
    isNew: true,
  },
  {
    slug: "cta-banner",
    title: "CTA banner",
    group: "Conversion",
    description: "Closing call to action on a drifting gradient mesh that follows the pointer, a rising headline and a confetti button, plus a compact upsell strip.",
    keywords: ["cta", "call to action", "banner", "gradient mesh", "confetti", "upsell"],
    isNew: true,
  },
  {
    slug: "waitlist",
    title: "Waitlist",
    group: "Conversion",
    description: "Pre-launch signup whose form morphs into a place-in-line pill with confetti, a ticking counter, a referral link and a live feed of signups.",
    keywords: ["waitlist", "signup", "launch", "beta", "email", "referral", "live feed"],
    isNew: true,
  },
  {
    slug: "navbar-shrink",
    title: "Navbar: Shrink",
    group: "Navigation",
    description: "Sticky header that shrinks and frosts on scroll, folds its announcement bar away going down, with mega menus, a theme picker and a mobile drawer.",
    keywords: ["navbar", "header", "navigation", "sticky", "mega menu", "scroll", "drawer"],
    isNew: true,
  },
  {
    slug: "footer-mega",
    title: "Footer: Mega",
    group: "Navigation",
    description: "Large footer under a wave edge: newsletter, four link columns that fold on narrow screens, a status pill, shortcuts, theme and language pickers.",
    keywords: ["footer", "links", "newsletter", "sitemap", "waves", "status"],
    isNew: true,
  },
  {
    slug: "changelog",
    title: "Changelog",
    group: "Content",
    description: "Release notes on a timeline with version badges, a type filter with counts, entries that fade up on scroll, copyable links and a subscribe box.",
    keywords: ["changelog", "release notes", "timeline", "updates", "versions", "what's new"],
    isNew: true,
  },
  {
    slug: "auth-card",
    title: "Auth card",
    group: "Account",
    description: "Two-step sign in / sign up: email and password with a strength meter, passkey and SSO, then a 6-digit code that shakes on a wrong guess.",
    keywords: ["auth", "login", "sign in", "sign up", "otp", "password", "verification", "2fa"],
    isNew: true,
  },
  {
    slug: "dashboard-shell",
    title: "Dashboard shell",
    group: "App",
    description: "Full app frame: collapsible sidebar, command palette, KPI stat cards, a deploy heatmap and a sortable orders table with toast-confirmed actions.",
    keywords: ["dashboard", "admin", "app shell", "sidebar", "command palette", "table", "kpi"],
    isNew: true,
  },
  {
    slug: "not-found",
    title: "404: Lost in space",
    group: "Pages",
    description: "Glitching 404 over a starfield that jumps to warp while you hover the way home, with a quick search over popular pages.",
    keywords: ["404", "not found", "error page", "starfield", "glitch", "search"],
    isNew: true,
  },
];

// Each template module is its own lazy chunk; sources load as raw text for the Code tab.
const modules = import.meta.glob<{ default: ComponentType }>("../../../templates/*.tsx");
const sources = import.meta.glob<string>("../../../templates/*.tsx", { query: "?raw", import: "default" });

export const templates: TemplateEntry[] = templateMeta.flatMap((meta) => {
  const key = `../../../templates/${meta.slug}.tsx`;
  const loadModule = modules[key];
  const loadRaw = sources[key];
  if (!loadModule || !loadRaw) return [];
  return [
    {
      ...meta,
      file: `templates/${meta.slug}.tsx`,
      load: () => loadModule().then((module) => module.default),
      loadSource: loadRaw,
    },
  ];
});

export function getTemplate(slug: string): TemplateEntry | undefined {
  return templates.find((entry) => entry.slug === slug);
}

/** Library subpaths a template imports (`changelui/<name>`), in source order, deduped. */
export function templateUses(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/from\s+["']changelui\/([a-z0-9-]+)["']/g)) {
    if (match[1]) names.add(match[1]);
  }
  return [...names];
}
