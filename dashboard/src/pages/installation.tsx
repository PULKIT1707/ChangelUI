import { Alert } from "changelui";
import type { ReactNode } from "react";
import { CodeBlock } from "../components/code-block";
import { INSTALL_COMMAND } from "../lib/nav";
import { docHref } from "../router";

export function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 text-sm leading-relaxed text-pui-muted-foreground [&_code]:font-mono [&_code]:text-pui-foreground">{children}</div>;
}

const mode1 = `/* app.css */
@import "tailwindcss";
@import "changelui/theme.css";
@source "../node_modules/changelui/dist";`;

const mode2 = `// main.tsx
import "changelui/styles.css";`;

const usage = `import { Button } from "changelui";
// or, per item:
import { Button } from "changelui/button";

export function Save() {
  return <Button>Save</Button>;
}`;

const localInstall = `# in the library repo: apps load the built dist/
npm ci && npm run build

# in your app, pick one (paths relative to the app)
npm install ../changelui                                   # folder (symlink)
npm install ../changelui/changelui-1.0.0.tgz     # tarball, after npm pack in the repo
npm link changelui                                         # link, after npm link in the repo

# and the peers, in the app
npm install react react-dom motion

# live updates for folder and link installs: keep this running in the repo
npm run build:watch`;

const viteDedupe = `// vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom", "motion"] },
});`;

const tsPaths = `// tsconfig.json of a React 18 app with a symlinked install
{
  "compilerOptions": {
    "paths": { "react": ["./node_modules/@types/react/index.d.ts"] }
  }
}`;

const motionConfig = `import { MotionConfig } from "motion/react";

<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>`;

const rsc = `// app/layout.tsx (a Server Component)
import { cn } from "changelui/cn";
import { getThemeInitScript } from "changelui/theme-script";

<script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />`;

const CONFIG_SNIPPET = { snippet: "config", surface: "installation" } as const;

export function Installation() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-3">
        <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none sm:text-4xl">
          Installation
        </h1>
        <p className="text-base text-pui-muted-foreground">
          Install the package, pick a styling mode, and import from the root or from one subpath per item.
        </p>
      </header>

      <DocSection id="install" title="Install">
        <CodeBlock code={INSTALL_COMMAND} copyLabel="Copy install command" analytics={{ snippet: "install", surface: "installation" }} />
        <Prose>
          <p>
            Peer dependencies: <code>react</code> and <code>react-dom</code> 18 or newer, and <code>motion</code> 11.11.17
            through 14.x. The only runtime dependencies are <code>clsx</code> and <code>tailwind-merge</code>.
          </p>
        </Prose>
        <CodeBlock code={usage} copyLabel="Copy usage example" analytics={{ snippet: "usage", surface: "installation" }} />
      </DocSection>

      <DocSection id="mode-1" title="Mode 1: Tailwind CSS v4">
        <Prose>
          <p>
            Import the tokens and let Tailwind scan the package, so only the classes you use are generated. Token
            utilities are namespaced (<code>bg-pui-primary</code>, <code>rounded-pui-md</code>), so they never clash with
            your own <code>--color-primary</code>.
          </p>
        </Prose>
        <CodeBlock code={mode1} copyLabel="Copy Tailwind setup" analytics={CONFIG_SNIPPET} />
      </DocSection>

      <DocSection id="mode-2" title="Mode 2: prebuilt CSS">
        <Prose>
          <p>
            No Tailwind? Import the prebuilt stylesheet once. Components carry their own small resets, so they look
            right without Tailwind's preflight.
          </p>
        </Prose>
        <CodeBlock code={mode2} copyLabel="Copy CSS import" analytics={CONFIG_SNIPPET} />
      </DocSection>

      <DocSection id="mode-3" title="Mode 3: copy and paste">
        <Prose>
          <p>
            Every item page has a Code tab with the item file and the internal files it imports (Also copy). Copy them
            into your project, keep the relative imports, add <code>clsx</code>, <code>tailwind-merge</code> and{" "}
            <code>motion</code> where listed, and add the tokens from <a className="underline" href={docHref("theming")}>theme.css</a>.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="local-projects" title="Use it in your other projects">
        <Prose>
          <p>
            Apps on your machine can use the library folder without publishing it. Build it first: apps load{" "}
            <code>dist/</code>, and no install method builds it for you. A folder install or <code>npm link</code>{" "}
            symlinks the repo, so a rebuild is live in the app; a tarball from <code>npm pack</code> is a real copy,
            exactly what a registry install gives you, and you pack and install again after a change.
          </p>
        </Prose>
        <CodeBlock code={localInstall} copyLabel="Copy local install commands" data-testid="local-install-code" analytics={CONFIG_SNIPPET} />
        <Alert tone="info" title="Symlinked installs: keep one copy of React">
          A symlinked install resolves imports from the library folder, which has its own development copies of React
          and Motion. Add <code className="font-mono">resolve.dedupe</code> so Vite always uses the app's copies;
          without it the page stays blank with "Invalid hook call". On another React major than the library's (React
          19), also point TypeScript at the app's React types. The tarball needs neither.
        </Alert>
        <CodeBlock code={viteDedupe} copyLabel="Copy Vite dedupe config" data-testid="vite-dedupe-code" analytics={CONFIG_SNIPPET} />
        <CodeBlock code={tsPaths} copyLabel="Copy TypeScript paths config" data-testid="ts-paths-code" analytics={CONFIG_SNIPPET} />
        <Prose>
          <p>
            <code>npm run build:watch</code> rebuilds <code>dist/</code> after every change in <code>src/</code>, and the
            Vite dev server updates the open page by itself. Styling works as above with all three methods: the Tailwind{" "}
            <code>@source</code> line also finds the classes through the symlink, and apps without Tailwind import{" "}
            <code>changelui/styles.css</code>. Next.js, other bundlers and server rendering with a symlink are
            not covered by the repo's checks: prefer the tarball there. The README has the details.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="motion-config" title="Respect reduced motion">
        <Prose>
          <p>
            Components already honor <code>prefers-reduced-motion</code>. Wrapping your app in MotionConfig makes your
            own Motion animations follow the same setting.
          </p>
        </Prose>
        <CodeBlock code={motionConfig} copyLabel="Copy MotionConfig example" analytics={CONFIG_SNIPPET} />
      </DocSection>

      <DocSection id="rsc" title="Next.js and React Server Components">
        <Prose>
          <p>
            Every component file starts with <code>"use client"</code>, so you can render them from Server Components.
            The two pure helpers, <code>cn</code> and <code>getThemeInitScript</code>, are server-safe only from their own
            subpaths; the root entry is a client module.
          </p>
        </Prose>
        <CodeBlock code={rsc} copyLabel="Copy server example" analytics={CONFIG_SNIPPET} />
      </DocSection>

      <DocSection id="react-versions" title="React 18 and 19">
        <Alert tone="info" title="Both supported">
          The library avoids React 19-only APIs (no <code className="font-mono">use()</code>, no ref cleanup returns, no
          context provider shorthand), so the same build works on React 18.3 and 19.x.
        </Alert>
      </DocSection>
    </article>
  );
}
