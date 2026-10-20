# Changelog

All notable changes to `changelui` are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]
### Dashboard
- Templates area (`#/templates`): eight copy-only page sections built from library items
  (hero-spotlight, hero-product, hero-code, bento-features, pricing-toggle, testimonial-wall,
  logo-cloud, faq) with live poster thumbnails, a width switch (full, 1280, 768, 375), a theme
  preset picker, the list of items used and copyable source. Not part of the npm package.
- Eight more templates: cta-banner, waitlist, navbar-shrink, footer-mega, changelog, auth-card,
  dashboard-shell and not-found, with new gallery groups (Navigation, Conversion, Content,
  Account, App, Pages).
- Template gallery cards use a stretched link, so live thumbnails no longer nest links inside the
  card link (fixes a hydration warning).
### Fixed
- AnimatedBeam and ProximityGlow measure correctly inside a CSS-scaled ancestor (a zoomed preview).
- Dashboard: every item preview starts at the top of the stage instead of being centered with a large
  gap above tall demos.


- RollingNumber: digits, separators and prefix/suffix now share one text baseline at rest and while
  rolling (the digit wheels used `overflow: hidden`, which moved their baseline to the bottom edge).
- CardStack: the cards behind the top one now peek out below it (scaled 0.94 / 0.88 from the
  bottom edge, 10px apart, slightly dimmed) for every `visible` value.
- Dashboard: the ReactionButton Count slider (0..500) now matches its value.
- FlipCounter: glyphs sit fully inside their tiles with inner padding at every size and variant.
- Dashboard: the RetroGrid "Press start" subtitle is readable on the sun.
- MorphChart: bars, tiles and waffle runs rest with flat tops and square corners
  (`resamplePolygon` gains a `keepVertices` option).
- BarRace: every key gets its own color, also past the 8 palette tokens, and keeps it as ranks change.
- NetworkGraph: the default view fits the settled graph; nodes stay at least 6px and labels 11px on screen.
- GanttChart: header labels shorten to fit their spans and never overlap at any scale or zoom.

### Changed

- WordRotate: new `sizing` prop. The default `"widest"` reserves the longest word's width, so surrounding text no longer reflows or changes height while words rotate. Use `sizing="auto"` for the previous width-animating behaviour.

### Added
- PageTransition: route-agnostic page transitions keyed by `routeKey` with slide, fade, scale, blur,
  flip, wipe, curtain and `view` (View Transitions API, fade fallback) presets, history- or
  `order`-aware direction, inert exiting pages, `focusOnChange` and a 150ms reduced-motion fade.
- useViewTransition: `run(update, { name, types, sync })` around `document.startViewTransition` with
  feature detection, a reduced-motion skip, flushSync, scoped `data-pui-view-transition` names and a
  handle whose promises never reject; plus `supportsViewTransitions()`.
- Stepper: wizard/checkout progress with spring-filled connectors, a number-to-check morph, a sliding
  active ring, error and loading steps, vertical layout and clickable non-linear steps.
- TreeView: APG tree with animated expand, a sliding selection pill, indentation guides, multi-select
  ranges, typeahead, `*` to expand siblings and `onActivate`.
- Table: styled native table parts with sortable headers (`aria-sort`), animated sort arrows, rows that
  glide on reorder, density, striped and sticky-header options, plus `useTableSort`.
- FileDropzone: drag-and-drop with a glowing marching border, accept/size/count validation, paste,
  live-region errors and a file list with thumbnails, per-file progress and status; `formatBytes`.
- ColorPicker: saturation/brightness area, hue and alpha sliders, swatches, eyedropper, copy and a
  hex/rgb/hsl/oklch field; `parseColor` and `formatColor`.
- ResizablePanels: split panes with min/max sizes, collapse to an icon rail on a heavy spring, nested
  groups, keyboard resizing and `useResizablePanel`.
- ScrollArea: native scrolling with overlay scrollbars and edge fades that follow the scroll position.
- Timeline: vertical/horizontal timeline whose line draws with scroll, dots that pop in, an alternate
  layout and `<time>` semantics.
- FlowField: generative particles riding a morphing noise field with fading trails, palettes and a
  pointer swirl; reduced motion draws one still artwork.
- Halftone: halftone, ordered-dither or engraving screens driven by a radial, linear, noise or flat
  tone, with a screen angle and dots that swell near the pointer.
- MatrixRain: falling glyph columns (katakana, binary, hex, latin or your own) with bright heads,
  flickering trails and a `text` word that decodes out of the rain.
- Topography: animated contour lines (marching squares over gradient noise) with index contours and
  a pointer summit.
- GradientMesh: a soft animated mesh gradient in theme colors with a pointer blob, a static mode and
  `gradientMeshBackground()` for a copyable CSS value.
- NoiseOverlay: `feTurbulence` film grain, color noise or ink texture, static or jittering in steps.
- DotField: an interactive dot grid where dots repel, attract or glow near the pointer and ripple
  on click.
- Canvas backgrounds: static (reduced-motion) frames now repaint when their props change.
- Beams: light beams falling down faint vertical rails at seeded speeds, with tilt, tail length,
  head glow and an optional top glow.
- Waves: layered sine waves drifting sideways (pure CSS), as filled hills or thin `line` strands,
  on the bottom or top edge.
- Starfield: a canvas starfield flying toward the viewer with an easing hyperspace `warp` mode,
  accent stars, twinkle and pointer steering of the vanishing point.
- FlickeringGrid: a canvas grid of flickering squares with a pointer glow and dot-matrix `text`.
- RetroGrid: a synthwave perspective floor scrolling toward a glowing horizon and a striped sun.
- LavaLamp: blobs on independent x/y periods that melt together through a gooey filter, crisp or
  softly blurred.
- LightRays: conic god rays from a corner or edge that sway and breathe on their own clocks.
- Parallax and ParallaxLayer: a layered scroll scene where each layer travels at its own speed
  (x or y), drifts with the pointer and can scale, turn or fade across the range.
- StickyReveal: sticky scroll storytelling with a pinned media panel that crossfades per block, a
  progress rail, `aria-current="step"` and inline media on narrow screens.
- HorizontalScroll: vertical scroll drives a pinned horizontal track (1:1 by default) with a
  progress bar, falling back to a snapping horizontal scroller on small screens or reduced motion.
- ZoomParallax: scroll-driven zoom collage where the center image fills the scene, satellites fly
  out and an optional overlay fades in.
- ScrollStack and ScrollStackItem: cards that pin, pile up and scale down and dim as the next one
  arrives, with optional alternating tilt.
- PixelReveal: content revealed through a dissolving pixel grid (random, wipe, radial, diagonal or
  rain) on view, hover/focus or a controlled `revealed` prop.
- AnimatedList: a keyed live feed (role=log) where new items spring in from the top or bottom and
  the rest reflow, with `max` and an optional staggered first render.
- ExpandingCards: an accordion gallery of image or accent panels that expand on hover, focus or
  click, with roving arrow-key focus and a sliding caption.
- Confetti: dependency-free canvas `confetti()` bursts (shapes, emoji, wind, gravity, element
  origins, token colors) and `fireworks()` shows on one shared overlay that is removed when idle,
  plus the `Confetti` trigger wrapper and `ConfettiButton`.
- ClickSpark: radial line, dot or star sparks (with an optional ring) at every click, from the
  center of the element for keyboard clicks.
- CursorTrail: a canvas pointer trail (tapered gradient ribbon, dots or sparkles) over an element
  or the whole page, with additive glow and an idle stop.
- Lens: a magnifier that zooms into images or any DOM under the pointer, circle or rounded, with
  arrow-key control and an inert magnified copy.
- ImageTrail: pointer travel leaves a trail of images that pop in on a spring and drop away.
- ProximityGlow and ProximityGlowItem: card borders that light up by pointer proximity with one
  shared glow, plus a focus glow for keyboard users.
- FlipCard, FlipCardFront, FlipCardBack and FlipCardButton: a 3D flip card (click, hover or
  manual, x or y axis) sized to its taller face, with an inert hidden face and focus handoff.
- GooeyButton: a Button whose liquid droplets bubble toward the pointer and melt back through an
  SVG gooey filter.
- ScrollVelocityText: editorial marquee rows that drift on their own and speed up, reverse and lean
  with scroll velocity, with pause on hover and a custom separator.
- ScrollTextReveal: scroll-scrubbed paragraph where each word (or letter) brightens from dim to
  full, with optional blur, spring smoothing and accent words.
- SparklesText: twinkling stars, diamonds or dots that spawn around text, always or on hover.
- FancyUnderline: draw, center, slide, marker and squiggle underlines for links, buttons and
  headings, triggered by hover and keyboard focus or kept on with `active`.
- Terminal and TerminalLine: a window-chrome terminal that types commands, streams toned output,
  fills text progress bars, copies commands and replays, with height reserved up front.
- SplitText: kinetic headline primitive that splits by char, word or measured line (regrouped on
  resize) and staggers maskUp, fadeUp, blurIn, rotateIn, popIn or slideLeft from either end, the
  center or the edges.
- MorphingText: words that melt into each other through an SVG alpha-threshold filter, with a
  reserved widest-word box, a pause control and adjustable edge hardness.
- FlipCounter: split-flap tiles (top leaf falls, bottom leaf lands) cycling through digits, alpha,
  alnum or a custom charset, with multi-step paths, stagger, separators and padding.
- GlitchText: RGB-split glitch with torn slices on hover, looping bursts or continuously while
  `active`.
- WavyText: letters on a CSS sine wave (no per-frame JavaScript), or a one-off hover ripple.
- CircularText: text on a circle via SVG textPath that spins and ramps its speed on hover, with
  center content.
- SlideToConfirm: a "slide to unlock" track with rubber-band drag, spring-back, a confirm check and
  pulse, shimmer label, threshold and auto reset; the thumb is a slider (arrows, Enter confirms).
- ExpandableSearch: a search icon that springs into a field, with recent suggestions (combobox),
  a single-key shortcut, Escape to clear then collapse, and focus handoff.
- SortableList, SortableItem, SortableHandle: drag-to-reorder on Motion Reorder with lift and settle
  springs, handles, horizontal lists, `onReorderEnd`, and keyboard reordering with announcements.
- ImageCompare: before/after slider (drag, click to jump, hover-follow, vertical) on a clip-path
  motion value, fading corner labels and a role=slider handle.
- Lightbox, LightboxTrigger: thumbnails that zoom into a full-screen viewer on a shared layout,
  with swipe, arrow keys, a filmstrip, captions, a live counter and focus return.
- Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselDots: native
  scroll-snap carousel with mouse drag momentum, morphing dots that double as an autoplay timer,
  pause button, loop, center align and a scale effect.

- Chart core (internal, `src/charts/core/`): dependency-free scales (linear, log, pow/sqrt,
  symlog, UTC/local time, band, point, ordinal, quantize), nice and calendar time ticks, Intl
  formatters, path generators (linear, step, monotone, natural, bump, area, radial, arc with
  padding and rounded corners, ribbon, rounded bar), pie, stack offsets and orders, treemap tiles,
  partition, sankey, force and beeswarm layouts, statistics, decimation, hit testing, label
  placement, automatic insights and summaries, shape morphing, palette helpers and the chart
  interaction store. Not exported yet; the chart entries build on it.
- Chart tokens (`--pui-chart-1..8`, sequential and diverging stops, grid, axis, crosshair,
  tooltip, up/down) in light and dark, with Tailwind keys such as `fill-pui-chart-1`.
- `charts` category for `npm run new`, with a starter line chart.
- `npm run bench:charts` prints the chart core perf budgets.
- `motion-presets`: public, server-safe springs, easings, durations, variants, `stagger`,
  `staggerDelay`, `exitFaster`, `reducedVariant` and `cssEasing`; new `--pui-ease-emphasized`,
  `--pui-duration-instant` and `--pui-duration-page` tokens.
- `RollingNumber`: odometer digits that roll per place, with Intl formatting.
- Hooks: `useElementSize`, `usePointerProximity`, `usePrefersReducedMotion` (public),
  `useScrollDirection`, `useScrollVelocity`.
- `DynamicIsland`: a status pill that springs between views (timer, music, call, upload, AI)
  and expands into rich panels, with polite state announcements.
- `MorphingDialog`: a card whose image, title and subtitle fly into a full modal dialog via
  shared layout, with focus trap, scroll lock and a reduced-motion crossfade.
- `ReactionButton`: like toggle with a particle burst, icon pop, rolling count and a long-press
  emoji tray (also ArrowUp or right-click).
- `HoldToConfirm`: press-and-hold destructive action with a two-tone fill sweep, check and pulse;
  Space and Enter hold too.
- `CardStack`: swipeable deck with drag, rotate and fling physics, like/skip stamps, arrow keys,
  undo and an imperative `actionsRef`.
- `HoloCard`: holographic foil card (rainbow, galaxy, metal) with glare, sparkle and idle shimmer
  that shift with a 3D tilt.
- `VariableProximity`: letters whose variable-font axes swell as the pointer gets close.
- `StickerPeel`: a sticker whose corner peels on hover or drag, with a paper back and curl shadow.
- `NavigationMenu`: Stripe-style top nav; a highlight slides between items and one floating panel
  morphs its size and position to each item's content (disclosure pattern, hover intent, Escape).
- `Command` and `CommandMenu`: fuzzy-ranked command palette (inline or ⌘K dialog) with groups,
  shortcuts, nested pages, a sliding highlight and the combobox + listbox pattern.
- `AnimatedBeam`: SVG beams between two elements with a traveling gradient pulse and glow.
- `DotGlobe`: dependency-free dotted globe on a 2D canvas with markers, great-circle arcs and
  drag-to-spin inertia.
- Theme presets: opt-in `themes.css` with 10 presets (default, midnight, sunset, forest, mono,
  neon, pastel, glass, ocean, rose) selected by `data-pui-theme`, in light and dark, nestable,
  contrast-tuned; new `--pui-font-sans/display/mono` and `--pui-surface-blur` tokens. Overlay
  surfaces (Popover, DropdownMenu, Dialog, Drawer, Toast, NavigationMenu) blur under `glass`.
- `ThemeSwitcher` and `useThemePreset`: preset picker with swatches painted in each preset's own
  tokens, a sliding ring, roving arrow keys, storage sync and a circle reveal.
- `theme-builder` (server-safe): `buildThemeCss`, `buildTheme`, `contrast` and `checkContrast`
  generate contrast-checked light + dark themes from a preset, hue, chroma, radius and font.
- `Calendar`: month grid on ISO date strings with single, range and multiple selection, a
  directional month slide, a month/year picker, min/max, disabled days, `dayContent` and the APG
  date-grid keyboard model. Intl labels only, no date library.
- `DatePicker`: date field with a popover calendar, typed input in the locale's order ("3/9",
  "Mar 9", "tomorrow", "+2w"), presets, range mode with `formatRange` text and a hidden ISO input.
- `getThemeInitScript`: `presetStorageKey` and `defaultPreset` apply the stored preset before paint.
- `Select`: styled single select (APG select-only combobox) with a sliding highlight, a check
  that draws itself in, typeahead, groups, descriptions, `renderValue` and a required-aware form input.
- `Combobox`: autocomplete on an `options` array with accent-insensitive filtering, highlighted
  matches, a springy list height, staggered results, groups, async `loading`, an empty state and
  a create row.
- `MultiSelect`: chips that pop and reflow inside the field, a "+N" overflow chip, `max`,
  Backspace removal, animated checkboxes and a count + clear footer.
- `ToggleGroup`, `ToggleGroupItem` and `Toggle`: single (sliding pill) or multiple toggle buttons
  with roving focus, three variants, and a standalone toggle with a pressed-icon swap.
- `NumberInput`: stepper field with press-and-hold acceleration, arrow/PageUp/Home/wheel stepping,
  Intl formats with locale-aware parsing, rolling odometer digits and a springy bump at the limits.
- `OtpInput`: one-time code boxes over a single `autocomplete="one-time-code"` input, with a
  sliding focus ring, popping characters, paste filtering, grouping, masking, an error shake and a
  staggered success fill.
- `TagInput`: free-text tags with Enter/comma (or custom) separators, paste splitting, validation,
  `max` with a counter, duplicate flash, Backspace-to-edit and inline ghost suggestions.
- `PasswordInput` and `estimatePasswordStrength`: reveal toggle with a blinking eye and drawn
  slash, segmented strength meter, live rules checklist and a Caps Lock hint.
- `HoverCard`: rich previews on hover or keyboard focus with open/close delays, a hoverable
  card, an optional arrow and touch taps that follow the link.
- `ContextMenu`: right-click, long-press, Shift+F10 or Menu-key menu placed at the pointer; every
  DropdownMenu part is re-exported under `ContextMenu*` names. Focus returns where it was.
- `Sidebar`: `SidebarProvider`, `Sidebar`, groups, items, nested `SidebarSub`, trigger and inset;
  the width springs between expanded, a 56 px icon rail with tooltips and off-canvas, with a
  sliding active pill, badges, an optional Cmd/Ctrl shortcut and a Drawer on mobile.
- `Collapsible`: headless disclosure with an auto-height animation, `forceMount` and `asChild`.
- `Breadcrumb`: trail with middle collapse into an ellipsis menu or inline expansion, sliding
  crumbs, custom separators and router links via `asChild`.
- `Pagination` and `paginationRange`: windowed pages with a sliding active pill, sliding numbers,
  jumping ellipses, first/last, links mode and a compact mode with a rolling page number.
## [1.0.0] - 2026-10-16

First release: 65 small, accessible React items built with TypeScript, Tailwind CSS v4 and Motion,
each available from the root barrel and from its own subpath.

### Components (33)

Accordion, Alert, Avatar, Badge, Button, Card, Checkbox, Chip, CopyButton, Dialog, Dock, Drawer,
DropdownMenu, IconButton, Input, Kbd, Popover, Progress, RadioGroup, Rating, RippleButton,
SegmentedControl, Separator, ShimmerButton, Skeleton, Slider, Spinner, Switch, Tabs, Textarea,
ThemeToggle, Toast, Tooltip

### Text effects (8)

GradientText, Highlighter, NumberTicker, ScrambleText, TextReveal, TextShimmer, TypingText,
WordRotate

### Motion effects (11)

BorderBeam, Magnetic, Marquee, OrbitingCircles, Reveal, ScrollProgress, ShineBorder, SmoothCursor,
SpotlightCard, Stagger, TiltCard

### Backgrounds (6)

AuroraBackground, DotPattern, GridPattern, Meteors, Particles, Ripple

### Hooks and utilities (8)

cn, getThemeInitScript, useClickOutside, useControllableState, useCopyToClipboard, useFocusTrap,
useMediaQuery, useMousePosition

### Package

- ESM and CJS builds with type declarations for both; `"use client"` on every client entry and
  server-safe `cn` and `theme-script` subpaths.
- `theme.css` (`--pui-*` design tokens for Tailwind v4 apps) and a prebuilt `styles.css` for apps
  without Tailwind.
- Light and dark themes, nested theme islands and scoped token overrides.
- Follows the OS reduced-motion setting by default, with SSR-safe hydration.
- React 18 and 19 support; Motion 11 to 14 as a peer.
- Showcase dashboard with live controls, generated JSX, props tables, copyable source and a
  Cmd/Ctrl+K command palette.
