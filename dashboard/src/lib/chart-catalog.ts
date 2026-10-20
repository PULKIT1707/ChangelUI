// Dashboard-only chart chooser data (charts-roadmap 8.1): every planned chart with the jobs it does
// and one line on when to reach for it. Charts that are already in the registry render as live
// gallery cards; the rest are listed as "on the way", so a new chart appears in the chooser the
// moment its registry row lands. Add a row here when you scaffold a chart that is not listed yet.

export const CHART_INTENTS = [
  { id: "change", label: "Change over time", blurb: "How a value rises, falls or cycles across time." },
  { id: "compare", label: "Compare categories", blurb: "Side-by-side values across groups, products or regions." },
  { id: "part", label: "Part-to-whole", blurb: "How the pieces add up to a total." },
  { id: "distribution", label: "Distribution", blurb: "How values spread, cluster and stray." },
  { id: "correlation", label: "Correlation", blurb: "Whether two or more measures move together." },
  { id: "ranking", label: "Ranking", blurb: "Who leads, and how positions shift." },
  { id: "flow", label: "Flow", blurb: "How quantities move between stages or nodes." },
  { id: "hierarchy", label: "Hierarchy", blurb: "Nested structures sized by value." },
  { id: "kpi", label: "KPI", blurb: "One number, its target and its trend, at a glance." },
  { id: "storytelling", label: "Storytelling", blurb: "Charts that guide, quiz or let readers play." },
  { id: "toolkit", label: "Toolkit", blurb: "Building blocks and add-ons that work with any chart." },
] as const;

export type ChartIntent = (typeof CHART_INTENTS)[number]["id"];

export interface ChartCatalogEntry {
  slug: string;
  /** Shown until the chart has a registry row (which then supplies the title). */
  title: string;
  /** The jobs this chart does, most important first. */
  intents: readonly ChartIntent[];
  /** One line on when to use it. */
  use: string;
}

const row = (slug: string, title: string, intents: readonly ChartIntent[], use: string): ChartCatalogEntry => ({
  slug,
  title,
  intents,
  use,
});

export const CHART_CATALOG: readonly ChartCatalogEntry[] = [
  // Toolkit
  row("chart", "Chart", ["toolkit", "change", "compare"], "Compose axes, series and overlays yourself when no preset fits."),
  row("chart-scales", "Chart scales", ["toolkit"], "Use the pure scales, ticks and layouts for server-rendered SVG, OG images or your own canvas."),
  row("chart-zoom", "Chart zoom", ["toolkit", "change"], "Add zoom, pan and a navigator when a series is too long to read at one width."),
  row("chart-export", "Chart export", ["toolkit"], "Let people take the chart with them as PNG, SVG or the CSV behind it."),
  row("chart-insights", "Chart insights", ["toolkit", "storytelling"], "Call out peaks, anomalies and change points automatically, and say them in words."),
  row("chart-sonify", "Chart sonify", ["toolkit", "storytelling"], "Let people hear the shape of a series: pitch follows the value."),
  // Essentials
  row("line-chart", "Line chart", ["change", "compare"], "Use a line chart for a trend over continuous time, with up to about five series."),
  row("area-chart", "Area chart", ["change", "part"], "Use an area chart when volume matters, or stack it to show how parts add up over time."),
  row("bar-chart", "Bar chart", ["compare", "ranking", "part"], "Use bars to compare values across categories; go horizontal when labels are long."),
  row("scatter-chart", "Scatter chart", ["correlation", "distribution"], "Use a scatter plot to see whether two measures move together and to spot outliers."),
  row("pie-chart", "Pie chart", ["part"], "Use a pie or donut for a few parts of one whole, ideally five slices or fewer."),
  row("sparkline", "Sparkline", ["kpi", "change"], "Use a sparkline for the shape of a trend inline, next to a number or in a table cell."),
  row("combo-chart", "Combo chart", ["change", "compare"], "Use a combo chart when a volume (bars) and a rate (line) share one timeline."),
  // KPI
  row("stat-card", "Stat card", ["kpi"], "Use a stat card for a headline number with its change and a small trend."),
  row("bar-list", "Bar list", ["ranking", "kpi"], "Use a bar list for a top-N ranking such as top pages or countries, with a link per row."),
  row("gauge-chart", "Gauge chart", ["kpi"], "Use a gauge for one value against a known range with good and bad bands."),
  row("bullet-chart", "Bullet chart", ["kpi", "compare"], "Use a bullet chart to show a value against its target in very little space."),
  row("activity-rings", "Activity rings", ["kpi"], "Use activity rings for progress toward two or three daily goals."),
  row("liquid-gauge", "Liquid gauge", ["kpi"], "Use a liquid gauge for a single fill level, like storage used or a fundraising goal."),
  row("status-tracker", "Status tracker", ["kpi", "change"], "Use a status tracker for uptime or build history, one block per day."),
  row("waffle-chart", "Waffle chart", ["part", "kpi"], "Use a waffle chart to say things like \u201c3 in 10\u201d with countable units."),
  row("radial-bar-chart", "Radial bar chart", ["kpi", "compare"], "Use radial bars for a few progress values in a compact square."),
  // Distribution
  row("histogram-chart", "Histogram", ["distribution"], "Use a histogram to show how one measure is spread and where most values fall."),
  row("box-plot", "Box plot", ["distribution", "compare"], "Use a box plot to compare spread and outliers across groups at a glance."),
  row("beeswarm-chart", "Beeswarm chart", ["distribution"], "Use a beeswarm when every individual point should stay visible in a distribution."),
  row("ridgeline-chart", "Ridgeline chart", ["distribution", "compare"], "Use a ridgeline to compare the shape of distributions across many groups."),
  row("radial-clock", "Radial clock", ["distribution", "change"], "Use a radial clock to show when things happen across a day or a week."),
  row("calendar-heatmap", "Calendar heatmap", ["change", "distribution"], "Use a calendar heatmap for daily activity across weeks and months."),
  row("heatmap-chart", "Heatmap", ["correlation", "change"], "Use a heatmap for a grid of two categories, such as cohort retention or hour by weekday."),
  row("parallel-coordinates", "Parallel coordinates", ["correlation", "distribution"], "Use parallel coordinates to filter many rows across many measures at once."),
  // Compare + ranking
  row("radar-chart", "Radar chart", ["compare"], "Use a radar chart to compare a few items across five to eight shared measures."),
  row("dumbbell-chart", "Dumbbell chart", ["compare"], "Use a dumbbell to show the gap between two values for each category."),
  row("slope-chart", "Slope chart", ["change", "ranking"], "Use a slope chart for exactly two time points, such as before and after."),
  row("bump-chart", "Bump chart", ["ranking", "change"], "Use a bump chart to follow positions in a ranking over time."),
  row("small-multiples", "Small multiples", ["compare", "change"], "Use small multiples to compare the same chart across many groups on shared scales."),
  row("diff-chart", "Diff chart", ["change", "compare"], "Use a diff chart to show where actuals ran above or below a target or the last period."),
  // Part-to-whole + hierarchy + flow
  row("waterfall-chart", "Waterfall chart", ["part", "storytelling"], "Use a waterfall to explain how a starting value becomes an ending one, step by step."),
  row("treemap-chart", "Treemap", ["hierarchy", "part"], "Use a treemap to show the size of many nested parts in one compact rectangle."),
  row("sunburst-chart", "Sunburst chart", ["hierarchy", "part"], "Use a sunburst when the depth of a hierarchy matters as much as the size of its parts."),
  row("funnel-chart", "Funnel chart", ["flow", "part"], "Use a funnel to show how many people make it through each step of a process."),
  row("sankey-chart", "Sankey chart", ["flow", "part"], "Use a sankey to show how quantities split and merge between stages."),
  row("network-graph", "Network graph", ["flow", "correlation"], "Use a network graph to explore who or what is connected to what."),
  row("stream-chart", "Stream chart", ["change", "part"], "Use a streamgraph for many layers over time when the overall shape matters more than exact values."),
  // Time + finance
  row("candlestick-chart", "Candlestick chart", ["change"], "Use candlesticks for price action: open, high, low and close per period."),
  row("live-chart", "Live chart", ["change", "kpi"], "Use a live chart for streaming values such as metrics, sensors or prices."),
  row("gantt-chart", "Gantt chart", ["change", "flow"], "Use a Gantt chart to plan tasks over time together with their dependencies."),
  // Storytelling
  row("morph-chart", "Morph chart", ["storytelling", "part"], "Let readers switch between views of the same data without losing their place."),
  row("you-draw-it", "You draw it", ["storytelling", "change"], "Ask readers to guess a trend before revealing the real one."),
  row("what-if-chart", "What-if chart", ["storytelling", "change"], "Let people drag a forecast and watch the totals and bands update."),
  row("bar-race", "Bar race", ["ranking", "storytelling"], "Use a bar race to show how a ranking changes over many periods."),
  row("scrolly-chart", "Scrolly chart", ["storytelling"], "Use a scrolly chart when prose should drive what the chart shows."),
];

export const isChartIntent = (value: string | null): value is ChartIntent =>
  value !== null && CHART_INTENTS.some((intent) => intent.id === value);

export function intentInfo(id: ChartIntent): (typeof CHART_INTENTS)[number] {
  return CHART_INTENTS.find((intent) => intent.id === id) ?? CHART_INTENTS[0];
}

export function catalogEntry(slug: string): ChartCatalogEntry | undefined {
  return CHART_CATALOG.find((entry) => entry.slug === slug);
}
