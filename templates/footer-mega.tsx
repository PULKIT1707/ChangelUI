/**
 * Footer: Mega. A big site footer under a slow wave edge: brand blurb with a newsletter field,
 * four link columns (they fold into disclosure groups on narrow containers),
 * a live status pill, keyboard shortcut hints, a theme preset picker, a language select and
 * social links.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user">; the waves hold still under reduced motion.
 */
import { Button } from "changelui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "changelui/collapsible";
import { IconButton } from "changelui/icon-button";
import { Input } from "changelui/input";
import { Kbd } from "changelui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger } from "changelui/select";
import { ThemeSwitcher } from "changelui/theme-switcher";
import { Waves } from "changelui/waves";
import { springs } from "changelui/motion-presets";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type FormEvent, type ReactNode } from "react";

const COLUMNS: { title: string; links: string[] }[] = [
  { title: "Product", links: ["Analytics", "Automations", "Storage", "Security", "Pricing", "Changelog"] },
  { title: "Developers", links: ["Documentation", "API reference", "SDKs", "Status", "Open source"] },
  { title: "Company", links: ["About", "Customers", "Careers", "Press kit", "Contact"] },
  { title: "Legal", links: ["Terms", "Privacy", "Cookies", "DPA", "Security report"] },
];

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Search" },
  { keys: ["G", "D"], label: "Docs" },
  { keys: ["?"], label: "All shortcuts" },
];

const SOCIAL: { label: string; path: ReactNode }[] = [
  { label: "Newsletter", path: <path d="M4 6h16v12H4zM4 7l8 6 8-6" /> },
  { label: "Community forum", path: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /> },
  { label: "Video channel", path: <path d="M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3ZM10 9l5 3-5 3Z" /> },
  { label: "RSS feed", path: <path d="M5 4a15 15 0 0 1 15 15M5 10a9 9 0 0 1 9 9M5 17.5a1.5 1.5 0 1 1 0 .01" /> },
];

const prevent = (event: { preventDefault: () => void }) => event.preventDefault();

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 text-pui-muted-foreground transition-transform duration-200 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function LinkList({ links }: { links: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 pb-4 @3xl:pb-0">
      {links.map((link) => (
        <li key={link}>
          <a
            href="#"
            onClick={prevent}
            className="group/link inline-flex items-center gap-1 rounded-pui-sm text-sm text-pui-muted-foreground no-underline transition-colors hover:text-pui-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring"
          >
            <span className="bg-linear-to-r from-current to-current bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-px transition-[background-size] duration-300 group-hover/link:bg-[length:100%_1px] motion-reduce:transition-none">
              {link}
            </span>
            {link === "Careers" ? <span className="rounded-pui-full bg-pui-primary/12 px-1.5 text-[10px] font-semibold text-pui-primary-text">We're hiring</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function FooterMega() {
  const reduced = usePrefersReducedMotion();
  const id = useId();
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [language, setLanguage] = useState("en");

  const subscribe = (event: FormEvent) => {
    event.preventDefault();
    if (email.includes("@")) setJoined(true);
  };

  return (
    <footer className="@container relative isolate overflow-hidden bg-pui-background pt-28 text-pui-foreground">
      <Waves position="top" height={120} amplitude={16} layers={3} speed={0.6} className="-z-10" />
      <div aria-hidden="true" className="absolute inset-x-0 top-[120px] bottom-0 -z-20 bg-pui-muted/40" />

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 pb-8 @3xl:px-8">
        <div className="grid gap-10 @3xl:grid-cols-[1.3fr_2fr] @3xl:gap-16">
          <div className="flex flex-col gap-5">
            <a href="#" onClick={prevent} className="flex w-fit items-center gap-2 rounded-pui-md text-lg font-semibold tracking-tight text-pui-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring">
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-pui-lg bg-linear-to-br from-pui-gradient-1 to-pui-gradient-3 text-pui-primary-foreground">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <path d="M4 15c3-6 13-6 16 0M8 15c1.5-2.5 6.5-2.5 8 0" />
                </svg>
              </span>
              Halcyon
            </a>
            <p className="max-w-sm text-pretty text-sm text-pui-muted-foreground">
              Calm analytics for teams that ship. Built in the open, hosted in the EU and US, loved by 12,000 teams.
            </p>
            <form onSubmit={subscribe} className="flex max-w-sm flex-col gap-2">
              <label htmlFor={`${id}-email`} className="text-sm font-semibold">
                The monthly digest
              </label>
              <AnimatePresence mode="wait" initial={false}>
                {joined ? (
                  <motion.p
                    key="joined"
                    role="status"
                    initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced ? { duration: 0.15 } : springs.smooth}
                    className="rounded-pui-md bg-pui-success/12 px-3 py-2 text-sm text-pui-success-text"
                  >
                    Thanks! The next issue lands on the first Monday.
                  </motion.p>
                ) : (
                  <motion.div key="form" exit={{ opacity: 0 }} className="flex gap-2">
                    <Input id={`${id}-email`} type="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} wrapperClassName="flex-1" />
                    <Button type="submit">Subscribe</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Wide: four columns. Narrow: each column is a disclosure group. */}
          <nav aria-label="Footer" className="hidden grid-cols-4 gap-8 @3xl:grid">
            {COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold">{column.title}</h3>
                <LinkList links={column.links} />
              </div>
            ))}
          </nav>
          <nav aria-label="Footer" className="flex flex-col border-t border-pui-border @3xl:hidden">
            {COLUMNS.map((column) => (
              <Collapsible key={column.title} className="border-b border-pui-border">
                <h3>
                  <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between py-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-pui-ring aria-expanded:[&>svg]:rotate-180">
                    {column.title}
                    <Chevron />
                  </CollapsibleTrigger>
                </h3>
                <CollapsibleContent>
                  <LinkList links={column.links} />
                </CollapsibleContent>
              </Collapsible>
            ))}
          </nav>
        </div>

        <div className="grid gap-6 rounded-pui-xl border border-pui-border bg-pui-surface/70 p-5 @3xl:grid-cols-3 @3xl:items-center">
          <a
            href="#"
            onClick={prevent}
            className="flex w-fit items-center gap-2.5 rounded-pui-full border border-pui-border bg-pui-background px-3 py-1.5 text-sm text-pui-foreground no-underline hover:border-pui-success/50 focus-visible:outline-2 focus-visible:outline-pui-ring"
          >
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-pui-success opacity-60 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-pui-success" />
            </span>
            All systems normal
          </a>
          <ul aria-label="Keyboard shortcuts" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-pui-muted-foreground @3xl:justify-center">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.label} className="flex items-center gap-1.5">
                <span className="flex gap-0.5">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key} size="sm">
                      {key}
                    </Kbd>
                  ))}
                </span>
                {shortcut.label}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 @3xl:items-end">
            <span className="text-xs font-medium text-pui-muted-foreground">Theme</span>
            <ThemeSwitcher size="sm" className="flex-wrap" />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-pui-border pt-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p className="text-xs text-pui-muted-foreground">© 2026 Halcyon Labs. Made with care in four time zones.</p>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage} size="sm">
              <SelectTrigger aria-label="Language" className="w-36" />
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-pui-border" />
            {SOCIAL.map((social) => (
              <IconButton key={social.label} aria-label={social.label} variant="ghost" tone="neutral" size="sm" asChild>
                <a href="#" onClick={prevent}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    {social.path}
                  </svg>
                </a>
              </IconButton>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
