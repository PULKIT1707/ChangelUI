import { Badge, ConsentBanner, type ConsentBannerProps, type ConsentChoices, type ConsentMethod } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  title: string;
  showPill: boolean;
  policy: boolean;
  acceptLabel: string;
  rejectLabel: string;
};

const defaults: DemoProps = { title: "Your privacy choices", showPill: true, policy: true, acceptLabel: "Accept all", rejectLabel: "Reject all" };

const controls: ControlSpec<DemoProps>[] = [
  { type: "text", prop: "title", label: "Title", maxLength: 40 },
  { type: "boolean", prop: "policy", label: "Policy link" },
  { type: "boolean", prop: "showPill", label: "Reopen pill" },
  { type: "text", prop: "acceptLabel", label: "Accept label", maxLength: 20 },
  { type: "text", prop: "rejectLabel", label: "Reject label", maxLength: 20 },
];

/** A faux page so the banner sits where it would in a product: over the corner of real content. */
function PageBehind() {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <span className="h-3 w-24 rounded-pui-sm bg-pui-foreground/60" />
        <span className="flex gap-2">
          <span className="h-2.5 w-12 rounded-pui-sm bg-pui-muted" />
          <span className="h-2.5 w-12 rounded-pui-sm bg-pui-muted" />
          <span className="h-2.5 w-12 rounded-pui-sm bg-pui-muted" />
        </span>
      </div>
      <span className="mt-6 h-6 w-2/3 rounded-pui-md bg-pui-foreground/15" />
      <span className="h-3 w-1/2 rounded-pui-sm bg-pui-muted" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-24 rounded-pui-lg border border-pui-border bg-pui-surface" />
        ))}
      </div>
    </div>
  );
}

function describe(choices: ConsentChoices): string {
  const on = Object.entries(choices)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return on.join(", ");
}

function Preview({ props }: { props: DemoProps }) {
  const { policy, ...rest } = props;
  const [decision, setDecision] = useState<{ choices: ConsentChoices; method: ConsentMethod } | null>(null);
  const [round, setRound] = useState(0);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <div className="relative h-[460px] w-full overflow-hidden rounded-pui-xl border border-pui-border bg-pui-background">
        <PageBehind />
        <div className="absolute bottom-4 left-4 w-[min(26rem,calc(100%-2rem))]">
          <ConsentBanner
            key={round}
            {...rest}
            position="inline"
            policyHref={policy ? "#/components/consent-banner" : undefined}
            onDecide={(choices, method) => setDecision({ choices, method })}
          />
        </div>
      </div>
      <div className="flex min-h-8 flex-wrap items-center gap-2 text-xs text-pui-muted-foreground">
        {decision ? (
          <>
            <Badge size="sm" variant="soft" tone={decision.method === "accept-all" ? "success" : decision.method === "reject-all" ? "neutral" : "info"}>
              {decision.method}
            </Badge>
            <span>onDecide → {describe(decision.choices)}</span>
            <button
              type="button"
              className="ml-auto cursor-pointer rounded-pui-sm text-pui-primary-text underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-pui-ring"
              onClick={() => {
                setDecision(null);
                setRound((r) => r + 1);
              }}
            >
              Show the banner again
            </button>
          </>
        ) : (
          <span>Nothing is stored or sent: the choice comes back to your app through onDecide.</span>
        )}
      </div>
    </div>
  );
}

function StoredDemo() {
  return (
    <div className="flex h-60 flex-col justify-end rounded-pui-xl border border-pui-border bg-pui-background p-4">
      <p className="m-0 mb-auto text-sm text-pui-muted-foreground">
        A returning visitor: <code className="font-mono text-xs">defaultValue</code> came from your storage, so only the pill shows. Open it to change
        a single category; Escape closes without changes.
      </p>
      <ConsentBanner position="inline" defaultValue={{ preferences: true, analytics: true, marketing: false }} />
    </div>
  );
}

function CustomCategoriesDemo() {
  return (
    <ConsentBanner
      position="inline"
      title="Data used in this app"
      description="Pick what this workspace may collect. Required items keep you signed in."
      customizeLabel="Choose"
      categories={[
        { id: "session", label: "Session", description: "Keeps you signed in on this device.", required: true },
        { id: "crash", label: "Crash reports", description: "Error details when the app fails.", defaultEnabled: true },
        { id: "usage", label: "Usage insights", description: "Which features your team uses most." },
      ]}
    />
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-72 scale-90">
      <ConsentBanner position="inline" description="Optional cookies stay off until you say yes." />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ policy, ...props }) =>
    toJsx<Record<string, unknown>>(
      "ConsentBanner",
      { ...props, ...(policy ? { policyHref: "/privacy" } : {}) },
      { title: "Your privacy choices", showPill: true, acceptLabel: "Accept all", rejectLabel: "Reject all" },
      undefined,
      controls as ControlSpec<Record<string, unknown>>[],
    ).replace("<ConsentBanner", "<ConsentBanner\n  defaultValue={readStoredConsent()}\n  onDecide={(choices) => saveConsent(choices)}"),
  propsTable: propDocs<ConsentBannerProps>()([
    { name: "categories", type: "ConsentCategory[]", default: "necessary, preferences, analytics, marketing", description: "{ id, label, description?, required?, defaultEnabled? }." },
    { name: "onDecide", type: "(choices, method) => void", description: "Every category's value plus \"accept-all\", \"reject-all\" or \"custom\"." },
    { name: "defaultValue", type: "Record<string, boolean> | null", default: "null", description: "A stored decision; when set the banner starts as the pill." },
    { name: "position", type: '"bottom-left" | "bottom-right" | "bottom" | "inline"', default: '"bottom-left"', description: "Fixed corner or in flow." },
    { name: "title", type: "ReactNode", default: '"Your privacy choices"', description: "Region heading." },
    { name: "description", type: "ReactNode", description: "One plain sentence about the cookies." },
    { name: "policyHref", type: "string", description: "Adds a policy link after the description." },
    { name: "policyLabel", type: "string", default: '"Privacy policy"', description: "Link text." },
    { name: "showPill", type: "boolean", default: "true", description: "Keep a small reopen pill after deciding." },
    { name: "pillLabel", type: "string", default: '"Privacy"', description: "Pill text." },
    { name: "acceptLabel", type: "string", default: '"Accept all"', description: "Accept button." },
    { name: "rejectLabel", type: "string", default: '"Reject all"', description: "Reject button, same weight as Accept." },
    { name: "customizeLabel", type: "string", default: '"Customize"', description: "Expands the categories." },
    { name: "saveLabel", type: "string", default: '"Save choices"', description: "Replaces Customize once expanded." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Move through the actions and switches" },
    { keys: "Space", action: "Toggle a category" },
    { keys: "Escape", action: "Close a reopened banner without changes" },
  ],
  a11y: [
    "A labelled region (not a modal), so the page stays usable and nothing traps focus.",
    "Each switch is named by its category and described by its note; required ones read \"Always on\".",
    "After a decision focus moves to the pill; reopening moves focus into the banner.",
  ],
  reducedMotion: "The banner, pill and category list appear and disappear without scaling or sliding.",
  examples: [
    { title: "Returning visitor", description: "A stored decision starts as the reopen pill.", Demo: StoredDemo },
    { title: "Product data choices", description: "Custom categories with an opted-in default.", Demo: CustomCategoriesDemo },
  ],
};

export default item;
