import { Button, Input, JsonViewer, jsonMatches, type JsonViewerProps } from "changelui";
import { useId, useMemo, useState } from "react";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  defaultExpandDepth: number;
  search: string;
  size: NonNullable<JsonViewerProps["size"]>;
};
const defaults: DemoProps = { defaultExpandDepth: 2, search: "", size: "md" };
const controls: ControlSpec<DemoProps>[] = [
  { type: "number", prop: "defaultExpandDepth", label: "Expand depth", min: 0, max: 5, step: 1 },
  { type: "text", prop: "search", label: "Search", maxLength: 30 },
  { type: "select", prop: "size", label: "Size", options: ["sm", "md"] },
];
const order = {
  id: "ord_8f2k1x",
  status: "paid",
  total: 128.5,
  currency: "USD",
  gift: false,
  coupon: null,
  customer: { name: "Riley Chen", email: "riley@example.com", tier: "gold" },
  items: [
    { sku: "TEE-BLK-M", name: "Logo tee", qty: 2, price: 32 },
    { sku: "MUG-WHT", name: "Ceramic mug", qty: 1, price: 18.5 },
    { sku: "HOOD-GRY-L", name: "Zip hoodie", qty: 1, price: 46 },
  ],
  shipping: { method: "express", address: { city: "Lisbon", country: "PT", "postal-code": "1100-148" } },
};
function Preview({ props }: { props: DemoProps }) {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <JsonViewer
        // Remount when the depth changes so the new default applies.
        key={props.defaultExpandDepth}
        data={order}
        rootLabel="order"
        defaultExpandDepth={props.defaultExpandDepth}
        search={props.search}
        size={props.size}
        onCopy={(_, kind, path) => setCopied(`${kind === "path" ? "Path" : "Value"} of ${path}`)}
        className="max-h-96"
      />
      <p className="m-0 text-xs text-pui-muted-foreground" aria-live="polite">
        {copied ? `Copied: ${copied}` : "Hover a row to copy its path or value. Arrow keys move, C copies value, P copies path."}
      </p>
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" className="pointer-events-none w-64">
      <JsonViewer data={{ id: 42, name: "Ada", tags: ["math", "code"], active: true }} size="sm" defaultExpandDepth={1} />
    </div>
  );
}
const response = {
  data: Array.from({ length: 6 }, (_, i) => ({
    id: 1040 + i,
    event: ["signup", "checkout", "refund", "login", "checkout", "signup"][i],
    country: ["US", "DE", "BR", "JP", "IN", "FR"][i],
    latency_ms: [84, 132, 410, 66, 98, 120][i],
  })),
  meta: { page: 1, per_page: 6, total: 1204, next: "/v1/events?page=2" },
};
/** API inspector: a search box with a live match count that opens the matching branches. */
function SearchDemo() {
  const id = useId();
  const [q, setQ] = useState("checkout");
  const count = useMemo(() => jsonMatches(response, q).length, [q]);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">
          Search response
        </label>
        <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search keys and values" size="sm" />
        <span className="w-24 shrink-0 text-end text-xs tabular-nums text-pui-muted-foreground" aria-live="polite">
          {q.trim() ? `${count} ${count === 1 ? "match" : "matches"}` : ""}
        </span>
      </div>
      <JsonViewer data={response} rootLabel="response" defaultExpandDepth={1} search={q} size="sm" className="max-h-80" label="API response" />
    </div>
  );
}
const flags = {
  "new-checkout": { enabled: true, rollout: 0.25, segments: ["beta", "staff"] },
  "dark-mode-default": { enabled: false, rollout: 0 },
  "ai-summaries": { enabled: true, rollout: 1, model: "fast-v2", limits: { daily: 50, burst: 5 } },
};
/** Config panel: start collapsed, expand or collapse everything. */
function ConfigDemo() {
  const [depth, setDepth] = useState(1);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDepth(0)}>
          Collapse all
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDepth(10)}>
          Expand all
        </Button>
      </div>
      <JsonViewer key={depth} data={flags} rootLabel="flags" defaultExpandDepth={depth} label="Feature flags" />
    </div>
  );
}
const failure = {
  error: { code: "card_declined", message: "Your card was declined.", retryable: false, decline_code: "insufficient_funds" },
  request_id: "req_7Qx2",
  attempts: 3,
  last_attempt_at: "2025-10-21T09:14:07Z",
};
/** Log drawer: an error payload, every primitive type at a glance. */
function ErrorDemo() {
  return (
    <div className="mx-auto w-full max-w-md">
      <JsonViewer data={failure} rootLabel="event" defaultExpandDepth={2} size="sm" label="Error event" />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: (props) => {
    const attrs = ["data={order}", 'rootLabel="order"'];
    if (props.defaultExpandDepth !== 1) attrs.push(`defaultExpandDepth={${props.defaultExpandDepth}}`);
    if (props.search) attrs.push(`search="${props.search.replace(/"/g, "&quot;")}"`);
    if (props.size !== "md") attrs.push(`size="${props.size}"`);
    attrs.push("onCopy={(text, kind, path) => toast(`Copied ${kind}`)}");
    return `<JsonViewer\n  ${attrs.join("\n  ")}\n/>`;
  },
  propsTable: propDocs<JsonViewerProps>()([
    { name: "data", type: "unknown", required: true, description: "Any JSON-like value." },
    { name: "defaultExpandDepth", type: "number", default: "1", description: "Containers shallower than this start open." },
    { name: "search", type: "string", description: "Highlights matching keys and values and opens their parents." },
    { name: "rootLabel", type: "string", default: '"root"', description: "Label of the root row." },
    { name: "onCopy", type: '(text, "value" | "path", path) => void', description: "After a copy; paths look like $.items[0].sku." },
    { name: "label", type: "string", default: '"JSON"', description: "Accessible name of the tree." },
    { name: "size", type: '"sm" | "md"', default: '"md"', description: "Text size and indent." },
  ]),
  keyboard: [
    { keys: "ArrowUp / ArrowDown", action: "Move between visible rows" },
    { keys: "ArrowRight", action: "Open a node, or move to its first child" },
    { keys: "ArrowLeft", action: "Close a node, or move to its parent" },
    { keys: "Enter / Space", action: "Toggle the node" },
    { keys: "Home / End", action: "First / last row" },
    { keys: "C / P", action: "Copy the value / the JSONPath of the focused row" },
  ],
  a11y: [
    'role="tree" with one tab stop; rows are treeitems with aria-level, aria-posinset, aria-setsize and aria-expanded.',
    "Copies are announced in a polite status; the hover copy buttons are mouse shortcuts for the C and P keys.",
    "Types differ by color and by syntax (quotes, null in italics), not color alone.",
  ],
  reducedMotion: "Rows appear without the fade-in and the chevron turns instantly.",
  examples: [
    { title: "API response search", description: "search with jsonMatches() for a live count.", Demo: SearchDemo, wide: true },
    { title: "Feature flags", description: "Collapse or expand all by remounting with a new defaultExpandDepth.", Demo: ConfigDemo },
    { title: "Error payload", description: 'size="sm" in a log drawer.', Demo: ErrorDemo },
  ],
};
export default item;
