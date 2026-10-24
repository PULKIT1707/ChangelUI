import { LogViewer, type LogLevel, type LogLine, type LogViewerProps } from "changelui";
import { useEffect, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  streaming: boolean;
  follow: boolean;
  showTimestamps: boolean;
  wrap: boolean;
};
const defaults: DemoProps = { streaming: true, follow: true, showTimestamps: true, wrap: false };
const controls: ControlSpec<DemoProps>[] = [
  { type: "boolean", prop: "streaming", label: "Streaming" },
  { type: "boolean", prop: "follow", label: "Follow tail" },
  { type: "boolean", prop: "showTimestamps", label: "Timestamps" },
  { type: "boolean", prop: "wrap", label: "Wrap lines" },
];
const T0 = Date.UTC(2026, 9, 23, 14, 2, 11, 0);
const BUILD: [LogLevel, string, string][] = [
  ["info", "ci", "Checking out 4f2a9c1 (feat: checkout coupons)"],
  ["debug", "ci", "Restoring cache node_modules-6b1d… hit"],
  ["info", "npm", "npm ci --prefer-offline"],
  ["info", "npm", "added 812 packages in 9.4s"],
  ["info", "tsc", "Type-checking 214 files"],
  ["warn", "tsc", "src/cart/total.ts:42:7 'discount' is declared but its value is never read."],
  ["info", "vite", "vite v7.1.2 building for production…"],
  ["info", "vite", "transforming (1284) src/checkout/payment-form.tsx"],
  ["info", "vite", "✓ 1342 modules transformed."],
  ["warn", "vite", "(!) Some chunks are larger than 500 kB after minification: dist/assets/charts-3f9a.js 612.4 kB"],
  ["info", "vite", "dist/index.html                 0.71 kB │ gzip:  0.39 kB"],
  ["info", "vite", "dist/assets/index-b21c.css     48.20 kB │ gzip:  9.12 kB"],
  ["info", "test", "Running 418 tests in 36 files"],
  ["debug", "test", "Using 8 workers"],
  ["error", "test", "FAIL checkout.spec.ts > applies a coupon once per revision: expected 42.00, received 37.80"],
  ["info", "test", "Tests 417 passed, 1 failed (418)"],
  ["error", "ci", "Process exited with code 1"],
];
const toLine = (i: number): LogLine => {
  const [level, source, message] = BUILD[i % BUILD.length]!;
  return { id: i, time: T0 + i * 730, level, source, message };
};
function useStream(running: boolean, initial: number, every = 700) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setCount((c) => (c >= 120 ? initial : c + 1)), every);
    return () => clearInterval(timer);
  }, [running, initial, every]);
  return Array.from({ length: count }, (_, i) => toLine(i));
}
function Preview({ props }: { props: DemoProps }) {
  const lines = useStream(props.streaming, 12);
  return (
    <div className="w-full max-w-3xl">
      <LogViewer
        key={`${props.showTimestamps}-${props.wrap}`}
        title="Build #1842"
        lines={lines}
        follow={props.follow}
        showTimestamps={props.showTimestamps}
        wrap={props.wrap}
        height={300}
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-80">
      <LogViewer title="Build" lines={BUILD.slice(9, 15).map((_, i) => toLine(i + 9))} showTimestamps={false} height={132} />
    </div>
  );
}
const SERVICE: LogLine[] = [
  { id: "a", time: "14:02:11.204", level: "info", source: "api", message: "GET /v1/orders 200 41ms" },
  { id: "b", time: "14:02:11.388", level: "info", source: "api", message: "POST /v1/checkout 201 212ms" },
  { id: "c", time: "14:02:12.020", level: "warn", source: "worker-2", message: "Retrying webhook delivery (attempt 2/5) for evt_9Qx" },
  { id: "d", time: "14:02:12.511", level: "error", source: "api", message: "POST /v1/refunds 502 upstream timeout after 10000ms" },
  { id: "e", time: "14:02:12.640", level: "debug", source: "cache", message: "miss orders:user_381 → fetching" },
  { id: "f", time: "14:02:13.002", level: "info", source: "api", message: "GET /v1/refunds/rf_22 200 18ms" },
  { id: "g", time: "14:02:13.415", level: "error", source: "worker-2", message: "Webhook evt_9Qx failed: connect ECONNREFUSED 10.0.4.12:443" },
];
/** Pre-filtered to problems: debug and info start off, with a search ready to refine. */
function IncidentDemo() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <LogViewer title="checkout-service" lines={SERVICE} defaultLevels={["warn", "error"]} follow={false} height={180} />
    </div>
  );
}
/** No title, no timestamps: a compact output pane for a CLI-style task. */
function CompactDemo() {
  const lines = useStream(true, 3, 900).slice(-40).map((l) => ({ ...l, time: undefined, source: undefined }));
  return (
    <div className="mx-auto w-full max-w-xl">
      <LogViewer lines={lines} showTimestamps={false} wrap height={160} />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) =>
    `<LogViewer\n  title="Build #1842"\n  lines={lines} // { id, time, level, source, message }[]${props.follow ? "" : "\n  follow={false}"}${props.showTimestamps ? "" : "\n  showTimestamps={false}"}${props.wrap ? "\n  wrap" : ""}\n/>`,
  propsTable: propDocs<LogViewerProps>()([
    { name: "lines", type: "LogLine[]", required: true, description: "{ id, time?, level?, message, source? }, oldest first." },
    { name: "title", type: "ReactNode", description: "Header label; also names the log region." },
    { name: "follow", type: "boolean", default: "true", description: "Keep the newest line in view; scrolling up pauses it." },
    { name: "defaultLevels", type: "LogLevel[]", default: "all", description: "Levels shown at first." },
    { name: "defaultSearch", type: "string", default: '""', description: "Initial search text." },
    { name: "showTimestamps", type: "boolean", default: "true", description: "Initial state of the Time toggle." },
    { name: "wrap", type: "boolean", default: "false", description: "Initial state of the Wrap toggle." },
    { name: "maxLines", type: "number", default: "2000", description: "Only the last N lines render." },
    { name: "timeZone", type: "string", default: '"UTC"', description: "Zone for number and Date times; strings show as written." },
    { name: "formatTime", type: "(time) => string", description: "Custom time formatting." },
    { name: "height", type: "number | string", default: "320", description: "Height of the scrolling pane." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Focus the log pane, then scroll with arrow keys" },
    { keys: "End", action: "Jump to the newest line and resume following" },
  ],
  a11y: [
    "The pane is a focusable role=log region with aria-live off, so a fast stream does not flood screen readers.",
    "While paused, a polite status announces how many new lines are waiting; level chips and Time/Wrap are toggle buttons with aria-pressed.",
  ],
  reducedMotion: "The live dot stops pulsing and the jump pill appears without sliding.",
  examples: [
    { title: "Incident triage", description: "Starts on warnings and errors only, with sources highlighted by search.", Demo: IncidentDemo, wide: true },
    { title: "Compact output", description: "No title or timestamps, wrapped lines.", Demo: CompactDemo },
  ],
};
export default item;
