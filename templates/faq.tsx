/**
 * FAQ. Searchable, filterable questions in a separated accordion: type to narrow the list (matches
 * are highlighted and counted for screen readers), pick a topic, and reach support from the side
 * card when nothing fits.
 *
 * Copy-only template. It is responsive to its container (container queries). Wrap your app in
 * <MotionConfig reducedMotion="user"> so Motion honors the OS setting; the library pieces used here
 * already fall back on their own.
 */
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "changelui/accordion";
import { Avatar, AvatarGroup } from "changelui/avatar";
import { Button } from "changelui/button";
import { Input } from "changelui/input";
import { SegmentedControl, SegmentedControlItem } from "changelui/segmented-control";
import { usePrefersReducedMotion } from "changelui/use-prefers-reduced-motion";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useId, useMemo, useState, type ReactNode } from "react";

type Topic = "all" | "billing" | "product" | "security";

interface Question {
  id: string;
  topic: Exclude<Topic, "all">;
  q: string;
  a: string;
}

const QUESTIONS: Question[] = [
  { id: "trial", topic: "billing", q: "Is there a free trial?", a: "Yes. Every paid plan starts with a 14-day trial with all features on. No credit card needed, and you keep your data if you stay on the free plan afterwards." },
  { id: "switch", topic: "billing", q: "Can I switch plans later?", a: "Any time, from Settings → Billing. Upgrades apply right away and are prorated; downgrades take effect at the end of the current period." },
  { id: "invoice", topic: "billing", q: "Do you send invoices with VAT?", a: "Invoices are emailed after each payment and include your VAT or GST number when you add it to the billing profile." },
  { id: "limits", topic: "product", q: "What happens when I hit my event limit?", a: "Nothing breaks. We keep collecting for 7 days, email you at 80% and 100%, and you can upgrade or pause tracking from the dashboard." },
  { id: "export", topic: "product", q: "Can I export my data?", a: "Export any chart as CSV or PNG, or stream raw events to your warehouse with the Snowflake, BigQuery and S3 connectors." },
  { id: "frameworks", topic: "product", q: "Which frameworks do you support?", a: "React, Next.js, Remix, Astro, Vue, Svelte and plain JavaScript. The SDK is 3 kB and has no dependencies." },
  { id: "sso", topic: "security", q: "Do you support SSO?", a: "SAML and OIDC single sign-on are included in the Team plan, with SCIM provisioning for Okta, Entra ID and Google Workspace." },
  { id: "data", topic: "security", q: "Where is my data stored?", a: "In the region you pick at sign-up (US or EU). Data is encrypted at rest with AES-256 and in transit with TLS 1.3." },
  { id: "soc", topic: "security", q: "Are you SOC 2 compliant?", a: "Yes, SOC 2 Type II. The latest report and our pen-test summary are available under NDA from the trust center." },
];

const TOPICS: { value: Topic; label: string }[] = [
  { value: "all", label: "All" },
  { value: "billing", label: "Billing" },
  { value: "product", label: "Product" },
  { value: "security", label: "Security" },
];

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Wraps every match of `query` in a <mark>. */
function highlight(text: string, query: string): ReactNode {
  const needle = normalize(query.trim());
  if (!needle) return text;
  const haystack = normalize(text);
  const parts: ReactNode[] = [];
  let from = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-pui-sm bg-pui-highlight px-0.5 text-inherit">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
    at = haystack.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  );
}

export default function Faq() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic>("all");
  const deferred = useDeferredValue(query);
  const reduced = usePrefersReducedMotion();
  const id = useId();

  const results = useMemo(() => {
    const needle = normalize(deferred.trim());
    return QUESTIONS.filter(
      (item) => (topic === "all" || item.topic === topic) && (!needle || normalize(`${item.q} ${item.a}`).includes(needle)),
    );
  }, [deferred, topic]);

  return (
    <section className="@container bg-pui-background px-5 py-16 text-pui-foreground @3xl:px-8 @3xl:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 @4xl:grid-cols-[minmax(0,22rem)_1fr] @4xl:gap-16">
        <div className="flex flex-col gap-6 @4xl:sticky @4xl:top-8 @4xl:self-start">
          <div>
            <p className="text-sm font-semibold text-pui-primary-text">Support</p>
            <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight @xl:text-4xl">Frequently asked questions</h2>
            <p className="mt-3 text-pretty text-pui-muted-foreground">Quick answers about plans, the product and how we keep your data safe.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-search`} className="text-sm font-medium">
              Search questions
            </label>
            <Input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="Try “invoice” or “SSO”"
              leadingIcon={<SearchIcon />}
              aria-describedby={`${id}-count`}
            />
            <p id={`${id}-count`} aria-live="polite" className="text-xs text-pui-muted-foreground">
              {results.length === 1 ? "1 answer" : `${results.length} answers`}
            </p>
          </div>
          <div className="hidden rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground @4xl:flex @4xl:flex-col @4xl:gap-4">
            <AvatarGroup size="sm" tooltips={false}>
              {["Mia Torres", "Sam Ito", "Nora Blake"].map((name) => (
                <Avatar key={name} name={name} />
              ))}
            </AvatarGroup>
            <div>
              <p className="font-semibold">Still stuck?</p>
              <p className="mt-1 text-sm text-pui-muted-foreground">Our team answers within 2 hours on weekdays.</p>
            </div>
            <Button variant="outline" tone="neutral">
              Contact support
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="-mx-5 overflow-x-auto px-5 @3xl:mx-0 @3xl:px-0">
            <SegmentedControl aria-label="Topic" value={topic} onValueChange={(v) => setTopic(v as Topic)} size="sm">
              {TOPICS.map((t) => (
                <SegmentedControlItem key={t.value} value={t.value}>
                  {t.label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {results.length > 0 ? (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.15 }}
              >
                <Accordion type="single" collapsible variant="separated" headingLevel={3}>
                  {results.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger>{highlight(item.q, deferred)}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-pui-muted-foreground">{highlight(item.a, deferred)}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="flex flex-col items-center gap-3 rounded-pui-xl border border-dashed border-pui-border px-6 py-12 text-center"
              >
                <span className="grid size-10 place-items-center rounded-pui-full bg-pui-muted text-pui-muted-foreground">
                  <SearchIcon />
                </span>
                <p className="font-medium">No answers match “{deferred.trim()}”</p>
                <p className="text-sm text-pui-muted-foreground">Try another word, or ask us directly.</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    tone="neutral"
                    onClick={() => {
                      setQuery("");
                      setTopic("all");
                    }}
                  >
                    Clear search
                  </Button>
                  <Button size="sm">Contact support</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
