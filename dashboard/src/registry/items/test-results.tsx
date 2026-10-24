import { TestResults, type TestResultsFilter, type TestResultsProps, type TestSuite } from "changelui";
import { useEffect, useRef, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";

type DemoProps = {
  defaultFilter: TestResultsFilter;
  sort: NonNullable<TestResultsProps["sort"]>;
  defaultExpanded: NonNullable<TestResultsProps["defaultExpanded"]>;
  slowThreshold: number;
  rerun: boolean;
};

const defaults: DemoProps = { defaultFilter: "all", sort: "default", defaultExpanded: "failed", slowThreshold: 500, rerun: true };

const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "defaultFilter", label: "Filter", options: ["all", "failed", "passed", "skipped"] },
  { type: "select", prop: "sort", label: "Sort", options: ["default", "slowest"] },
  { type: "select", prop: "defaultExpanded", label: "Open suites", options: ["failed", "all", "none"] },
  { type: "number", prop: "slowThreshold", label: "Slow at (ms)", min: 100, max: 2000, step: 100 },
  { type: "boolean", prop: "rerun", label: "Rerun actions" },
];

const RUN: TestSuite[] = [
  {
    name: "Checkout › payment",
    file: "src/checkout/payment.test.ts",
    tests: [
      { name: "charges the saved card", status: "passed", duration: 142 },
      {
        name: "applies a percentage promo code before tax",
        status: "failed",
        duration: 318,
        error: {
          message: "expect(received).toBe(expected) // Object.is equality",
          expected: "$89.10",
          received: "$90.00",
          stack: "at Object.<anonymous> (src/checkout/payment.test.ts:48:31)\nat runTest (node_modules/vitest/dist/runner.js:212:9)",
        },
      },
      { name: "retries a declined card once", status: "passed", duration: 1240, retries: 1 },
      { name: "shows 3-D Secure in a dialog", status: "skipped" },
    ],
  },
  {
    name: "Cart",
    file: "src/cart/cart.test.ts",
    tests: [
      { name: "adds an item", status: "passed", duration: 38 },
      { name: "merges duplicate lines", status: "passed", duration: 21 },
      { name: "keeps the cart across sessions", status: "passed", duration: 604 },
      { name: "caps quantity at stock", status: "passed", duration: 17 },
    ],
  },
  {
    name: "Address form",
    file: "src/account/address.test.tsx",
    tests: [
      { name: "reorders fields for Japan", status: "passed", duration: 88 },
      { name: "validates a UK postcode", status: "failed", duration: 54, error: "TypeError: Cannot read properties of undefined (reading 'pattern')" },
      { name: "autofills from the browser", status: "passed", duration: 95 },
    ],
  },
  {
    name: "Search",
    file: "src/search/search.test.ts",
    tests: [
      { name: "ranks exact matches first", status: "passed", duration: 12 },
      { name: "highlights matched words", status: "passed", duration: 9 },
    ],
  },
];

function Preview({ props }: { props: DemoProps }) {
  const [log, setLog] = useState("");
  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <TestResults
        key={`${props.defaultFilter}-${props.defaultExpanded}`}
        suites={RUN}
        title="vitest · 4 files"
        defaultFilter={props.defaultFilter}
        defaultExpanded={props.defaultExpanded}
        sort={props.sort}
        slowThreshold={props.slowThreshold}
        duration={3480}
        onRerun={props.rerun ? (t) => setLog(t.type === "failed" ? "Rerunning 2 failed tests…" : t.type === "suite" ? `Rerunning ${t.suite.name}…` : `Rerunning “${t.test.name}”…`) : undefined}
        onOpenFile={(file) => setLog(`Open ${file}`)}
      />
      <p role="status" className="min-h-4 text-xs text-pui-muted-foreground">
        {log}
      </p>
    </div>
  );
}

function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-80 origin-top scale-90">
      <TestResults suites={RUN.slice(0, 2)} title="vitest" defaultExpanded="none" />
    </div>
  );
}

const LIVE_NAMES = ["renders the header", "opens the menu", "closes on Escape", "traps focus", "restores focus", "announces changes"];

/** A run in progress: tests flip from queued to running to passed, and the bar fills as they land. */
function LiveDemo() {
  const [step, setStep] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (step >= LIVE_NAMES.length * 2) return;
    timer.current = window.setTimeout(() => setStep((s) => s + 1), 650);
    return () => window.clearTimeout(timer.current);
  }, [step]);
  const suites: TestSuite[] = [
    {
      name: "Menu",
      file: "src/menu.test.tsx",
      tests: LIVE_NAMES.map((name, i) => {
        const done = step > i * 2 + 1;
        const running = step === i * 2 || step === i * 2 + 1;
        return {
          name,
          status: done ? (i === 3 ? "failed" : "passed") : running ? "running" : "queued",
          duration: done ? 40 + i * 37 : undefined,
          error: i === 3 ? { message: "Focus left the menu", expected: "button#first", received: "body" } : undefined,
        };
      }),
    },
  ];
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <TestResults suites={suites} title="Watch mode" defaultExpanded="all" />
      <button type="button" onClick={() => setStep(0)} className="self-end text-xs font-medium text-pui-primary-text underline-offset-2 hover:underline">
        Restart run
      </button>
    </div>
  );
}

/** Green run with one flaky pass: nothing opens, the flaky mark still shows inside. */
function GreenDemo() {
  const suites: TestSuite[] = [
    { name: "Auth", file: "e2e/auth.spec.ts", tests: [{ name: "signs in with a passkey", status: "passed", duration: 2310, retries: 2 }, { name: "signs out", status: "passed", duration: 410 }] },
    { name: "Billing", file: "e2e/billing.spec.ts", tests: [{ name: "upgrades the plan", status: "passed", duration: 1820 }, { name: "downloads an invoice", status: "passed", duration: 960 }] },
  ];
  return (
    <div className="mx-auto w-full max-w-md">
      <TestResults suites={suites} title="Playwright · chromium" slowThreshold={1500} defaultExpanded="none" />
    </div>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<TestResults\n  suites={suites}${props.defaultFilter !== "all" ? `\n  defaultFilter="${props.defaultFilter}"` : ""}${props.sort !== "default" ? `\n  sort="${props.sort}"` : ""}${props.defaultExpanded !== "failed" ? `\n  defaultExpanded="${props.defaultExpanded}"` : ""}${props.slowThreshold !== 500 ? `\n  slowThreshold={${props.slowThreshold}}` : ""}${props.rerun ? "\n  onRerun={(target) => rerun(target)}" : ""}\n/>\n\n// suites: [{ name, file, tests: [{ name, status: "failed", duration: 318,\n//   error: { message, expected: "$89.10", received: "$90.00", stack } }] }]`,
  propsTable: propDocs<TestResultsProps>()([
    { name: "suites", type: "TestSuite[]", required: true, description: "{ id?, name, file?, tests: { id?, name, status, duration?, error?, retries? }[] }." },
    { name: "title", type: "ReactNode", default: '"Test results"', description: "Small heading above the status headline." },
    { name: "filter", type: '"all" | "failed" | "passed" | "skipped"', description: "Controlled filter (defaultFilter, onFilterChange)." },
    { name: "sort", type: '"default" | "slowest"', default: '"default"', description: "Slowest sorts suites and tests by duration." },
    { name: "slowThreshold", type: "number", default: "500", description: "ms at which a test is marked slow." },
    { name: "defaultExpanded", type: '"failed" | "all" | "none"', default: '"failed"', description: "Which suites start open." },
    { name: "onRerun", type: "(target: TestRerunTarget) => void", description: "Shows Rerun failed, per-suite and per-failed-test buttons." },
    { name: "onOpenFile", type: "(file, test?) => void", description: "Makes file names buttons." },
    { name: "duration", type: "number", description: "Wall time in ms. Default: sum of tests." },
    { name: "emptyMessage", type: "ReactNode", description: "Shown when the filter matches nothing." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Filter pills, suite toggles, file links and Rerun buttons" },
    { keys: "Enter / Space", action: "Filter, open a suite, show a stack trace" },
  ],
  a11y: [
    "The headline is a polite status, so a finished run is announced.",
    "Status icons carry hidden Passed / Failed / Skipped words; the stacked bar is an image with the counts.",
    "Suite and stack toggles are buttons with aria-expanded and aria-controls.",
    "Expected / Received is a description list, readable without the colors.",
  ],
  reducedMotion: "Bars and suites appear at their final size; the running spinner stops.",
  examples: [
    { title: "Run in progress", description: "Queued → running → passed, one failure lands.", Demo: LiveDemo },
    { title: "Green run with a flaky pass", description: "Nothing opens; slow at 1.5s.", Demo: GreenDemo },
  ],
};

export default item;
