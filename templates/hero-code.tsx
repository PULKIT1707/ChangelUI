/**
 * Hero: Code. A dev-tool hero: copy and an install command on the left (hover or focus the
 * command for a package card), and a terminal session that types itself out on the right.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user"> so Motion honors the OS setting; the library pieces used here
 * already fall back on their own.
 */
import { Badge } from "changelui/badge";
import { Button } from "changelui/button";
import { CopyButton } from "changelui/copy-button";
import { DotPattern } from "changelui/dot-pattern";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "changelui/hover-card";
import { Kbd } from "changelui/kbd";
import { Terminal, TerminalLine } from "changelui/terminal";

const INSTALL = "npm create orbit@latest";

const FEATURES = [
  "Zero-config TypeScript, JSX and CSS modules",
  "Cold start under 300 ms on large monorepos",
  "Plugins in plain functions, no DSL to learn",
];

function Check() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-pui-success-text" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

function PackageCard() {
  return (
    <div className="flex w-72 flex-col gap-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-10 place-items-center rounded-pui-lg bg-pui-primary text-pui-primary-foreground">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="4" />
            <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-semibold">create-orbit</p>
          <p className="text-xs text-pui-muted-foreground">Scaffolds a new Orbit project</p>
        </div>
        <Badge size="sm" tone="success" variant="soft" className="ms-auto">
          v2.4.1
        </Badge>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Install", "1.8 MB"],
          ["Deps", "0"],
          ["License", "MIT"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-pui-md bg-pui-muted px-2 py-1.5">
            <dt className="text-[11px] text-pui-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-pui-muted-foreground">Asks three questions, writes a starter, and never phones home.</p>
    </div>
  );
}

export default function HeroCode() {
  return (
    <section className="@container relative isolate overflow-hidden bg-pui-background text-pui-foreground">
      <DotPattern mask="radial" className="-z-10 opacity-60" />
      <div
        aria-hidden="true"
        className="absolute -right-32 top-10 -z-10 size-[28rem] rounded-pui-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--pui-primary)_22%,transparent),transparent_65%)] blur-2xl"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 @3xl:px-8 @3xl:py-24 @5xl:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <a
            href="#release"
            className="inline-flex items-center gap-2 rounded-pui-full border border-pui-border bg-pui-surface px-3 py-1 font-mono text-xs text-pui-muted-foreground transition-colors hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
          >
            <span className="size-1.5 rounded-pui-full bg-pui-success" aria-hidden="true" />
            v2.4 · streaming SSR is stable
          </a>
          <h1 className="text-balance text-4xl font-bold tracking-tight @xl:text-5xl">
            The build tool that{" "}
            <span className="bg-linear-to-r from-pui-gradient-1 via-pui-gradient-2 to-pui-gradient-3 bg-clip-text text-transparent">
              gets out of your way
            </span>
          </h1>
          <p className="max-w-lg text-pretty text-base text-pui-muted-foreground @xl:text-lg">
            Orbit compiles, serves and bundles your app with one command. No config file until you need one, and then it is
            twelve lines.
          </p>

          <div className="flex w-full max-w-md items-center gap-2 rounded-pui-lg border border-pui-border bg-pui-surface py-1.5 pe-1.5 ps-4 font-mono text-sm shadow-pui-xs">
            <span aria-hidden="true" className="select-none text-pui-muted-foreground">
              $
            </span>
            <HoverCard openDelayMs={250}>
              <HoverCardTrigger
                href="#package"
                className="min-w-0 flex-1 truncate rounded-pui-sm text-pui-foreground underline decoration-pui-border decoration-dotted underline-offset-4 hover:decoration-pui-primary"
              >
                {INSTALL}
              </HoverCardTrigger>
              <HoverCardContent side="bottom" align="start" arrow>
                <PackageCard />
              </HoverCardContent>
            </HoverCard>
            <CopyButton value={INSTALL} label="Copy install command" size="sm" variant="ghost" tone="neutral" />
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2">
                <Check />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="flex w-full flex-col gap-3 @md:w-auto @md:flex-row @md:items-center">
            <Button size="lg">Read the docs</Button>
            <Button size="lg" variant="outline" tone="neutral">
              Star on GitHub
              <span className="ms-1 rounded-pui-sm bg-pui-muted px-1.5 text-xs tabular-nums text-pui-muted-foreground">18.4k</span>
            </Button>
            <span className="hidden items-center gap-1 text-xs text-pui-muted-foreground @5xl:inline-flex">
              or press <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>
        </div>

        <div className="relative min-w-0">
          <div
            aria-hidden="true"
            className="absolute -inset-4 -z-10 rounded-[calc(var(--pui-radius-xl)+1rem)] bg-linear-to-br from-pui-gradient-1/25 via-transparent to-pui-gradient-3/25 blur-xl"
          />
          <Terminal title="~/projects — zsh" prompt="❯" loop loopDelayMs={4000} typeSpeedMs={40} className="w-full shadow-pui-xl">
            <TerminalLine type="command">{`${INSTALL} my-app`}</TerminalLine>
            <TerminalLine tone="primary">◆ Project name: my-app</TerminalLine>
            <TerminalLine tone="primary">◆ Template: react-ts</TerminalLine>
            <TerminalLine type="progress" duration={1.3}>
              Installing dependencies
            </TerminalLine>
            <TerminalLine tone="success">✓ Ready in 1.2s</TerminalLine>
            <TerminalLine type="command">cd my-app && npm run dev</TerminalLine>
            <TerminalLine delay={0.3}>orbit v2.4.1 dev server running</TerminalLine>
            <TerminalLine tone="info">➜ Local: http://127.0.0.1:3000/</TerminalLine>
          </Terminal>
        </div>
      </div>
    </section>
  );
}
