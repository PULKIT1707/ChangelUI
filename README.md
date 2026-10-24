# ChangelUI (`changelui`)

Small, accessible React components and effects built with TypeScript, Tailwind CSS v4 and Motion.
65 items in five groups: 33 components, 8 text effects, 11 motion effects, 6 backgrounds, and
7 hooks/utilities. Every item has its own subpath, so you import only what you use.

```tsx
import { Button, TypingText } from "changelui"; // root barrel
import { Marquee } from "changelui/marquee"; // or one item per subpath
```

The showcase dashboard (`npm run dev`) lists every item with live controls, source and copy buttons.
See [CHANGELOG.md](./CHANGELOG.md) for the full catalog.

## Install

```sh
npm install changelui motion react react-dom
```

| Peer        | Range                                        |
| ----------- | -------------------------------------------- |
| `react`     | `>=18.0.0`                                   |
| `react-dom` | `>=18.0.0`                                   |
| `motion`    | `^11.11.17 \|\| ^12.0.0 \|\| ^13.0.0 \|\| ^14.0.0` |

Runtime dependencies are only `clsx` and `tailwind-merge`. The package ships ESM and CJS with types
for both, and is side-effect free apart from its CSS files.

## Imports

The root barrel re-exports everything. Each item also has a kebab-case subpath named after its file,
which keeps bundles small even without tree shaking:

```tsx
import { Dialog, DialogTrigger, DialogContent, toast, Toaster } from "changelui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "changelui/tabs";
import { AuroraBackground } from "changelui/aurora-background";
import { useMediaQuery } from "changelui/use-media-query";
import { cn } from "changelui/cn"; // server-safe
```

| Group | Subpaths |
| --- | --- |
| Components | `accordion` `alert` `avatar` `badge` `breadcrumb` `button` `calendar` `card` `card-stack` `carousel` `checkbox` `chip` `collapsible` `color-picker` `combobox` `command-menu` `context-menu` `copy-button` `date-picker` `dialog` `dock` `drawer` `dropdown-menu` `dynamic-island` `expandable-search` `file-dropzone` `hold-to-confirm` `hover-card` `icon-button` `image-compare` `input` `kbd` `lightbox` `morphing-dialog` `multi-select` `navigation-menu` `number-input` `otp-input` `pagination` `password-input` `popover` `progress` `radio-group` `rating` `reaction-button` `resizable-panels` `ripple-button` `scroll-area` `segmented-control` `select` `separator` `shimmer-button` `sidebar` `skeleton` `slide-to-confirm` `slider` `sortable-list` `spinner` `stepper` `switch` `table` `tabs` `tag-input` `textarea` `theme-switcher` `theme-toggle` `timeline` `toast` `toggle-group` `tooltip` `tree-view` |
| Text | `circular-text` `fancy-underline` `flip-counter` `glitch-text` `gradient-text` `highlighter` `morphing-text` `number-ticker` `rolling-number` `scramble-text` `scroll-text-reveal` `scroll-velocity-text` `sparkles-text` `split-text` `terminal` `text-reveal` `text-shimmer` `typing-text` `variable-proximity` `wavy-text` `word-rotate` |
| Effects | `animated-beam` `animated-list` `border-beam` `click-spark` `confetti` `cursor-trail` `dot-globe` `expanding-cards` `flip-card` `gooey-button` `holo-card` `horizontal-scroll` `image-trail` `lens` `magnetic` `marquee` `orbiting-circles` `page-transition` `parallax` `pixel-reveal` `proximity-glow` `reveal` `scroll-progress` `scroll-stack` `shine-border` `smooth-cursor` `spotlight-card` `stagger` `sticker-peel` `sticky-reveal` `tilt-card` `zoom-parallax` |
| Backgrounds | `aurora-background` `beams` `dot-field` `dot-pattern` `flickering-grid` `flow-field` `gradient-mesh` `grid-pattern` `halftone` `lava-lamp` `light-rays` `matrix-rain` `meteors` `noise-overlay` `particles` `retro-grid` `ripple` `starfield` `topography` `waves` |
| Hooks and utilities | `cn` `motion-presets` `theme-builder` `theme-script` `use-click-outside` `use-controllable-state` `use-copy-to-clipboard` `use-element-size` `use-focus-trap` `use-media-query` `use-mouse-position` `use-pointer-proximity` `use-prefers-reduced-motion` `use-scroll-direction` `use-scroll-velocity` `use-view-transition` |
| CSS | `theme.css` (tokens for Tailwind apps) `styles.css` (prebuilt, no Tailwind needed) `themes.css` (opt-in presets) |

Each dashboard page shows the exact import line for its item.

## Styling: pick one of three modes

### Mode 1: Tailwind v4 apps

Add the tokens and let Tailwind scan the library output. In your app's CSS:

```css
@import "tailwindcss";
@import "changelui/theme.css";
@source "../node_modules/changelui/dist";   /* path relative to this CSS file */
```

Tailwind ignores `node_modules` during auto-detection, so the `@source` line is required.

### Mode 2: no Tailwind

Import the prebuilt stylesheet once at the app root:

```ts
import "changelui/styles.css";
```

It contains the tokens and only the utilities the library uses. There is no preflight, so your global
styles are not reset; components neutralize the browser styles they depend on themselves.

### Mode 3: copy and paste

Open the item in the dashboard, switch the preview to the Code tab (or deep-link with `?tab=code`)
and use the copy button to grab the exact source. Copy that file plus the internal files the dashboard lists under "Also copy" (always
`lib/cn.ts`, often `lib/styles.ts`, `lib/tone.ts` and a hook). Add `clsx`, `tailwind-merge` and
`motion`, and the tokens from `theme.css`. Imports are relative (`../lib/cn`); if you use a
`@/lib/utils` alias, rewrite that one line.

Using Mode 1 and Mode 2 together only duplicates the token definitions.

### Cascade layers

`styles.css` keeps Tailwind's cascade layers, so your unlayered CSS always wins over library
utilities. That makes overrides predictable, but a broad global rule such as `button { padding: 0 }`
also beats component padding. Scope global element rules, or put them in a layer.

## Theming

All colors, radii, shadows, easings, durations and z-indexes are CSS custom properties named
`--pui-*`. Tailwind utilities add a `pui-` segment (`bg-pui-primary`, `rounded-pui-md`,
`shadow-pui-glow`), so they never clash with your own `--color-primary`.

### Dark mode

Put `.dark` (or `data-theme="dark"`) on `<html>`; `.light` / `data-theme="light"` force light.
Components have no `dark:` variants, the tokens swap. `ThemeToggle` handles the toggle, storage and
system preference. To avoid a flash of the wrong theme, inline the init script in `<head>`:

```tsx
import { getThemeInitScript } from "changelui/theme-script";

<script dangerouslySetInnerHTML={{ __html: getThemeInitScript({ storageKey: "pui-theme", attribute: "both" }) }} />
```

Use the same `storageKey` and `attribute` on `<ThemeToggle />`.

### Theme presets

Ten opt-in presets (`default`, `midnight`, `sunset`, `forest`, `mono`, `neon`, `pastel`, `glass`,
`ocean`, `rose`) live in `themes.css`. Import it after the tokens (`@import "changelui/themes.css";`
in Tailwind apps, `import "changelui/themes.css";` next to `styles.css`) and pick one with
`data-pui-theme` on `<html>` or any element. Presets are independent of light and dark mode, nest
freely, and pass WCAG AA contrast in both modes. `ThemeSwitcher` is the picker; add
`presetStorageKey: "pui-theme-preset"` to `getThemeInitScript` to apply the stored preset before
paint. `buildThemeCss` from `changelui/theme-builder` (server-safe) generates your own
preset from a hue, chroma, radius and font. `npm run build:themes` regenerates `themes.css` from
`src/hooks/theme-builder.ts`.

### Nested theme islands

Any element with a theme class or attribute renders its own theme, in both directions:

```tsx
<html className="dark">
  ...
  <div className="light bg-pui-background text-pui-foreground">{/* light card inside a dark page */}</div>
```

Paint the island's own `bg-pui-background text-pui-foreground`. Otherwise a transparent island
shows the outer theme behind outline and ghost components and their text loses contrast.

### Scoped token overrides

Prefer the theme-neutral scope. It keeps whatever theme the subtree inherits and re-derives the
dependent tokens (glow, radii, surface text) there:

```tsx
<div data-pui-scope style={{ "--pui-primary": "oklch(0.6 0.2 150)", "--pui-radius": "1rem" } as React.CSSProperties}>
  <Button>Brand button</Button>
</div>
```

To force a theme at the same time, set the overrides on a theme root instead
(`<div className="dark" style={...}>`). On a plain element with neither, derived tokens keep the
nearest theme root's values. Override globally by setting the same variables on `:root`.

Any single instance can be re-toned with `className="[--pui-tone:var(--my-brand)]"`.

## Motion and reduced motion

Components follow the OS `prefers-reduced-motion` setting on their own, with no provider needed.
In server-rendered apps the OS value applies right after hydration, so server HTML and the
hydration render always match (they use the full-motion output). Wrap your app once so your own Motion animations follow it too:

```tsx
import { MotionConfig } from "motion/react";

<MotionConfig reducedMotion="user">{app}</MotionConfig>
```

Under reduced motion, entrance animations render their final state (at most a 150ms fade),
decorative loops stop or hide (Marquee, BorderBeam, Meteors, Particles, Aurora, orbit, shimmer),
pointer effects turn off (TiltCard, Magnetic, SpotlightCard following, Dock magnification,
SmoothCursor), text effects show their final text, and spinners keep turning at a slower pace.
`reducedMotion="always"` forces this, which is handy in tests. `reducedMotion="never"` does not
turn it off for these components: Motion's default context is also `"never"`, so the OS setting
always wins.

## Next.js and React Server Components

Every component file carries `"use client"`, so you can render them from Server Components. The
root barrel is a client module, so import the two pure helpers from their server-safe subpaths when
you call them on the server:

```ts
import { cn } from "changelui/cn";
import { getThemeInitScript } from "changelui/theme-script";
```

Importing them from `changelui` in server code gives you a client reference, not a function.
Overlays portal into `document.body` after hydration; pass `container` to keep them inside a scoped
`.dark` subtree.

## React 18 and 19

Both are supported. The library avoids React 19-only APIs (`use()`, ref cleanup functions,
`<Context>` providers, the `inert` prop) and reads refs in a version-aware way for `asChild`.

## Accessibility notes

- **Escape inside layers.** Dialog, Drawer, Popover, DropdownMenu and Tooltip share one layer stack
  that closes the top layer on Escape. If you put your own widget that handles Escape (a combobox,
  a date picker) inside one of them, call `event.preventDefault()` in its `keydown` handler; the
  stack ignores Escape events that are already default-prevented.
- **Skeleton** placeholders are `aria-hidden`. Put `aria-busy="true"` on the region that is
  loading and remove it when the content arrives.
- **Animated text** (TypingText, WordRotate, TextReveal, NumberTicker, ScrambleText) is read once
  from an `sr-only` copy of the final text; the animated characters are `aria-hidden`.
- **Marquee** duplicates are `aria-hidden` and inert, so content is read and tabbed once. It pauses
  on hover and focus.
- **WordRotate** takes `paused` so you can offer a pause control for long-running rotation.

## Effect caveats

- **BorderBeam** moves its dot along `offset-path: rect()`, which needs a recent browser (roughly
  Chrome 116, Safari 17.2 and Firefox 122; from memory, not verified). Elsewhere the beam is simply
  absent. The parent must be `relative` and rounded.
- **ScrambleText** changes glyphs while it runs; add `font-mono` to avoid width jitter. Server and
  first client render output the real text.
- **Backgrounds** (DotPattern, GridPattern, Meteors, Particles, Ripple, AuroraBackground) fill
  their parent: make the parent `relative isolate overflow-hidden`, place the background first and
  make the content after it `relative`.

## Dashboard

```sh
npm ci
npm run dev                                   # http://127.0.0.1:5173
npm run build:dashboard && npm run preview    # static build, http://127.0.0.1:4173
```

The dashboard consumes the library from `src/` through Vite aliases, so edits show up immediately.
It has a gallery, an installation and a theming page, and one page per item with a live preview,
prop controls, the generated JSX, the props table and the copyable source. Press Cmd/Ctrl+K to
search, and use the top-bar toggle for light and dark. Both servers bind to 127.0.0.1 only.

### Templates

`#/templates` lists copy-only page sections and app blocks (heroes, a shrinking navbar, a mega
footer, a bento feature grid, pricing, testimonials, a logo cloud, a CTA banner, a waitlist, a
changelog, an FAQ, a two-step auth card, a dashboard shell and a 404 page). Each one is a single file in `templates/` that imports only public
subpaths (`changelui/<item>`), so it pastes into any app that has the package installed.
They lay out with container queries, so they adapt to the column they sit in. A template page
previews it at full, 1280, 768 or 375 px wide in any theme preset, lists the library items it uses
and has the source to copy. Templates are not published to npm.

### Developer's Pick

`#/picks` is a curated showcase of the creative items: every text effect, motion effect and
background plus a few showpiece charts (`dashboard/src/lib/picks.ts`), with featured hero tiles,
live previews, category filter chips (`#/picks?filter=<category>`) and a Surprise me button that
opens a random pick. It is linked from the sidebar, the command palette and a teaser on home.

### Analytics

The dashboard (never the npm package: `src/` has no telemetry, and check:dist and
`test/hygiene.test.ts` fail if PostHog shows up there) can send usage analytics to PostHog EU
Cloud. A consent banner offers Accept and Decline, and `#/docs/privacy` describes what is collected
and holds the settings to change or withdraw the choice. There are two tiers:

- **Anonymous** (no choice yet, or declined): page views with route and component, palette
  opens, searches (length and result count; the search text only when nothing was found, trimmed,
  lowercased, max 40 characters), result picks, code and install command copies, control changes
  (prop name and type, never the value), theme switches, demo errors (redacted message), 404 paths,
  Web Vitals (LCP, CLS, FCP, INP; LCP and INP carry the CSS selector of their element, and LCP the
  image address without its query) and TTFB, the consent choice itself, Developer's Pick usage
  (the opened pick's slug, category, position, whether it was featured and whether it was on home
  or the picks page; the filter chosen; the item Surprise me opened), a viewport bucket and the
  color scheme. PostHog also adds its standard device properties to every event: browser and OS
  (name and version, from the user agent), device type, browser language, time zone, exact screen
  and viewport size, the page title, and SDK metadata (library version, event time). No cookies or storage, no person profiles; PostHog counts
  visitors with a server-side hash that rotates daily. Query strings are stripped from URLs
  (including the copies inside each Web Vitals metric) and referrers are cut to their origin.
  PostHog receives the IP address with each request: the "Discard client IP data" setting below
  tells it to drop it, and the daily hash is computed from request data (IP and user agent).
- **Full** (accepted): adds an anonymous id in localStorage (no cookies), autocapture with masked
  text, heatmaps, rage and dead clicks, and session replay with all inputs and text masked.
  `identify` is never called.

Setup: copy `dashboard/.env.example` to `dashboard/.env.local` (gitignored) and set
`VITE_POSTHOG_KEY` (the public `phc_` project key) and `VITE_POSTHOG_HOST` (default
`https://eu.i.posthog.com`, must be https). Without a key analytics is fully off: no banner, no
PostHog code is loaded and nothing is sent. That is the default for `npm run dev`, the unit tests
and `npm run test:e2e`. If the browser sends Do Not Track or Global Privacy Control, nothing is
sent and no banner is shown; the visitor can still opt in on the privacy page.

PostHog project settings to set by hand (the code cannot do this):

- Project settings -> Web analytics -> "Cookieless server hash mode": ON. Without it the
  anonymous tier's events are dropped.
- Project settings -> IP data capture -> "Discard client IP data": ON.
- Session replay: enable recordings, confirm "mask all inputs" and text masking, and set a replay
  retention period.
- Data retention: pick the shortest retention that suits you, then replace the
  `[Site owner: ...]` placeholder in the Retention section of `dashboard/src/pages/privacy.tsx`.
- Authorized domains / allowed URLs for replay and the toolbar: set them to the custom domain once
  it exists.
- Create a personal API key with only the "Query Read" scope for the report script.

Reports: `npm run analytics:report -- --days 7` (with `POSTHOG_PERSONAL_API_KEY` and
`POSTHOG_PROJECT_ID` set) queries the project and writes `analytics/insights-YYYY-MM-DD.md` with
top and least-viewed components, zero-result searches, copies, tweaked props, the theme and device
split, demo errors, slow pages, 404s, Developer's Pick views, clicks and click-through, and ranked
suggestions. See [analytics/README.md](analytics/README.md).
`npm run test:e2e:analytics` builds the dashboard with a fake key and a mocked host
(`https://posthog.e2e.invalid`) and checks the banner, both tiers, DNT/GPC (including an opt-in
from the privacy settings), URL sanitizing and the sent events; it never contacts PostHog.

Open decisions (the defaults are implemented; change them if you disagree):

- D1: the zero-result search text is sent (max 40 characters). Alternative: send only its length.
- D2: the report uses `https://eu.posthog.com`. Confirm the project is on EU Cloud, or set
  `POSTHOG_HOST`.
- D3: `analytics/insights-*.md` is gitignored. Alternative: commit the reports for history.
- D4: 404s send a sanitized path (lowercase, `[a-z0-9/._-]`, max 64). Alternative: segment count only.
- D5: `consent_changed` is sent in the anonymous tier to measure the accept rate. Alternative: drop it.
- D6: `posthog-js/full/no-external` (no remote scripts, larger lazy chunk) instead of the default
  entry that loads recorder and Web Vitals scripts from PostHog at runtime.
- D7: the full tier uses localStorage only. Alternative: `localStorage+cookie` for cross-subdomain
  tracking.

This setup and the privacy page are a technical description, not legal advice. Have them reviewed
by a qualified person before you rely on them.

## Use it in your other projects

Other apps on your machine can use this folder directly, without publishing to npm. Apps load the
built `dist/`, so build it first. No install method builds it for you (there is no `prepare`
script):

```sh
# in this repo
npm ci
npm run build
```

Then install it into the app with one of three methods. The commands assume the app sits next to
this repo, so the library is `../changelui`; use your own relative path.

| Method | In the app | After a library change | Extra app config |
| --- | --- | --- | --- |
| Folder | `npm install ../changelui` | live: rebuild, or keep `npm run build:watch` running | Vite `dedupe`; TypeScript `paths` on React 18 |
| Tarball | `npm pack` in this repo, then `npm install ../changelui/changelui-1.0.0.tgz` | `npm pack` and the same install again | none |
| `npm link` | `npm link` in this repo, then `npm link changelui` in the app | live: rebuild, or keep `npm run build:watch` running | Vite `dedupe`; TypeScript `paths` on React 18 |

- Install the peers in the app yourself, with any supported version:
  `npm install react react-dom motion`.
- **Folder** saves `"changelui": "file:../changelui"` in the app's
  `package.json`, and `node_modules/changelui` becomes a symlink to this repo.
- **Tarball** is a real copy, exactly what a registry install would give you. `*.tgz` is gitignored
  here.
- **`npm link`** is not saved in the app's `package.json`, and a later plain `npm install` in the
  app replaces the link. Run both link commands with the same Node version (the link lives in that
  version's global folder). Undo with `npm unlink changelui` in the app and
  `npm rm --global changelui` in this repo.

### Live updates

With a folder or `npm link` install, run `npm run build:watch` here and keep the app's dev server
running. Every change in `src/` rebuilds `dist/` (about 3 seconds), and the Vite dev server updates
the open page by itself; other setups may need a reload. Only the first build clears `dist/`, so the
app never finds it missing. Ctrl+C stops the watcher.

### Symlinked installs: keep one copy of React

A symlinked install (folder or `npm link`) resolves imports from this repo's folder, which has its
own development copies of React and Motion. Without help, Vite bundles two Reacts and the page
stays blank: the browser console shows "Invalid hook call" under the dev server and "Cannot read
properties of null (reading 'useState')" in a production build. Tell Vite to always use the app's
copies:

```ts
// vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom", "motion"] },
});
```

TypeScript has the same problem when the app uses another React major than this repo's
development copy (React 19): it takes the library's React types from this repo's
`node_modules/@types/react`, and `tsc` reports errors such as "'Button' cannot be used as a JSX
component". Point `react` at the app's own types in the app's `tsconfig.json` (the path is relative
to `baseUrl` if you set one):

```json
{
  "compilerOptions": {
    "paths": { "react": ["./node_modules/@types/react/index.d.ts"] }
  }
}
```

The tarball install needs neither; keeping them does no harm.

### Styles

The styling modes work the same with all three methods:

- Tailwind v4 (Mode 1): `@source "../node_modules/changelui/dist";` also finds the
  classes through the symlink.
- No Tailwind (Mode 2): `import "changelui/styles.css";` once at the app root.
- Copy and paste (Mode 3): no install at all; copy the files from the dashboard's Code tab.

### Other setups (not covered by this repo's checks)

- **Next.js and other bundlers** (webpack, Turbopack): prefer the tarball. With a symlinked install,
  alias `react`, `react-dom` and `motion` to the app's own copies, the same idea as Vite's `dedupe`.
- **Server rendering** with a symlinked install: Node resolves `react` from this repo's folder, so
  the server can load a second React. Use the tarball for SSR apps.
- **GitHub installs** (`npm install github:<user>/<repo>`) do not work yet: npm would need a
  `prepare` script that builds `dist/`, and this repo does not have one.

## Development

The toolchain is pinned to Node 24.17.0 and the npm 11 that ships with it (Node 18 is too old for
Tailwind v4). `.nvmrc` and `.mise.toml` pin the version: run `nvm use`, or prefix commands with
`mise exec node@24.17.0 --` (run `mise trust` once in the project root). The project uses npm only.
Dependencies are pinned to exact versions (`npm install --save-exact`) and `package-lock.json` is
committed, so install with `npm ci`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Showcase dashboard on 127.0.0.1:5173 |
| `npm run preview` | Serves the built dashboard on 127.0.0.1:4173 |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint (0 warnings) |
| `npm run test -- --coverage` | Vitest suites with coverage thresholds |
| `npm run test:watch` | Vitest in watch mode |
| `npm run bench:charts` | Chart core perf budgets with a table of median and best times |
| `npm run build` | Library build to `dist/` (tsup, CJS directive and source-map fixes, Tailwind CSS) |
| `npm run build:watch` | Same build, rerun on every change in `src/` (for linked apps, see [Use it in your other projects](#use-it-in-your-other-projects)) |
| `npm run build:css` | Only `dist/styles.css` and `dist/theme.css` |
| `npm run new -- <name> --category <c>` | Scaffolds a new item and wires it everywhere (see [Adding a component](#adding-a-component)) |
| `npm run remove -- <name>` | Removes an item added with `npm run new` |
| `npm run check:dist` | Dist inspection, build-path scan, `npm pack` file list, publint and attw |
| `npm run build:dashboard` | Static dashboard build to `dashboard/dist` |
| `npm run clean` | Removes `dist`, `coverage`, `dashboard/dist` and `dashboard/dist-e2e` |
| `npm run test:e2e` | Dashboard browser checks (Playwright, Chromium) |
| `npm run test:e2e:analytics` | Analytics browser checks with a fake key and a mocked PostHog host |
| `npm run analytics:report -- --days N` | PostHog insights report to `analytics/insights-YYYY-MM-DD.md` (see [Analytics](#analytics)) |
| `npm run test:consumer` | Packs the library and tests it in two consumer apps |
| `npm run sync:exports` | Regenerates `package.json` `exports` from `scripts/entries.ts` |
| `npm run release` | `clean`, then typecheck, lint, test, build and check:dist, with no network needed |

Before committing, run typecheck, lint, `test -- --coverage`, build, check:dist and
build:dashboard; all must exit 0. `npm publish` runs build and check:dist first (`prepublishOnly`).

### Conventions

- `package.json` `exports` is generated: never edit it by hand. `test/entries.test.ts` fails when it
  drifts from `scripts/entries.ts`.
- No inline `eslint-disable`. The few rule exceptions live in `eslint.config.js`, each scoped to the
  narrowest file glob. `react-hooks` treats any function named `use*` as a hook, so test helpers
  avoid that prefix.
- `asChild` parts (DialogTrigger, PopoverTrigger, ...) must not pass a reset class constant to
  `Slot`: the child's own classes come first, so tailwind-merge would let the reset win.

### Library build

tsup builds two configs: the client entries with a `"use client"` banner, and the server-safe `cn`
and `theme-script` entries. `scripts/fix-cjs-directive.ts` then moves the directive to the front of
the client `.cjs` files, `scripts/fix-cjs-sourcemaps.ts` makes the `.cjs.map` files
package-relative (tsup's CJS splitting pass writes the absolute build path into them), and the
Tailwind CLI builds `dist/styles.css`. check:dist fails if any `dist/` or packed file contains a
home-directory root (macOS, Linux or Windows), the build machine's home directory or its OS username
as a path segment. `.attw.json` skips the `./theme.css` and `./styles.css` subpaths, which attw
would otherwise report as unresolvable.

### Browser checks

These need network access the first time and are not part of `release`.

- Install the browser once: `npx playwright install chromium` (about 100 MB, headless shell).
- `npm run test:e2e` builds the dashboard, serves `vite preview` on 127.0.0.1:4173 and runs
  `e2e/routes.spec.ts` and `e2e/interactions.spec.ts` in a desktop (1440x900) and a mobile
  (360x800) project, selected by the `@desktop` and `@mobile` tags. It takes about 2 minutes, and
  screenshots land in `dashboard/.screenshots/`. It also runs `e2e/analytics-off.spec.ts` (no key:
  no banner, no PostHog chunk).
- `npm run test:e2e:analytics` (`playwright.analytics.config.ts`) builds into `dashboard/dist-e2e`
  with a fake key, serves it on 127.0.0.1:4174 and runs `e2e/analytics.spec.ts` against a mocked
  PostHog host. Any request to posthog.com fails the run.
- `npm run test:consumer` builds and packs the library, installs the tarball into temporary copies
  of `test/consumers/*` (needs npm registry access), then runs tsc, vite build, an ESM and CJS SSR
  smoke and `playwright.consumer.config.ts` against `vite preview` on free 127.0.0.1 ports. The
  temporary directories, the tarball and the servers are removed when it finishes.
- Every dev and preview server binds to 127.0.0.1 only. A server started in the background from a
  non-interactive shell needs `< /dev/null`, or SIGTTIN stops it; the scripts spawn theirs with
  stdin ignored.

## Adding a component

One command creates a working, tested starter and wires it into the library and the dashboard:

```sh
npm run new -- pricing-card --category components             # components | text | effects | backgrounds | charts | hooks
npm run new -- pricing-card --category components --dry-run   # print the plan, write nothing
```

Keep the `--`: without it npm takes `--category` for itself (the command notices and tells you).

**Names** are kebab-case, 2-40 characters, starting with a letter. The export is the PascalCase
name (`pricing-card` gives `PricingCard` and `PricingCardProps`). Hooks are named `use-...`
(`use-dark-mode` gives `useDarkMode`, `UseDarkModeOptions` and `UseDarkModeResult`), and only hooks
may start with `use-`. The command refuses names that already exist, would clash with an existing
export, match an internal module in `src/lib/`, or are reserved (`index`, `styles`, `theme`,
`chunk-*`, ...).

**What it writes.** Each category has its own starter (a toned panel, an entrance text, a floating
effect, a decorative glow, a server-rendered line chart on the chart core, a toggle hook) that
already passes every check:

| File | Change |
| --- | --- |
| `src/<category>/<name>.tsx` (hooks: `src/hooks/<name>.ts`) | new: the item |
| `test/<category>/<name>.test.tsx` | new: render, ref, className, a11y, reduced-motion and server-render tests |
| `dashboard/src/registry/items/<name>.tsx` | new: preview, gallery card, controls, snippet and props table |
| `scripts/entries.ts` | the ENTRIES row, alphabetical within its category |
| `src/index.ts` | the root `export *` line |
| `package.json` | the `./<name>` subpath in `exports` (the same output as `npm run sync:exports`) |
| `test/fixtures.tsx` | a fixture for the smoke, SSR and hydration suites (hooks: a hook probe) |
| `dashboard/src/registry/meta.ts` | the meta row: the item appears in the sidebar, Cmd+K and the gallery |

All eight changes are planned before anything is written. If a write fails, the changes already
made are undone and the tree is left as it was. If the process is killed halfway, `git status`
shows what to restore. When it succeeds, it prints the next steps: make the item yours, adjust its
fixture and tests, fill in the demo, description and keywords, and preview it with `npm run dev`
at `http://127.0.0.1:5173/#/<category>/<name>`.

**Undo** with `npm run remove -- pricing-card` (also takes `--dry-run`). It reverses a scaffold
exactly, refuses the items released in 1.0.0 (removing one is a breaking change, so do that by
hand), and stops while other code still imports or uses the item.

### Conventions checklist

- Named exports only. Components use `React.forwardRef` with a named function, and nothing React
  19-only (`use()`, ref cleanup functions, `<Context>` providers, the `inert` prop).
- Put `ref`, `{...props}` and `className` on the root element. Every intrinsic element's
  `className` is `cn(<reset>, base, variants, tone, className)` with exactly one reset constant
  first (`blockReset`, `controlReset` for form controls, `listReset` for lists).
- `pui` tokens only (`bg-pui-primary`, `rounded-pui-md`): no palette classes, no `dark:` variants,
  no hard-coded colors and no template literals that build class names.
- `"use client"` is the first statement of every item file.
- Reduced motion: read `usePrefersReducedMotion()`. Entrances render their final state, loops stop,
  pointer effects turn off, text shows its final text.
- The first render is the same on the server and the client: use `useIsClient()` for after-mount
  behavior and `<AnimatePresence initial={false}>` for state that is visible from the start.
- Accessibility: real ARIA roles, `*Label` props for icon-only controls, `focusRing` on
  interactive parts, `aria-hidden` on decorative parts.
- Units: Motion durations and delays in seconds; timers in milliseconds with an `Ms` suffix.
- Controlled state: `value` / `defaultValue` / `onValueChange` through `useControllableState`.

### Before you commit

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `npm run check:dist`, and
`npm run test:e2e` for axe and screenshots of the new page in both themes. When you release it, add
the subpath to the table under [Imports](#imports) and to `CHANGELOG.md`, and drop `isNew` from its
meta row a release later.

## License

[MIT](./LICENSE)
