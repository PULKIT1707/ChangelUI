// Behavior tests for the pure chart core: formatting, local time,
// arcs, ribbons, bars, pie options, hierarchy errors, layouts, stats, insights and helpers.
import { describe, expect, it } from "vitest";
import { categoricalColor, divergingColor, mix, sequentialColor, sequentialColors, seriesPattern, trendColor, withOpacity } from "../../../src/charts/core/color";
import { decimate, lttb, minMaxPerPixel } from "../../../src/charts/core/decimate";
import { dodge } from "../../../src/charts/core/dodge";
import { createForceSimulation, hashIds } from "../../../src/charts/core/force";
import {
  estimateTextWidth,
  formatCompact,
  formatCurrency,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  multiTimeFormat,
  tickFormat,
  timeBoundary,
  timeTickFormat,
  zonedFields,
} from "../../../src/charts/core/format";
import { ancestors, findNode, fromNested, leaves, stratify, sumHierarchy, tileSquarify, treemap } from "../../../src/charts/core/hierarchy";
import { anomalies, changePoints, crossings, detectInsights, extremes, streaks } from "../../../src/charts/core/insights";
import { dodgeLabels, placeLabels } from "../../../src/charts/core/label-layout";
import { arcPath, areaToBaseline, linePath, polar, radialLinePath, ribbonPath, roundedBarPath, roundedRectPath } from "../../../src/charts/core/path";
import { mergeSmallSlices, pie } from "../../../src/charts/core/pie";
import { alignPolygon, arcPolygon, circlePolygon, interpolatePolygon, morphPair, polygonArea, polygonCentroid, polygonLength, polygonPath, rectPolygon, resamplePolygon } from "../../../src/charts/core/polygon";
import { sankeyLayout } from "../../../src/charts/core/sankey";
import { scaleBand, scaleLinear, scaleOrdinal, scaleTime, scaleUtc } from "../../../src/charts/core/scale";
import { GridIndex, bisectLeft, bisectRight, nearestIndex } from "../../../src/charts/core/spatial";
import { bin, bollinger, boxStats, ema, kde, linearRegression, mad, mean, silvermanBandwidth, sma, sum } from "../../../src/charts/core/stats";
import { stack, stackOrder, stackTotals } from "../../../src/charts/core/stack";
import { describePoint, summarizeChart, summarizeSeries } from "../../../src/charts/core/summary";
import { DAY, logTicks, pickTimeInterval, timeInterval, timeTicks } from "../../../src/charts/core/ticks";
import { interpolateArray, joinByKey, tweenFrames } from "../../../src/charts/core/tween";

describe("format", () => {
  it("formats numbers with Intl in en-US and de-DE", () => {
    expect(formatNumber(1234567.891)).toBe("1,234,567.891");
    expect(formatNumber(1234567.891, {}, "de-DE")).toBe("1.234.567,891");
    expect(formatCompact(1234)).toBe("1.2K");
    expect(formatCompact(3_400_000)).toBe("3.4M");
    expect(formatCompact(1234, "de-DE")).toBe("1234");
    expect(formatPercent(0.1234)).toBe("12.3%");
    expect(formatPercent(0.1234, "de-DE")).toBe("12,3\u00a0%");
    expect(formatCurrency(12400, "USD")).toBe("$12,400.00");
    expect(formatCurrency(12400, "USD", "en-US", true)).toBe("$12.4K");
    expect(formatCurrency(12400, "EUR", "de-DE")).toBe("12.400,00\u00a0€");
    expect(formatNumber(Number.NaN)).toBe("\u2013");
    expect(formatNumber(5, (v) => `~${v}`)).toBe("~5");
  });

  it("formats durations as the two largest units", () => {
    expect(formatDuration(5_400_000)).toBe("1h 30m");
    expect(formatDuration(90_061_000)).toBe("1d 1h");
    expect(formatDuration(450)).toBe("450ms");
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(-65_000)).toBe("-1m 5s");
    expect(formatDuration(Infinity)).toBe("\u2013");
  });

  it("formats dates in UTC by default and in a given zone", () => {
    const t = Date.UTC(2026, 2, 8, 6, 30); // 2026-03-08 06:30Z: 01:30 EST, the US DST switch day
    expect(formatDate(t)).toBe("Mar 8, 2026");
    expect(formatDate(t, { hour: "numeric", minute: "2-digit" })).toBe("6:30 AM");
    expect(formatDate(t, { hour: "numeric", minute: "2-digit" }, "en-US", "America/New_York")).toBe("1:30 AM");
    // 07:30Z is 03:30 EDT: the offset changed across the DST switch
    expect(formatDate(t + 3_600_000, { hour: "numeric", minute: "2-digit" }, "en-US", "America/New_York")).toBe("3:30 AM");
    expect(formatDate(t, { dateStyle: "medium" }, "de-DE")).toBe("08.03.2026");
    expect(formatDate(Number.NaN)).toBe("\u2013");
    expect(formatDate(t, (v) => String(v))).toBe(String(t));
  });

  it("time tick labels pick the coarsest boundary (multi-level)", () => {
    const fmt = multiTimeFormat();
    expect(fmt(Date.UTC(2025, 0, 1))).toBe("2025");
    expect(fmt(Date.UTC(2025, 3, 1))).toBe("Apr");
    expect(fmt(Date.UTC(2025, 3, 9))).toBe("Apr 9");
    expect(fmt(Date.UTC(2025, 3, 9, 18))).toBe("6 PM");
    expect(fmt(Date.UTC(2025, 3, 9, 18, 15))).toBe("6:15 PM");
    expect(fmt(Date.UTC(2025, 3, 9, 18, 15, 30))).toBe("15:30");
    expect(timeBoundary(Date.UTC(2025, 3, 9, 18, 15, 30, 5))).toBe("millisecond");
    // In New York, 2025-01-01T00:00Z is still Dec 31, 7 PM
    expect(multiTimeFormat("en-US", "America/New_York")(Date.UTC(2025, 0, 1))).toBe("7 PM");
    expect(zonedFields(Date.UTC(2025, 0, 1, 5), "America/New_York")).toMatchObject({ year: 2025, month: 1, day: 1, hour: 0 });
    expect(timeTickFormat("month")(Date.UTC(2025, 6, 1))).toBe("Jul");
    expect(timeTickFormat("day", "de-DE")(Date.UTC(2025, 6, 4))).toBe("4. Juli");
  });

  it("tick formats carry just enough decimals", () => {
    expect([0, 0.1, 0.2].map(tickFormat(0, 1, 10))).toEqual(["0", "0.1", "0.2"]);
    expect([0, 2000, 4000].map(tickFormat(0, 10000, 5))).toEqual(["0", "2,000", "4,000"]);
    expect([0, 2000, 4000].map(tickFormat(0, 10000, 5, { compact: true }))).toEqual(["0", "2K", "4K"]);
    expect([0.25].map(tickFormat(0, 1, 20, { locale: "de-DE" }))).toEqual(["0,25"]);
  });

  it("estimates text width deterministically", () => {
    expect(estimateTextWidth("10", 10)).toBeCloseTo(11.2);
    expect(estimateTextWidth("Ab", 10)).toBeCloseTo(11.8);
    expect(estimateTextWidth("1.2K", 12)).toBeCloseTo((0.56 * 2 + 0.33 + 0.66) * 12);
    expect(estimateTextWidth("日本", 10)).toBe(20);
  });
});

describe("scales extras", () => {
  it("band at() finds the band under the pointer, including reversed ranges", () => {
    const s = scaleBand(["a", "b", "c"], [0, 300], { paddingInner: 0.2 });
    expect(s.at(-50)).toBe("a");
    expect(s.at(150)).toBe("b");
    expect(s.at(299)).toBe("c");
    expect(s.index("c")).toBe(2);
    expect(s.index("z")).toBe(-1);
    const r = scaleBand(["a", "b", "c"], [300, 0]);
    expect(r("a")).toBe(200);
    expect(r.at(250)).toBe("a");
    expect(r.copy({ range: [0, 30] }).bandwidth).toBe(10);
    expect(scaleBand([], [0, 10]).at(5)).toBeUndefined();
  });

  it("ordinal cycles and returns the unknown value", () => {
    const s = scaleOrdinal(["a", "b", "c"], ["x", "y"], "?");
    expect(["a", "b", "c", "d"].map(s)).toEqual(["x", "y", "x", "?"]);
  });

  it("copy and nice return new scales; Dates map like epoch ms", () => {
    const s = scaleLinear([0, 9.3], [0, 100]);
    const n = s.nice(5);
    expect(n.domain).toEqual([0, 10]);
    expect(s.domain).toEqual([0, 9.3]);
    expect(s.copy({ clamp: true })(20)).toBe(100);
    const t = scaleUtc([new Date(0), new Date(1000)], [0, 10]);
    expect(t(new Date(500))).toBe(5);
    expect(t.invert(5)).toBe(500);
    expect(t.kind).toBe("utc");
  });

  it("local time scales tick on the runtime calendar", () => {
    const t0 = new Date(2025, 0, 1).getTime();
    const t1 = new Date(2025, 11, 31).getTime();
    const s = scaleTime([t0, t1], [0, 600]);
    const months = s.ticks(12).map((t) => new Date(t));
    expect(months.every((d) => d.getDate() === 1 && d.getHours() === 0)).toBe(true);
    expect(months.map((d) => d.getMonth())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const days = timeTicks(new Date(2025, 0, 30).getTime(), new Date(2025, 1, 12).getTime(), 7, { utc: false }).ticks.map((t) => new Date(t).getDate());
    expect(days).toEqual([31, 1, 3, 5, 7, 9, 11]);
  });

  it("week ticks honor weekStartsOn", () => {
    const t0 = Date.UTC(2025, 0, 1);
    const t1 = t0 + 60 * DAY;
    expect(timeTicks(t0, t1, 8).ticks.every((t) => new Date(t).getUTCDay() === 0)).toBe(true);
    expect(timeTicks(t0, t1, 8, { weekStartsOn: 1 }).ticks.every((t) => new Date(t).getUTCDay() === 1)).toBe(true);
    expect(pickTimeInterval(t0, t1, 8).unit).toBe("week");
  });

  it("time intervals floor, ceil and range", () => {
    const month3 = timeInterval("month", 3);
    expect(new Date(month3.floor(Date.UTC(2025, 4, 17))).toISOString()).toBe("2025-04-01T00:00:00.000Z");
    expect(new Date(month3.ceil(Date.UTC(2025, 4, 17))).toISOString()).toBe("2025-07-01T00:00:00.000Z");
    expect(timeInterval("year", 10).range(Date.UTC(1995, 0, 1), Date.UTC(2031, 0, 1)).map((t) => new Date(t).getUTCFullYear())).toEqual([2000, 2010, 2020, 2030]);
    // years 0-99 stay in the first century (Date.UTC alone would map them to 19xx)
    expect(timeInterval("year").floor(new Date("0050-06-01T00:00:00Z").getTime())).toBe(new Date("0050-01-01T00:00:00Z").getTime());
    expect(timeInterval("month").ceil(new Date("0050-06-15T00:00:00Z").getTime())).toBe(new Date("0050-07-01T00:00:00Z").getTime());
    expect(timeInterval("hour", 6).range(5, 4)).toEqual([]);
    const localHours = timeInterval("hour", 1, { utc: false }).range(new Date(2025, 5, 1, 0, 30).getTime(), new Date(2025, 5, 1, 4).getTime());
    expect(localHours.map((t) => new Date(t).getHours())).toEqual([1, 2, 3, 4]);
    const localWeeks = timeInterval("week", 1, { utc: false, weekStartsOn: 1 }).range(new Date(2025, 5, 1).getTime(), new Date(2025, 5, 30).getTime());
    expect(localWeeks.every((t) => new Date(t).getDay() === 1)).toBe(true);
  });

  it("log ticks thin out over many decades (whole powers only)", () => {
    expect(logTicks(1, 1e12, 5)).toEqual([1, 1e2, 1e4, 1e6, 1e8, 1e10, 1e12]);
    expect(logTicks(1, 100, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });
});

describe("paths extras", () => {
  it("arcs: full rings, wedges, padding and rounded corners", () => {
    expect(arcPath({ innerRadius: 0, outerRadius: 0, startAngle: 0, endAngle: 1 })).toBe("M0,0Z");
    const ring = arcPath({ innerRadius: 40, outerRadius: 80, startAngle: 0, endAngle: 2 * Math.PI, cx: 100, cy: 100 });
    expect(ring).toBe("M100,20A80,80,0,1,1,100,180A80,80,0,1,1,100,20ZM100,60A40,40,0,1,0,100,140A40,40,0,1,0,100,60Z");
    const wedge = arcPath({ innerRadius: 0, outerRadius: 100, startAngle: 0, endAngle: Math.PI / 2 });
    expect(wedge).toBe("M0,-100A100,100,0,0,1,100,0L0,0Z");
    const big = arcPath({ innerRadius: 0, outerRadius: 100, startAngle: 0, endAngle: 1.5 * Math.PI });
    expect(big).toContain("A100,100,0,1,1");
    const donut = arcPath({ innerRadius: 50, outerRadius: 100, startAngle: 0, endAngle: Math.PI / 2 });
    expect(donut).toBe("M0,-100A100,100,0,0,1,100,0L50,0A50,50,0,0,0,0,-50Z");
    // padding: the gap is constant width, so the outer start moves less (in angle) than the inner one
    const padded = arcPath({ innerRadius: 50, outerRadius: 100, startAngle: 0, endAngle: Math.PI / 2, padAngle: 0.04, digits: null });
    // padRadius = sqrt(50^2 + 100^2), so each edge sits h = padRadius * sin(0.02) px off its radial line
    const h = Math.hypot(50, 100) * Math.sin(0.02);
    const [, sx, sy] = padded.match(/^M(-?[\d.e-]+),(-?[\d.e-]+)/) ?? [];
    expect(Number(sx)).toBeCloseTo(h, 9);
    expect(Math.hypot(Number(sx), Number(sy))).toBeCloseTo(100, 9);
    // the inner start point is the same perpendicular distance from the start edge
    const [, ix, iy] = padded.match(/A50,50,0,0,0,(-?[\d.e-]+),(-?[\d.e-]+)Z$/) ?? [];
    expect(Number(ix)).toBeCloseTo(h, 9);
    expect(Math.hypot(Number(ix), Number(iy))).toBeCloseTo(50, 9);
    const rounded = arcPath({ innerRadius: 50, outerRadius: 100, startAngle: 0, endAngle: Math.PI / 2, cornerRadius: 8 });
    expect(rounded.match(/A8,8/g)).toHaveLength(4);
    // corner radius is clamped to half the ring thickness
    const thin = arcPath({ innerRadius: 95, outerRadius: 100, startAngle: 0, endAngle: 1, cornerRadius: 50 });
    expect(thin).toContain("A2.5,2.5");
    // a heavily padded thin donut slice loses its inner edge and ends at the apex
    const apex = arcPath({ innerRadius: 2, outerRadius: 100, startAngle: 0, endAngle: 0.2, padAngle: 0.1 });
    expect(apex.match(/A/g)).toHaveLength(1);
    // reversed angles and radii are normalized
    expect(arcPath({ innerRadius: 100, outerRadius: 50, startAngle: Math.PI / 2, endAngle: 0 })).toBe(donut);
  });

  it("ribbons, rounded rects and bars", () => {
    expect(ribbonPath({ x0: 0, y0: 10, x1: 100, y1: 50, width: 10 })).toBe("M0,5C50,5,50,45,100,45L100,55C50,55,50,15,0,15Z");
    expect(ribbonPath({ x0: 0, y0: 10, x1: 100, y1: 10, width: 4, width1: 8, curvature: 0.25 })).toBe("M0,8C25,8,75,6,100,6L100,14C75,14,25,12,0,12Z");
    expect(roundedRectPath(0, 0, 10, 10)).toBe("M0,0L10,0L10,10L0,10L0,0Z");
    expect(roundedRectPath(0, 0, 20, 10, 50)).toBe("M5,0L15,0A5,5,0,0,1,20,5L20,5A5,5,0,0,1,15,10L5,10A5,5,0,0,1,0,5L0,5A5,5,0,0,1,5,0Z");
    expect(roundedRectPath(10, 10, -10, -10, 0)).toBe(roundedRectPath(0, 0, 10, 10));
    expect(roundedBarPath(0, 0, 20, 50, 4, "top")).toBe("M4,0L16,0A4,4,0,0,1,20,4L20,50L0,50L0,4A4,4,0,0,1,4,0Z");
    expect(roundedBarPath(0, 0, 20, 50, 4, "bottom")).toContain("A4,4,0,0,1,16,50");
    expect(roundedBarPath(0, 0, 50, 20, 4, "right")).toContain("A4,4,0,0,1,50,4");
    expect(roundedBarPath(0, 0, 50, 20, 4, "left")).toContain("A4,4,0,0,1,4,0");
    expect(roundedBarPath(0, 0, 50, 20, 4, "none")).toBe(roundedRectPath(0, 0, 50, 20));
  });

  it("lines and areas: digits, baselines, radial closing", () => {
    expect(linePath([[0.12345, 1.98765]], { digits: 1 })).toBe("M0.1,2Z");
    expect(linePath([[0.12345, 1]], { digits: null })).toBe("M0.12345,1Z");
    expect(linePath([])).toBe("");
    expect(areaToBaseline([[0, 10], [10, 20], null, [30, 5]], 100)).toBe("M0,10L10,20L10,100L0,100ZM30,5L30,100Z");
    expect(radialLinePath([[0, 10], [Math.PI / 2, 10], [Math.PI, 10]], { closed: true, cx: 50, cy: 50 })).toBe("M50,40L60,50L50,60Z");
    const [px, py] = polar(Math.PI / 2, 10, 5, 5);
    expect(px).toBeCloseTo(15, 12);
    expect(py).toBeCloseTo(5, 12);
  });
});

describe("pie extras", () => {
  it("minAngle keeps tiny slices visible and the total intact", () => {
    const slices = pie([100, 1, 1, 50], (d) => d, { minAngle: 0.2 });
    for (const s of slices.slice(1, 3)) expect(s.endAngle - s.startAngle).toBeCloseTo(0.2, 9);
    expect((slices[3] as (typeof slices)[number]).endAngle).toBeCloseTo(2 * Math.PI, 9);
    // impossible minimum: falls back to proportional
    const tight = pie([1, 1, 1], (d) => d, { minAngle: 3 });
    expect((tight[0] as (typeof tight)[number]).endAngle).toBeCloseTo((2 * Math.PI) / 3, 9);
    // comparator and ascending sorts
    const asc = pie([3, 1, 2], (d) => d, { sort: "ascending" });
    expect(asc.map((s) => s.order)).toEqual([2, 0, 1]);
    const cmp = pie(["b", "a"], () => 1, { sort: (a, b) => a.localeCompare(b) });
    expect(cmp.map((s) => s.order)).toEqual([1, 0]);
    expect(pie([0, 0], (d) => d).every((s) => s.startAngle === 0 && s.endAngle === 0)).toBe(true);
  });

  it("mergeSmallSlices folds tiny shares into one Other", () => {
    const rows = [{ k: "a", v: 80 }, { k: "b", v: 15 }, { k: "c", v: 3 }, { k: "d", v: 2 }];
    const merged = mergeSmallSlices(rows, (r) => r.v, 0.05, (v, items) => ({ k: `Other (${items.length})`, v }));
    expect(merged).toEqual([{ k: "a", v: 80 }, { k: "b", v: 15 }, { k: "Other (2)", v: 5 }]);
    expect(mergeSmallSlices(rows, (r) => r.v, 0.025, (v) => ({ k: "x", v }))).toEqual(rows);
    expect(mergeSmallSlices([], (r: { v: number }) => r.v, 0.1, (v) => ({ v }))).toEqual([]);
  });
});

describe("stack extras", () => {
  it("custom orders, totals and empty input", () => {
    expect(stack([[1, 2], [3, 4]], { order: [1, 0] }).bands).toEqual([[[3, 4], [4, 6]], [[0, 3], [0, 4]]]);
    expect(stackTotals([[1, -2], [3, 4]])).toEqual([4, 2]);
    expect(stackTotals([[1, -2], [3, 4]], true)).toEqual([4, 6]);
    expect(stack([]).bands).toEqual([]);
    expect(stack([[null, 2]]).bands).toEqual([[[0, 0], [0, 2]]]);
    expect(stackOrder([[5], [1], [3]], "descending")).toEqual([0, 2, 1]);
  });
});

describe("hierarchy", () => {
  const rows = [
    { id: "root", parent: null },
    { id: "a", parent: "root", v: 3 },
    { id: "b", parent: "root" },
    { id: "b1", parent: "b", v: 2 },
    { id: "b2", parent: "b", v: 5 },
  ];
  it("stratifies flat rows and walks the tree", () => {
    const root = sumHierarchy(
      stratify(rows, (r) => r.id, (r) => r.parent),
      (r) => ("v" in r ? r.v : 0),
    );
    expect(root.value).toBe(10);
    expect(root.height).toBe(2);
    expect(leaves(root).map((n) => n.id)).toEqual(["a", "b1", "b2"]);
    const b2 = findNode(root, "b2");
    expect(b2?.depth).toBe(2);
    expect(ancestors(b2 as NonNullable<typeof b2>).map((n) => n.id)).toEqual(["b2", "b", "root"]);
  });

  it("names the problem when rows are inconsistent", () => {
    expect(() => stratify([...rows, { id: "a", parent: "root" }], (r) => r.id, (r) => r.parent)).toThrow(/duplicate id "a"/);
    expect(() => stratify([...rows, { id: "x", parent: "nope" }], (r) => r.id, (r) => r.parent)).toThrow(/missing parent "nope" of "x"/);
    expect(() => stratify([...rows, { id: "r2", parent: null }], (r) => r.id, (r) => r.parent)).toThrow(/multiple roots/);
    expect(() =>
      stratify(
        [...rows, { id: "x", parent: "y" }, { id: "y", parent: "x" }],
        (r) => r.id,
        (r) => r.parent,
      ),
    ).toThrow(/cycle through "x"/);
    expect(() => stratify([{ id: "x", parent: "y" }, { id: "y", parent: "x" }], (r) => r.id, (r) => r.parent)).toThrow(/no root/);
    expect(() => stratify([], (r: { id: string }) => r.id, () => null)).toThrow(/no rows/);
  });

  it("fromNested ids default to index paths and accept an accessor", () => {
    const data = { name: "r", children: [{ name: "x", children: [{ name: "y" }] }, { name: "z" }] };
    expect(leaves(fromNested(data, (d) => (d as { children?: typeof data[] }).children)).map((n) => n.id)).toEqual(["0/0", "1"]);
    expect(leaves(fromNested(data, (d) => (d as { children?: typeof data[] }).children, (d) => d.name)).map((n) => n.id)).toEqual(["y", "z"]);
  });

  it("squarify handles a zero-value parent", () => {
    const parent = { value: 0, children: [{ value: 0, x0: 0, y0: 0, x1: 0, y1: 0 }] };
    tileSquarify(parent, 0, 0, 10, 10);
    expect(parent.children[0]).toMatchObject({ x0: 0, x1: 10 });
    const root = treemap(sumHierarchy(fromNested({ v: 1 }, () => null), (d) => d.v), { width: 10, height: 5 });
    expect([root.x0, root.y0, root.x1, root.y1]).toEqual([0, 0, 10, 5]);
  });
});

describe("sankey", () => {
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("throws on unknown ids and cycles, naming the edge", () => {
    expect(() => sankeyLayout(nodes, [{ source: "a", target: "zz", value: 1 }], { width: 100, height: 100 })).toThrow(/unknown target "zz"/);
    expect(() => sankeyLayout(nodes, [{ source: "zz", target: "a", value: 1 }], { width: 100, height: 100 })).toThrow(/unknown source "zz"/);
    expect(() => sankeyLayout(nodes, [{ source: "a", target: "a", value: 1 }], { width: 100, height: 100 })).toThrow(/self-loop/);
    expect(() =>
      sankeyLayout(
        nodes,
        [
          { source: "a", target: "b", value: 1 },
          { source: "b", target: "c", value: 1 },
          { source: "c", target: "b", value: 1 },
        ],
        { width: 100, height: 100 },
      ),
    ).toThrow(/cycle at link "(b" -> "c|c" -> "b)"/);
  });

  it("aligns columns and supports custom accessors and fixed values", () => {
    const links = [
      { from: "a", to: "c", amount: 5 },
      { from: "b", to: "c", amount: 5 },
    ];
    const g = sankeyLayout([{ key: "a" }, { key: "b" }, { key: "c" }, { key: "lonely" }], links, {
      width: 300,
      height: 200,
      nodeId: (n) => n.key,
      linkSource: (l) => l.from,
      linkTarget: (l) => l.to,
      linkValue: (l) => l.amount,
      nodeValue: (n) => (n.key === "c" ? 20 : undefined),
      align: "right",
    });
    expect(g.layers).toBe(2);
    const c = g.nodes.find((n) => n.id === "c");
    expect(c?.value).toBe(20);
    expect(c?.x1).toBe(300);
    const single = sankeyLayout([{ id: "solo" }], [], { width: 100, height: 50, iterations: 0 });
    expect(single.nodes[0]?.x0).toBe(42);
    const center = sankeyLayout(
      [{ id: "s" }, { id: "m" }, { id: "t" }, { id: "late" }],
      [
        { source: "s", target: "m", value: 1 },
        { source: "m", target: "t", value: 1 },
        { source: "late", target: "t", value: 1 },
      ],
      { width: 100, height: 100, align: "center" },
    );
    expect(center.nodes.find((n) => n.id === "late")?.layer).toBe(1);
    const left = sankeyLayout(center.nodes.map((n) => ({ id: n.id })), [{ source: "s", target: "m", value: 1 }, { source: "m", target: "t", value: 1 }, { source: "late", target: "t", value: 1 }], { width: 100, height: 100, align: "left" });
    expect(left.nodes.find((n) => n.id === "late")?.layer).toBe(0);
  });
});

describe("force", () => {
  it("pins, reheats, collides and rejects unknown ids", () => {
    const sim = createForceSimulation([{ id: "a" }, { id: "b" }, { id: "c", x: 5, y: 5 }], [{ source: "a", target: "b" }], { radius: 10 });
    expect(sim.nodes[2]).toMatchObject({ x: 5, y: 5 });
    sim.pin("a", 100, -100);
    sim.tick(5);
    expect(sim.nodes[0]).toMatchObject({ x: 100, y: -100, vx: 0, vy: 0 });
    expect(sim.run(1000)).toBeGreaterThan(0);
    expect(sim.settled()).toBe(true);
    sim.reheat(0.5);
    expect(sim.alpha()).toBe(0.5);
    sim.pin("a", null);
    sim.pin("missing", 1);
    sim.run();
    const [, b, c] = sim.nodes;
    expect(Math.hypot((b?.x ?? 0) - (c?.x ?? 0), (b?.y ?? 0) - (c?.y ?? 0))).toBeGreaterThan(15);
    expect(() => createForceSimulation([{ id: "a" }], [{ source: "a", target: "x" }])).toThrow(/unknown node/);
    expect(hashIds(["ab"])).not.toBe(hashIds(["a", "b"]));
    // coincident nodes still separate
    const stacked = createForceSimulation([{ id: "p", x: 0, y: 0 }, { id: "q", x: 0, y: 0 }], [{ source: "p", target: "q", distance: 50 }]);
    stacked.run();
    expect(Math.hypot((stacked.nodes[0]?.x ?? 0) - (stacked.nodes[1]?.x ?? 0), (stacked.nodes[0]?.y ?? 0) - (stacked.nodes[1]?.y ?? 0))).toBeGreaterThan(5);
  });
});

describe("dodge", () => {
  it("stacks coincident circles symmetrically and respects per-circle radii", () => {
    expect(dodge([0, 0, 0], { radius: 5, padding: 0 })).toEqual([0, 10, -10]);
    expect(dodge([0, 0, 0], { radius: 5, padding: 0, side: "negative" })).toEqual([0, -10, -20]);
    const ys = dodge([0, 1], { radius: [2, 10], padding: 0 });
    expect(Math.hypot(1, (ys[1] as number) - (ys[0] as number))).toBeGreaterThanOrEqual(12 - 1e-9);
    expect(dodge([])).toEqual([]);
  });
});

describe("stats extras", () => {
  it("summaries and robust spread", () => {
    expect(sum([1, null, 2, Number.NaN])).toBe(3);
    expect(mean([])).toBeUndefined();
    expect(mean([2, 4])).toBe(3);
    expect(mad([1, 1, 2, 2, 4, 6, 9])).toBe(1);
    expect(mad([])).toBeUndefined();
    const box = boxStats([1, 2, 3, 4, 5, 6, 7, 8, 100]);
    expect(box).toMatchObject({ min: 1, q1: 3, median: 5, q3: 7, max: 100, lowerWhisker: 1, upperWhisker: 8, outliers: [100] });
    expect(boxStats([])).toBeUndefined();
  });

  it("regression", () => {
    const fit = linearRegression([0, 1, 2, 3, null], [1, 3, 5, 7, 100]);
    expect(fit?.slope).toBeCloseTo(2);
    expect(fit?.intercept).toBeCloseTo(1);
    expect(fit?.r2).toBeCloseTo(1);
    expect(fit?.predict(10)).toBeCloseTo(21);
    expect(linearRegression([1], [1])).toBeUndefined();
    expect(linearRegression([2, 2], [1, 5])).toBeUndefined();
    expect(linearRegression([1, 2], [3, 3])?.r2).toBeNaN();
  });

  it("moving averages and Bollinger bands", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([Number.NaN, Number.NaN, 2, 3, 4]);
    expect(sma([1, null, 3, 4, 5], 2)).toEqual([Number.NaN, Number.NaN, Number.NaN, 3.5, 4.5]);
    const e = ema([1, 2, 3, 4, 5, 6], 3);
    expect(e.slice(0, 2)).toEqual([Number.NaN, Number.NaN]);
    expect(e[2]).toBe(2);
    expect(e[3]).toBe(3);
    expect(e[5]).toBe(5);
    expect(ema([null, 4, 4, null, 8], 2)).toEqual([Number.NaN, Number.NaN, 4, 4, 4 + (2 / 3) * 4]);
    const bb = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);
    expect(bb.middle[7]).toBe(5);
    expect(bb.upper[7]).toBe(9);
    expect(bb.lower[7]).toBe(1);
    expect(bb.upper[6]).toBeNaN();
  });

  it("bins with round edges and every value counted once", () => {
    const values = [0.3, 1.7, 2.2, 3.9, 4.1, 5.5, 9.99, 10];
    const bins = bin(values, { thresholds: 5 });
    expect(bins.map((b) => [b.x0, b.x1])).toEqual([[0, 2], [2, 4], [4, 6], [6, 8], [8, 10]]);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(values.length);
    expect(bins[4]?.values).toEqual([9.99, 10]);
    expect(bin(values, { thresholds: [2, 5], domain: [0, 10] }).map((b) => b.count)).toEqual([2, 3, 3]);
    expect(bin([5, 5, 5]).map((b) => [b.x0, b.x1, b.count])).toEqual([[5, 5, 3]]);
    expect(bin([])).toEqual([]);
    const auto = bin(Array.from({ length: 100 }, (_, i) => i));
    expect(auto.length).toBeGreaterThan(3);
    expect(auto.every((b) => Number.isInteger(b.x0))).toBe(true);
    // values outside an explicit domain are ignored
    expect(bin([1, 50, 200], { domain: [0, 100], thresholds: 2 }).reduce((a, b) => a + b.count, 0)).toBe(2);
  });

  it("kde integrates to about 1", () => {
    const values = Array.from({ length: 200 }, (_, i) => Math.sin(i) * 3 + (i % 7));
    const curve = kde(values, { samples: 256 });
    const dx = (curve[1]?.[0] ?? 0) - (curve[0]?.[0] ?? 0);
    expect(curve.reduce((a, [, y]) => a + y * dx, 0)).toBeCloseTo(1, 2);
    expect(silvermanBandwidth([1, 1, 1])).toBeGreaterThan(0);
    expect(kde([])).toEqual([]);
    expect(kde([0], { bandwidth: 1, domain: [-1, 1], samples: 3 })[1]?.[1]).toBeCloseTo(1 / Math.sqrt(2 * Math.PI));
  });
});

describe("insights", () => {
  const ys = [10, 11, 10, 12, 11, 10, 11, 12, 30, 31, 30, 32, 31, 30, 29];
  it("a lone spike is an anomaly, not a level shift", () => {
    expect(changePoints([10, 11, 10, 12, 11, 60, 11, 12, 10, 11, 12, 10, 11])).toEqual([]);
    expect(changePoints([5, 5, 5, 5, 5, 5, 9, 9, 9, 9])).toEqual([{ index: 6, delta: 4 }]);
  });

  it("finds extremes, anomalies, level shifts, crossings and streaks", () => {
    expect(extremes([null, 3, 9, 1])).toEqual({ max: 2, min: 3 });
    expect(extremes([])).toEqual({ max: -1, min: -1 });
    expect(anomalies([10, 11, 10, 12, 11, 60, 11, 12, 10, 11]).map((a) => a.index)).toEqual([5]);
    // MAD is 0 here (mostly identical values); the mean-absolute-deviation fallback still finds the spike
    expect(anomalies([1, 1, 1, 1, 1, 1, 40, 1, 2, 1]).map((a) => a.index)).toEqual([6]);
    expect(anomalies([1, 1, 1])).toEqual([]);
    expect(anomalies([])).toEqual([]);
    const shifts = changePoints(ys);
    expect(shifts).toHaveLength(1);
    expect(shifts[0]?.index).toBe(8);
    // mean of the points from the shift up to detection (30, 31) minus the mean before it
    expect(shifts[0]?.delta).toBeCloseTo(61 / 2 - 87 / 8, 9);
    expect(changePoints([1, 2])).toEqual([]);
    expect(crossings([0, 10, null, 4, 6], 5)).toEqual([
      { index: 1, at: 0.5, direction: "up" },
      { index: 3, at: 1 + (5 / 6) * 2, direction: "down" },
      { index: 4, at: 3.5, direction: "up" },
    ]);
    expect(streaks([1, 2, 3, 4, 3, 2, 2, 1, 0, -1], 2)).toEqual([
      { start: 0, end: 3, length: 3, direction: "up" },
      { start: 6, end: 9, length: 3, direction: "down" },
    ]);
    const all = detectInsights(ys, { thresholds: [20] });
    expect(all.map((i) => i.type)).toEqual(expect.arrayContaining(["max", "min", "anomaly", "crossing"]));
    const at = all.map((i) => ("index" in i ? i.index : i.start));
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(detectInsights([5, 5], { changePoints: false })).toEqual([{ type: "max", index: 0, value: 5 }]);
  });
});

describe("summary and announcements", () => {
  const xs = ["Jan", "Feb", "Mar"];
  it("summarizes trends, flats, gaps and many series", () => {
    expect(summarizeSeries({ label: "Users", xs, ys: [100, 100.2, 100.4] })).toBe("Users is roughly flat from 100 (Jan) to 100.4 (Mar). Peak 100.4 in Mar; low 100 in Jan.");
    expect(summarizeSeries({ label: "Churn", xs, ys: [50, 40, 25] })).toBe("Churn falls 50% from 50 (Jan) to 25 (Mar). Peak 50 in Jan; low 25 in Mar.");
    expect(summarizeSeries({ label: "Empty", xs, ys: [null, null] })).toBe("Empty: no data.");
    expect(summarizeSeries({ label: "Two", xs: [], ys: [0, 5] })).toBe("Two rises 100% from 0 (1) to 5 (2).");
    const spiky = summarizeSeries({ label: "Load", xs: [], ys: [1, 1, 1, 1, 1, 1, 40, 1, 2, 1] }, { anomalies: true });
    expect(spiky).toContain("1 unusual value.");
    const many = Array.from({ length: 6 }, (_, i) => ({ label: `S${i}`, xs, ys: [1, 2, 3] }));
    expect(summarizeChart(many)).toMatch(/And 2 more series\.$/);
    expect(summarizeChart(many, { maxSeries: 5 })).toMatch(/And 1 more series\.$/);
    expect(summarizeSeries({ label: "R", xs, ys: [1, 2] }, { phrases: { rises: (p) => `climbs ${p}` } })).toBe("R climbs 100% from 1 (Jan) to 2 (Feb).");
  });

  it("describes a focused point with its change", () => {
    expect(
      describePoint({
        seriesLabel: "Revenue",
        xLabel: "March 2026",
        value: 12400,
        previous: { xLabel: "February", value: 11481 },
        index: 2,
        count: 12,
        format: { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 },
      }),
    ).toBe("Revenue, March 2026: $12.4K, up 8% from February. Point 3 of 12.");
    expect(describePoint({ seriesLabel: "A", xLabel: "x", value: 3, previous: { xLabel: "w", value: 3 }, index: 0, count: 1 })).toBe("A, x: 3, unchanged from w. Point 1 of 1.");
    expect(describePoint({ seriesLabel: "A", xLabel: "x", value: 1, previous: { xLabel: "w", value: 2 }, index: 0, count: 2 })).toBe("A, x: 1, down 50% from w. Point 1 of 2.");
  });
});

describe("label layout", () => {
  it("dodges overlapping labels with minimal moves and keeps them in bounds", () => {
    expect(dodgeLabels([{ position: 50, size: 10 }], 0, 100)).toEqual([50]);
    const out = dodgeLabels(
      [
        { position: 50, size: 10 },
        { position: 52, size: 10 },
        { position: 90, size: 10 },
      ],
      0,
      100,
      2,
    );
    expect((out[1] as number) - (out[0] as number)).toBeCloseTo(12);
    expect(((out[0] as number) + (out[1] as number)) / 2).toBeCloseTo(51);
    expect(out[2]).toBe(90);
    const edge = dodgeLabels(
      [
        { position: 98, size: 10 },
        { position: 99, size: 10 },
      ],
      0,
      100,
      0,
    );
    expect(edge).toEqual([85, 95]);
    expect(dodgeLabels([{ position: 5, size: 50 }, { position: 6, size: 60 }], 0, 100, 0)).toEqual([25, 80]);
  });

  it("places annotation boxes greedily, by priority, avoiding obstacles", () => {
    const bounds = { x: 0, y: 0, width: 200, height: 100 };
    const [a, b, c] = placeLabels(
      [
        { x: 100, y: 50, width: 40, height: 12 },
        { x: 100, y: 50, width: 40, height: 12, priority: 1 },
        { x: 0, y: 0, width: 400, height: 12 },
      ],
      bounds,
    );
    expect(b?.position).toBe("top");
    expect(a?.position).toBe("bottom");
    expect(c).toEqual({ box: null, position: null });
    const blocked = placeLabels([{ x: 100, y: 50, width: 20, height: 10 }], bounds, { obstacles: [{ x: 80, y: 20, width: 40, height: 22 }] });
    expect(blocked[0]?.position).toBe("bottom");
  });
});

describe("spatial", () => {
  it("bisects and finds the nearest x", () => {
    const xs = [0, 10, 20, 30];
    expect(bisectLeft(xs, 10)).toBe(1);
    expect(bisectRight(xs, 10)).toBe(2);
    expect([-5, 4, 5, 6, 26, 99].map((x) => nearestIndex(xs, x))).toEqual([0, 0, 0, 1, 3, 3]);
    expect(nearestIndex([], 1)).toBe(-1);
  });

  it("grid index finds the nearest point within a radius", () => {
    const grid = new GridIndex(24);
    [
      [10, 10],
      [30, 12],
      [200, 200],
      [Number.NaN, 5],
      [-30, -30],
    ].forEach(([x, y]) => grid.add(x as number, y as number));
    expect(grid.size).toBe(5);
    expect(grid.nearest(28, 10)).toBe(1);
    expect(grid.nearest(100, 100)).toBe(-1);
    expect(grid.nearest(-25, -25)).toBe(4);
    expect(grid.within(20, 10, 15)).toEqual([0, 1]);
    expect(grid.nearest(20, 11, 24)).toBe(0);
  });
});

describe("decimate", () => {
  it("passes small series through and picks a strategy", () => {
    const xs = Array.from({ length: 10 }, (_, i) => i);
    expect(lttb(xs, xs, 20)).toHaveLength(10);
    expect(minMaxPerPixel([1, 2], [1, 2], 10)).toEqual([0, 1]);
    expect(decimate(xs, xs, 100)).toHaveLength(10);
    const big = Array.from({ length: 5000 }, (_, i) => i);
    const ys = big.map((i) => Math.sin(i / 10));
    expect(decimate(big, ys, 100)).toHaveLength(200);
    expect(decimate(big, ys, 100, "minmax").length).toBeLessThanOrEqual(404);
    expect(decimate(big, ys, 100, false)).toHaveLength(5000);
    // non-finite values never become the min or max
    expect(minMaxPerPixel([0, 1, 2, 3], [Number.NaN, 5, 1, 3], 1)).toEqual([0, 1, 2, 3]);
  });
});

describe("polygons", () => {
  it("measures, resamples, aligns and interpolates", () => {
    const square = rectPolygon(0, 0, 10, 10);
    expect(polygonArea(square)).toBe(100);
    expect(polygonLength(square)).toBe(40);
    expect(polygonCentroid(square)).toEqual([5, 5]);
    const r = resamplePolygon(square, 8);
    expect(r).toHaveLength(8);
    expect(r[1]).toEqual([5, 0]);
    expect(r[4]).toEqual([10, 10]);
    expect(resamplePolygon([], 5)).toEqual([]);
    expect(resamplePolygon([[1, 1]], 4)).toEqual([[1, 1], [1, 1], [1, 1], [1, 1]]);
    // a shifted copy realigns to zero travel
    const shifted = [...square.slice(2), ...square.slice(0, 2)];
    expect(alignPolygon(square, shifted)).toEqual(square);
    // opposite winding is reversed first
    const ccw = [...square].reverse();
    expect(Math.sign(polygonArea(alignPolygon(square, ccw)))).toBe(1);
    expect(alignPolygon(square, square.slice(0, 3))).toEqual(square.slice(0, 3));
    expect(interpolatePolygon([[0, 0]], [[10, 20]], 0.5)).toEqual([[5, 10]]);
    const [a, b] = morphPair(square, circlePolygon(5, 5, 5, 32), 16);
    expect(a).toHaveLength(16);
    expect(b).toHaveLength(16);
    expect(arcPolygon(0, 0, 0, 10, 0, Math.PI, 8).at(-1)).toEqual([0, 0]);
    expect(arcPolygon(0, 0, 5, 10, 0, Math.PI, 8)).toHaveLength(10);
    expect(polygonPath(rectPolygon(0, 0, 1, 1))).toBe("M0,0L1,0L1,1L0,1Z");
    expect(polygonPath([])).toBe("");
  });
});

describe("color", () => {
  it("returns token strings only", () => {
    expect(categoricalColor(0)).toBe("var(--pui-chart-1, var(--pui-primary))");
    expect(categoricalColor(9)).toBe("var(--pui-chart-2, var(--pui-primary))");
    expect(categoricalColor(-1)).toBe("var(--pui-chart-8, var(--pui-primary))");
    expect(seriesPattern(3, 5)).toBe("none");
    expect(seriesPattern(9, 12)).toBe("diagonal");
    expect(seriesPattern(17, 20)).toBe("dots");
    expect(mix("a", "b", 0.25)).toBe("color-mix(in oklab, a 25%, b)");
    expect(sequentialColor(2)).toContain("100%");
    expect(sequentialColors(3).map((c) => c.match(/ (\d+)%/)?.[1])).toEqual(["0", "50", "100"]);
    expect(sequentialColors(1)).toHaveLength(1);
    expect(divergingColor(-5, -10, 10)).toContain("--pui-chart-div-neg");
    expect(divergingColor(10, -10, 10)).toContain("--pui-chart-div-pos");
    expect(divergingColor(0, 0, 0)).toContain("0%");
    expect(withOpacity("var(--x)", 0.35)).toBe("color-mix(in oklab, var(--x) 35%, transparent)");
    expect(trendColor("up")).toContain("--pui-chart-up");
    expect(trendColor("down", true)).toBe(categoricalColor(2));
    expect(trendColor("up", true)).toBe(categoricalColor(5));
    expect(trendColor("down")).toContain("--pui-chart-down");
  });
});

describe("tween", () => {
  it("joins by key and builds frames that grow out of the line", () => {
    expect(joinByKey(["a", "b", "c"], ["b", "c", "d", "d"])).toEqual({ enter: [2, 3], update: [[1, 0], [2, 1]], exit: [0] });
    const out = new Float64Array(2);
    expect(interpolateArray([0, 10], [10, 20], 0.5, out)).toBe(out);
    expect([...out]).toEqual([5, 15]);
    expect([...interpolateArray([0], [4], 0.25)]).toEqual([1]);
    const f = tweenFrames(["b", "c"], [5, 7], ["a", "b", "x", "c", "d"], [1, 2, 3, 4, 5]);
    expect([...f.from]).toEqual([5, 5, 5, 7, 7]);
    expect([...f.to]).toEqual([1, 2, 3, 4, 5]);
    const base = tweenFrames(["b"], [5], ["a", "b"], [1, 2], { enter: "baseline", baseline: -1 });
    expect([...base.from]).toEqual([-1, 5]);
    const exit = tweenFrames(["a", "b"], [3, 4], ["b"], [9], { baseline: 0 });
    expect([...exit.exitFrom]).toEqual([3]);
    expect([...exit.exitTo]).toEqual([0]);
  });
});
