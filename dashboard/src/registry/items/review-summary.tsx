import { Rating, ReviewSummary, type ReviewSummaryProps, type ReviewTopic } from "changelui";
import { useState } from "react";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ControlSpec, ItemModule } from "../types";
type DemoProps = {
  tone: NonNullable<ReviewSummaryProps["tone"]>;
  starTone: NonNullable<ReviewSummaryProps["starTone"]>;
  animate: boolean;
  topics: boolean;
};
const defaults: DemoProps = { tone: "primary", starTone: "warning", animate: true, topics: true };
const controls: ControlSpec<DemoProps>[] = [
  { type: "select", prop: "tone", label: "Tone", options: ["primary", "neutral", "info", "success"] },
  { type: "select", prop: "starTone", label: "Star tone", options: ["warning", "primary", "neutral"] },
  { type: "boolean", prop: "animate", label: "Grow bars on view" },
  { type: "boolean", prop: "topics", label: "Topic chips" },
];
const COUNTS = { 5: 1204, 4: 386, 3: 97, 2: 41, 1: 88 };
const TOPICS: ReviewTopic[] = [
  { id: "sound", label: "Sound quality", count: 642, sentiment: "positive" },
  { id: "battery", label: "Battery life", count: 418, sentiment: "positive" },
  { id: "fit", label: "Fit", count: 233, sentiment: "neutral" },
  { id: "app", label: "Companion app", count: 151, sentiment: "negative" },
];
const REVIEWS = [
  { id: 1, stars: 5, topics: ["sound", "battery"], name: "Priya N.", text: "Bass is tight without drowning vocals, and I charge them twice a week at most." },
  { id: 2, stars: 4, topics: ["fit", "sound"], name: "Jonas W.", text: "Great sound. The medium tips felt loose until I switched to the large ones." },
  { id: 3, stars: 1, topics: ["app"], name: "Ana L.", text: "The app lost pairing after an update and the EQ reset every time." },
  { id: 4, stars: 5, topics: ["battery"], name: "Sam K.", text: "Made it through a 14-hour flight with charge left in the case." },
  { id: 5, stars: 3, topics: ["fit", "app"], name: "Lee M.", text: "Comfortable for an hour, then pressure. App is fine but slow to connect." },
  { id: 6, stars: 2, topics: ["app"], name: "Ravi P.", text: "Hardware is good, firmware updates through the app keep failing." },
];
function Preview({ props }: { props: DemoProps }) {
  const { topics: showTopics, ...rest } = props;
  const [stars, setStars] = useState<number | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const list = REVIEWS.filter((r) => (stars === null || r.stars === stars) && (topic === null || r.topics.includes(topic)));
  return (
    <div className="grid w-full max-w-3xl gap-6 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-md md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <ReviewSummary {...rest} counts={COUNTS} topics={showTopics ? TOPICS : undefined} value={stars} onValueChange={setStars} topic={topic} onTopicChange={setTopic} />
      <ul aria-label="Reviews" className="m-0 flex h-[25rem] list-none flex-col gap-3 overflow-y-auto p-0 pr-1">
        {list.length === 0 ? (
          <li className="grid h-full place-items-center rounded-pui-lg border border-dashed border-pui-border text-sm text-pui-muted-foreground">No reviews match both filters.</li>
        ) : (
          list.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 rounded-pui-lg border border-pui-border p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{r.name}</span>
                <Rating value={r.stars} readOnly size="sm" aria-label={`${r.stars} out of 5 stars`} />
              </div>
              <p className="m-0 text-sm leading-6 text-pui-muted-foreground">{r.text}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
function CompactDemo() {
  return (
    <div className="w-full max-w-xs rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <ReviewSummary title="Guest ratings" counts={{ 5: 48, 4: 9, 3: 2, 2: 0, 1: 1 }} tone="neutral" />
    </div>
  );
}
function TenPointDemo() {
  return (
    <div className="w-full rounded-pui-xl border border-pui-border bg-pui-surface p-4 text-pui-surface-foreground">
      <ReviewSummary
        title="App store, last 90 days"
        counts={{ 5: 3120, 4: 610, 3: 240, 2: 190, 1: 820 }}
        starTone="primary"
        tone="info"
        topics={[
          { id: "sync", label: "Sync", count: 512, sentiment: "negative" },
          { id: "widgets", label: "Widgets", count: 344, sentiment: "positive" },
          { id: "dark", label: "Dark mode", count: 120, sentiment: "positive" },
        ]}
      />
    </div>
  );
}
function Mini() {
  return (
    <div aria-hidden="true" inert className="pointer-events-none w-56">
      <ReviewSummary counts={COUNTS} animate={false} title="Reviews" />
    </div>
  );
}
const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls,
  snippet: ({ topics, ...props }) =>
    toJsx<Record<string, unknown>>("ReviewSummary", props, { tone: "primary", starTone: "warning", animate: true }).replace(
      "<ReviewSummary",
      `<ReviewSummary counts={{ 5: 1204, 4: 386, 3: 97, 2: 41, 1: 88 }}${topics ? " topics={topics} topic={topic} onTopicChange={setTopic}" : ""} value={stars} onValueChange={setStars}`,
    ),
  propsTable: propDocs<ReviewSummaryProps>()([
    { name: "counts", type: "Record<number, number>", required: true, description: "Reviews per star, e.g. { 5: 812, 4: 203, ... }." },
    { name: "max", type: "number", default: "5", description: "Highest star." },
    { name: "value", type: "number | null", description: "Star filter (controlled); null shows all." },
    { name: "defaultValue", type: "number | null", default: "null", description: "Starting star filter." },
    { name: "onValueChange", type: "(stars | null) => void", description: "Row clicked or filter chip removed." },
    { name: "topics", type: "ReviewTopic[]", description: "Theme chips: { id, label, count?, sentiment? }." },
    { name: "topic", type: "string | null", description: "Topic filter (controlled)." },
    { name: "defaultTopic", type: "string | null", default: "null", description: "Starting topic filter." },
    { name: "onTopicChange", type: "(id | null) => void", description: "Topic toggled." },
    { name: "title", type: "ReactNode", default: '"Customer reviews"', description: "Heading above the average." },
    { name: "locale", type: "string", default: '"en-US"', description: "Number formatting." },
    { name: "animate", type: "boolean", default: "true", description: "Bars grow in once when scrolled into view." },
    { name: "starTone", type: "Tone", default: '"warning"', description: "Star and bar color." },
    { name: "tone", type: "Tone", default: '"primary"', description: "Selected row and chip color." },
  ]),
  keyboard: [
    { keys: "Tab", action: "Reach the rating rows, topic chips and filter chips" },
    { keys: "↑ / ↓", action: "Move between rating rows" },
    { keys: "Enter / Space", action: "Toggle the focused filter" },
  ],
  a11y: [
    "The average is spelled out for screen readers; the stars are decorative.",
    "Rating rows and topic chips are toggle buttons (aria-pressed) with counts and percentages in their names; empty rows are disabled.",
    "Active filters render as removable chips, and a polite status announces what the list now shows.",
  ],
  reducedMotion: "Bars render at their final width without growing.",
  examples: [
    { title: "Compact", description: "A small sidebar summary with a neutral selection color.", Demo: CompactDemo },
    { title: "Polarized ratings", description: "Lots of fives and ones: the spread says more than the average.", Demo: TenPointDemo },
  ],
};
export default item;
