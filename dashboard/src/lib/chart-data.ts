// Seeded, realistic demo data for the chart pages. Same seed, same data (server and client agree);
// "Randomize data" just bumps the seed, so every chart can show its update morph.
import { mulberry32 } from "@pui-src/lib/random";
import { useState } from "react";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const round = (v: number, step = 1) => Math.round(v / step) * step;

export interface MonthlyRow {
  month: string;
  revenue: number;
  cost: number;
  forecast: number;
  target: number;
}

/** Monthly revenue with seasonality, a cost line and a forecast. */
export function monthlyRevenue(seed: number, months = 12): MonthlyRow[] {
  const rand = mulberry32(seed * 7919 + 1);
  let revenue = 38_000 + rand() * 8_000;
  const growth = 0.02 + rand() * 0.04;
  return Array.from({ length: months }, (_, i) => {
    revenue *= 1 + growth + (rand() - 0.45) * 0.12;
    const season = 1 + 0.08 * Math.sin((i / 12) * Math.PI * 2 - 1.2);
    const r = revenue * season;
    return {
      month: MONTHS[i % 12] as string,
      revenue: round(r, 100),
      cost: round(r * (0.52 + rand() * 0.14), 100),
      forecast: round(r * (0.96 + rand() * 0.1), 100),
      target: 50_000,
    };
  });
}

export interface DailyRow {
  date: Date;
  visitors: number;
  signups: number;
  sessions: number;
}

/** Daily traffic with weekly seasonality and the odd spike. */
export function dailyTraffic(seed: number, days = 90, start = Date.UTC(2026, 0, 1)): DailyRow[] {
  const rand = mulberry32(seed * 104729 + 3);
  let level = 2_400 + rand() * 600;
  return Array.from({ length: days }, (_, i) => {
    level *= 1 + (rand() - 0.47) * 0.05;
    const weekday = new Date(start + i * 864e5).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.72 : 1;
    const spike = rand() > 0.965 ? 1.6 + rand() : 1;
    const visitors = round(level * weekend * spike);
    return {
      date: new Date(start + i * 864e5),
      visitors,
      signups: round(visitors * (0.028 + rand() * 0.012)),
      sessions: round(visitors * (1.3 + rand() * 0.3)),
    };
  });
}

export interface ChannelRow {
  month: string;
  organic: number;
  paid: number;
  referral: number;
  social: number;
}

/** Acquisition by channel (stacks nicely). */
export function channels(seed: number, months = 12): ChannelRow[] {
  const rand = mulberry32(seed * 31337 + 5);
  const base = { organic: 4200, paid: 2600, referral: 1400, social: 900 };
  return Array.from({ length: months }, (_, i) => {
    const t = i / Math.max(1, months - 1);
    return {
      month: MONTHS[i % 12] as string,
      organic: round(base.organic * (1 + t * 0.6) * (0.9 + rand() * 0.2), 10),
      paid: round(base.paid * (1 + Math.sin(i / 2) * 0.25) * (0.85 + rand() * 0.3), 10),
      referral: round(base.referral * (1 + t * 0.3) * (0.85 + rand() * 0.3), 10),
      social: round(base.social * (1 + t * 1.4) * (0.8 + rand() * 0.4), 10),
    };
  });
}

export interface CategoryRow {
  name: string;
  sales: number;
  returns: number;
  lastYear: number;
}

const PRODUCTS = ["Headphones", "Keyboards", "Monitors", "Webcams", "Speakers", "Mice", "Docks", "Chargers"];

/** Sales by product, with last year for comparison. */
export function productSales(seed: number, count = 6): CategoryRow[] {
  const rand = mulberry32(seed * 2654435 + 7);
  return PRODUCTS.slice(0, count).map((name) => {
    const sales = round(8_000 + rand() * 42_000, 100);
    return { name, sales, returns: round(sales * (0.03 + rand() * 0.07), 10), lastYear: round(sales * (0.7 + rand() * 0.5), 100) };
  });
}

export interface CountryRow {
  country: string;
  users: number;
}

const COUNTRIES = ["United States", "Germany", "India", "Mexico", "Japan", "United Kingdom", "France", "Canada"];

/** Users by country, sorted descending (ranked horizontal bars). */
export function countries(seed: number, count = 8): CountryRow[] {
  const rand = mulberry32(seed * 7331 + 11);
  return COUNTRIES.slice(0, count)
    .map((country, i) => ({ country, users: round((48_000 / (i + 1.2)) * (0.75 + rand() * 0.5), 10) }))
    .sort((a, b) => b.users - a.users);
}

export interface ProfitRow {
  quarter: string;
  profit: number;
  loss: number;
  net: number;
}

/** Signed values per quarter (diverging bars). */
export function profitAndLoss(seed: number): ProfitRow[] {
  const rand = mulberry32(seed * 1597 + 13);
  return ["Q1 25", "Q2 25", "Q3 25", "Q4 25", "Q1 26", "Q2 26", "Q3 26", "Q4 26"].map((quarter) => {
    const profit = round(12 + rand() * 30, 0.1);
    const loss = -round(6 + rand() * 26, 0.1);
    return { quarter, profit, loss, net: round(profit + loss, 0.1) };
  });
}

export interface LatencyRow {
  t: number;
  p50: number;
  p95: number;
  p99: number;
}

/** Service latency percentiles over a numeric time axis (minutes). */
export function latency(seed: number, points = 60): LatencyRow[] {
  const rand = mulberry32(seed * 4241 + 17);
  let base = 80 + rand() * 20;
  return Array.from({ length: points }, (_, t) => {
    base = Math.max(40, base + (rand() - 0.5) * 10);
    const incident = t > points * 0.55 && t < points * 0.68 ? 2.2 : 1;
    const p50 = round(base * incident);
    return { t, p50, p95: round(p50 * (1.8 + rand() * 0.4)), p99: round(p50 * (2.8 + rand() * 0.9)) };
  });
}

/** A seed with a "Randomize data" action. */
export function useSeed(initial = 1): [number, () => void] {
  const [seed, setSeed] = useState(initial);
  return [seed, () => setSeed((s) => s + 1)];
}
export interface ShareRow {
  name: string;
  value: number;
}
const SOURCES = ["Organic search", "Direct", "Social", "Email", "Referral", "Paid search", "Affiliates", "Podcasts", "Events"];
/** Traffic share by source: a few big slices and a long tail (good for "Other"). */
export function trafficSources(seed: number, count = 6): ShareRow[] {
  const rand = mulberry32(seed * 6151 + 19);
  return SOURCES.slice(0, count).map((name, i) => ({ name, value: round((52_000 / (i + 1.4)) * (0.7 + rand() * 0.6), 10) }));
}
const PLANS = ["Free", "Starter", "Pro", "Team", "Enterprise"];
/** Revenue by plan. */
export function planRevenue(seed: number): ShareRow[] {
  const rand = mulberry32(seed * 3301 + 23);
  const weights = [0.04, 0.16, 0.34, 0.26, 0.2];
  return PLANS.map((name, i) => ({ name, value: round(1_200_000 * (weights[i] as number) * (0.7 + rand() * 0.6), 100) }));
}
export interface BudgetRow {
  name: string;
  spent: number;
}
/** Monthly household budget: many small categories (tail merges into "Other"). */
export function budget(seed: number): BudgetRow[] {
  const rand = mulberry32(seed * 911 + 29);
  const cats: Array<[string, number]> = [
    ["Rent", 1800],
    ["Groceries", 620],
    ["Transport", 260],
    ["Dining out", 310],
    ["Utilities", 190],
    ["Subscriptions", 64],
    ["Gym", 45],
    ["Books", 28],
    ["Gifts", 40],
  ];
  return cats.map(([name, base]) => ({ name, spent: round(base * (0.75 + rand() * 0.5)) }));
}
export interface CountryStat {
  country: string;
  region: string;
  gdp: number;
  lifeExpectancy: number;
  population: number;
}
const REGIONS: Array<[string, number, number]> = [
  // region, typical log10 GDP per capita, life expectancy at that GDP
  ["Africa", 3.4, 63],
  ["Americas", 4.1, 74],
  ["Asia", 3.9, 73],
  ["Europe", 4.5, 80],
  ["Oceania", 4.3, 78],
];
/** A Gapminder-style cloud: GDP per capita vs life expectancy, bubble = population (synthetic). */
export function countryStats(seed: number, perRegion = 14): CountryStat[] {
  const rand = mulberry32(seed * 7907 + 31);
  const out: CountryStat[] = [];
  for (const [region, g, le] of REGIONS) {
    for (let k = 0; k < perRegion; k++) {
      const lg = g + (rand() - 0.5) * 1.1;
      out.push({
        country: `${region.slice(0, 3)}-${k + 1}`,
        region,
        gdp: round(10 ** lg, 10),
        lifeExpectancy: round(le + (lg - g) * 7 + (rand() - 0.5) * 6, 0.1),
        population: round(2 + rand() ** 3 * 220, 0.1),
      });
    }
  }
  return out;
}
export interface CampaignRow {
  campaign: string;
  channel: string;
  spend: number;
  revenue: number;
  conversions: number;
}
const CHANNELS = ["Search", "Social", "Video", "Display"];
/** Marketing campaigns: spend vs revenue (ROAS differs by channel), bubble = conversions. */
export function campaigns(seed: number, count = 60): CampaignRow[] {
  const rand = mulberry32(seed * 1223 + 37);
  const roas = [3.4, 2.1, 1.6, 1.1];
  return Array.from({ length: count }, (_, i) => {
    const c = i % CHANNELS.length;
    const spend = round(2_000 + rand() ** 1.4 * 48_000, 50);
    const revenue = round(spend * (roas[c] as number) * (0.55 + rand() * 0.9), 50);
    return { campaign: `${CHANNELS[c]} #${Math.floor(i / 4) + 1}`, channel: CHANNELS[c] as string, spend, revenue, conversions: round(revenue / (40 + rand() * 80)) };
  });
}
export interface PricePoint {
  date: Date;
  price: number;
  volume: number;
}
/** A long daily price series (random walk with drift and volatility clusters), for zoom demos. */
export function priceHistory(seed: number, days = 730, start = Date.UTC(2024, 0, 1)): PricePoint[] {
  const rand = mulberry32(seed * 4447 + 41);
  let price = 120 + rand() * 40;
  let vol = 0.015;
  return Array.from({ length: days }, (_, i) => {
    vol = Math.max(0.006, Math.min(0.05, vol + (rand() - 0.5) * 0.004));
    const shock = (rand() + rand() + rand() - 1.5) * 2 * vol;
    price = Math.max(10, price * (1 + 0.0004 + shock));
    return { date: new Date(start + i * 864e5), price: round(price, 0.01), volume: round(1e6 * (0.6 + rand() + vol * 20)) };
  });
}
/** A short random-walk series for sparklines. */
export function walk(seed: number, points = 30, start = 100, drift = 0.004): number[] {
  const rand = mulberry32(seed * 2029 + 43);
  let v = start;
  return Array.from({ length: points }, () => {
    v = Math.max(1, v * (1 + drift + (rand() - 0.5) * 0.08));
    return round(v, 0.1);
  });
}
/** Wins and losses (+1 / -1 style margins) for a win/loss sparkline. */
export function results(seed: number, games = 24): number[] {
  const rand = mulberry32(seed * 811 + 47);
  return Array.from({ length: games }, () => round((rand() - 0.42) * 20));
}
export interface GuessRow {
  year: number;
  value: number;
}
export interface GuessScenario {
  id: string;
  title: string;
  description: string;
  unit: "percent" | "number" | "usd";
  data: GuessRow[];
  revealFrom: number;
}
/** "Guess the trend" scenarios (synthetic): each hides a turn the reader probably won't expect. */
export function guessScenario(kind: "adoption" | "jump" | "plateau", seed: number): GuessScenario {
  const rand = mulberry32(seed * 6007 + 53);
  const years = Array.from({ length: 16 }, (_, i) => 2010 + i);
  if (kind === "adoption") {
    const k = 0.42 + rand() * 0.1;
    return {
      id: kind,
      title: "Share of new cars that are electric",
      description: "Synthetic data. Known until 2018: how fast does it grow?",
      unit: "percent",
      revealFrom: 9,
      data: years.map((year, i) => ({ year, value: round(Math.min(60, 0.4 * Math.exp(k * i * 0.78)) * (0.92 + rand() * 0.16), 0.1) })),
    };
  }
  if (kind === "jump") {
    return {
      id: kind,
      title: "Workdays spent at home",
      description: "Synthetic data. Known until 2019: what happened next?",
      unit: "percent",
      revealFrom: 10,
      data: years.map((year, i) => {
        const before = 4 + i * 0.35 + rand() * 0.8;
        const after = i === 10 ? 41 + rand() * 6 : i === 11 ? 34 + rand() * 4 : 27 + rand() * 4 - (i - 12) * 0.6;
        return { year, value: round(i < 10 ? before : after, 0.1) };
      }),
    };
  }
  let v = 2.1 + rand() * 0.4;
  return {
    id: kind,
    title: "Average price of a coffee",
    description: "Synthetic data in USD. Known until 2017: does it keep climbing?",
    unit: "usd",
    revealFrom: 8,
    data: years.map((year, i) => {
      v *= i < 8 ? 1.05 + rand() * 0.02 : i < 12 ? 1 + (rand() - 0.6) * 0.03 : 1.08 + rand() * 0.04;
      return { year, value: round(v, 0.01) };
    }),
  };
}
export interface ForecastRow {
  quarter: string;
  revenue: number;
}
/** Quarterly revenue: 8 actual quarters and a 6-quarter plan (the editable part of a what-if chart). */
export function quarterlyPlan(seed: number, actual = 8, plan = 6): ForecastRow[] {
  const rand = mulberry32(seed * 3907 + 59);
  let v = 1.1e6 + rand() * 3e5;
  const growth = 0.035 + rand() * 0.03;
  return Array.from({ length: actual + plan }, (_, i) => {
    const year = 24 + Math.floor(i / 4);
    const q = (i % 4) + 1;
    const season = q === 4 ? 1.08 : q === 1 ? 0.95 : 1;
    v *= 1 + growth + (i < actual ? (rand() - 0.5) * 0.08 : 0);
    return { quarter: `Q${q} ${year}`, revenue: round(v * season, 1000) };
  });
}
/** Monthly headcount plan: 6 months actual, 6 months editable hiring plan. */
export function headcountPlan(seed: number): Array<{ month: string; people: number }> {
  const rand = mulberry32(seed * 1709 + 61);
  let v = 42 + Math.floor(rand() * 10);
  return MONTHS.map((month, i) => {
    v += i < 6 ? Math.round((rand() - 0.25) * 4) : 3;
    return { month, people: v };
  });
}
const FEATURES = ["Search", "Dashboards", "Exports", "Comments", "Alerts", "Integrations", "Mobile app", "API", "Automations", "Templates", "Reports", "Sharing"];
/** Weekly active users per feature, with a couple of breakout features (a bar race). */
export function featureRace(seed: number, weeks = 24): Array<{ time: string; values: Record<string, number> }> {
  const rand = mulberry32(seed * 8191 + 67);
  const level = FEATURES.map(() => 800 + rand() * 4200);
  const growth = FEATURES.map(() => 0.005 + rand() * 0.035);
  const breakout = [Math.floor(rand() * FEATURES.length), Math.floor(rand() * FEATURES.length)];
  return Array.from({ length: weeks }, (_, w) => {
    const values: Record<string, number> = {};
    FEATURES.forEach((f, i) => {
      const boost = breakout.includes(i) && w > weeks / 3 ? 0.09 : 0;
      level[i] = (level[i] as number) * (1 + (growth[i] as number) + boost + (rand() - 0.5) * 0.05);
      values[f] = round(level[i] as number);
    });
    return { time: `W${w + 1}`, values };
  });
}
const REGIONS_RACE = ["North America", "Western Europe", "East Asia", "South Asia", "Latin America", "Middle East", "Africa", "Oceania"];
/** Yearly revenue by region, 2012-2026 (synthetic). */
export function regionRace(seed: number): Array<{ time: number; values: Record<string, number> }> {
  const rand = mulberry32(seed * 5303 + 71);
  const level = [420, 360, 240, 60, 90, 70, 30, 40].map((v) => v * (0.85 + rand() * 0.3));
  const growth = [0.04, 0.02, 0.08, 0.17, 0.07, 0.1, 0.14, 0.03];
  return Array.from({ length: 15 }, (_, y) => {
    const values: Record<string, number> = {};
    REGIONS_RACE.forEach((r, i) => {
      level[i] = (level[i] as number) * (1 + (growth[i] as number) + (rand() - 0.5) * 0.06);
      values[r] = round((level[i] as number) * 1e6, 1e5);
    });
    return { time: 2012 + y, values };
  });
}
export interface KpiSet {
  label: string;
  value: number;
  previous: number;
  trend: number[];
  labels: string[];
}
/** A KPI with a daily trend (the last point is the value) and the previous period's value. */
export function kpi(seed: number, base: number, days = 14, drift = 0.01, noise = 0.06, start = Date.UTC(2026, 2, 1)): KpiSet {
  const rand = mulberry32(seed * 2311 + 73);
  let v = base * (0.9 + rand() * 0.2);
  const trend = Array.from({ length: days }, () => {
    v *= 1 + drift + (rand() - 0.5) * noise;
    return v;
  });
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const value = trend[trend.length - 1] as number;
  return {
    label: "",
    value,
    previous: (trend[0] as number) * (0.92 + rand() * 0.12),
    trend,
    labels: trend.map((_, i) => fmt.format(start + i * 864e5)),
  };
}
const PAGES = ["/", "/pricing", "/docs/getting-started", "/blog/launch-week", "/changelog", "/docs/charts", "/templates", "/careers", "/docs/theming", "/about", "/status", "/legal/privacy"];
/** Top pages by views, with last period's views for change badges. */
export function topPages(seed: number, count = 10): Array<{ label: string; value: number; previous: number; href: string }> {
  const rand = mulberry32(seed * 6547 + 79);
  return PAGES.slice(0, count).map((label, i) => {
    const value = round((64_000 / (i + 1.1)) * (0.7 + rand() * 0.6), 10);
    return { label, value, previous: round(value * (0.7 + rand() * 0.6), 10), href: `#${label}` };
  });
}
const FLAGS: Record<string, string> = {
  "United States": "US",
  Germany: "DE",
  India: "IN",
  Mexico: "MX",
  Japan: "JP",
  "United Kingdom": "GB",
  France: "FR",
  Canada: "CA",
};
/** Users by country with an ISO code (for a small badge icon). */
export function countryUsers(seed: number): Array<{ label: string; value: number; code: string }> {
  return countries(seed).map((c) => ({ label: c.country, value: c.users, code: FLAGS[c.country] ?? "" }));
}
export interface SkillRow {
  skill: string;
  [player: string]: number | string;
}
const SKILLS = ["Speed", "Range", "Battery", "Comfort", "Safety", "Cargo", "Price"];
/** Product comparison on 5-8 shared measures (0-100). */
export function productScores(seed: number, axes = 7, products = ["Model S", "Model R", "Model T"]): SkillRow[] {
  const rand = mulberry32(seed * 3571 + 83);
  const bias = products.map(() => SKILLS.map(() => 40 + rand() * 50));
  return SKILLS.slice(0, axes).map((skill, i) => {
    const row: SkillRow = { skill };
    products.forEach((p, k) => {
      row[p] = Math.round(Math.max(5, Math.min(100, (bias[k]?.[i] as number) + (rand() - 0.5) * 20)));
    });
    return row;
  });
}
/** Service health per region with different units per axis (per-axis maxima). */
export function serviceHealth(seed: number): Array<{ metric: string; max: number; eu: number; us: number }> {
  const rand = mulberry32(seed * 1013 + 89);
  return [
    { metric: "Requests/s", max: 5000, base: 3600 },
    { metric: "Uptime %", max: 100, base: 97 },
    { metric: "Cache hit %", max: 100, base: 82 },
    { metric: "Throughput MB/s", max: 800, base: 520 },
    { metric: "Apdex x100", max: 100, base: 88 },
  ].map(({ metric, max, base }) => ({
    metric,
    max,
    eu: round(Math.min(max, base * (0.85 + rand() * 0.2)), 0.1),
    us: round(Math.min(max, base * (0.85 + rand() * 0.2)), 0.1),
  }));
}
export interface SignupRow {
  month: string;
  signups: number;
  trials: number;
  conversion: number;
  target: number;
}
/** Monthly signups (bars) and trial-to-paid conversion (a rate on the right axis). */
export function signupFunnel(seed: number, months = 12): SignupRow[] {
  const rand = mulberry32(seed * 4547 + 97);
  let s = 1800 + rand() * 600;
  let c = 0.11 + rand() * 0.04;
  return Array.from({ length: months }, (_, i) => {
    s *= 1 + 0.03 + (rand() - 0.45) * 0.18;
    c = Math.max(0.04, Math.min(0.3, c + (rand() - 0.48) * 0.02));
    return { month: MONTHS[i % 12] as string, signups: round(s), trials: round(s * (0.38 + rand() * 0.1)), conversion: round(c, 0.001), target: 0.15 };
  });
}
/** Monthly net cash flow (can go negative) vs cumulative runway in months (right axis). */
export function cashFlow(seed: number): Array<{ month: string; net: number; burn: number; runway: number }> {
  const rand = mulberry32(seed * 7681 + 101);
  let cash = 2.4e6;
  return MONTHS.map((month, i) => {
    const net = round((rand() - 0.62 + i * 0.03) * 260_000, 1000);
    cash += net;
    const burn = round(180_000 + rand() * 60_000, 1000);
    return { month, net, burn, runway: round(cash / burn, 0.1) };
  });
}
export interface CohortCell {
  cohort: string;
  month: string;
  retained: number;
}
/** Monthly signup cohorts and the share still active N months later (a retention triangle). */
export function retentionCohorts(seed: number, cohorts = 9): CohortCell[] {
  const rand = mulberry32(seed * 9533 + 103);
  const out: CohortCell[] = [];
  for (let c = 0; c < cohorts; c++) {
    const quality = 0.9 + rand() * 0.2 + c * 0.012;
    let r = 1;
    for (let m = 0; m < cohorts - c; m++) {
      if (m > 0) r *= m === 1 ? 0.52 + rand() * 0.1 : 0.86 + rand() * 0.07;
      out.push({ cohort: `${MONTHS[c % 12]} 25`, month: `M${m}`, retained: round(Math.min(1, r * (m === 0 ? 1 : quality)), 0.001) });
    }
  }
  return out;
}
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
/** Activity by weekday and hour (a work-hours hotspot with evening and weekend dips). */
export function weeklyActivity(seed: number): Array<{ day: string; hour: string; events: number }> {
  const rand = mulberry32(seed * 5189 + 107);
  const out: Array<{ day: string; hour: string; events: number }> = [];
  WEEKDAYS.forEach((day, d) => {
    for (let h = 0; h < 24; h++) {
      const work = Math.exp(-((h - 13.5) ** 2) / 18);
      const evening = 0.35 * Math.exp(-((h - 21) ** 2) / 4);
      const weekend = d >= 5 ? 0.45 : 1;
      out.push({ day, hour: `${h}`.padStart(2, "0"), events: round((work + evening + 0.05) * weekend * (900 + rand() * 260)) });
    }
  });
  return out;
}
/** Year-over-year change by region and quarter (diverging around 0). */
export function regionGrowth(seed: number): Array<{ region: string; quarter: string; change: number }> {
  const rand = mulberry32(seed * 3001 + 109);
  const regions = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East", "Africa"];
  const quarters = ["Q1 25", "Q2 25", "Q3 25", "Q4 25", "Q1 26", "Q2 26", "Q3 26", "Q4 26"];
  return regions.flatMap((region) => {
    let v = (rand() - 0.4) * 0.2;
    return quarters.map((quarter) => {
      v = Math.max(-0.35, Math.min(0.45, v + (rand() - 0.5) * 0.12));
      return { region, quarter, change: round(v, 0.001) };
    });
  });
}
/** Normal-ish sample (sum of uniforms), seeded. */
function gauss(rand: () => number): number {
  return rand() + rand() + rand() + rand() + rand() + rand() - 3;
}
/** API response times in ms: a lognormal body with a slow tail (right-skewed). */
export function responseTimes(seed: number, count = 900, median = 120): number[] {
  const rand = mulberry32(seed * 6151 + 113);
  return Array.from({ length: count }, () => {
    const slow = rand() > 0.94 ? 2.2 + rand() * 1.5 : 1;
    return round(median * Math.exp(gauss(rand) * 0.42) * slow, 0.1);
  });
}
/** Two-humped order values in USD (small baskets and a bulk-order cluster). */
export function orderValues(seed: number, count = 700): number[] {
  const rand = mulberry32(seed * 2711 + 127);
  return Array.from({ length: count }, () => (rand() > 0.72 ? 210 + gauss(rand) * 26 : 64 + gauss(rand) * 18)).map((v) => round(Math.max(5, v), 0.01));
}
/** Latency per region (rows with group + value) for box plots. */
export function regionLatency(seed: number, perGroup = 70): Array<{ region: string; ms: number }> {
  const rand = mulberry32(seed * 9091 + 131);
  const regions: Array<[string, number, number]> = [
    ["us-east", 82, 0.25],
    ["us-west", 96, 0.3],
    ["eu-central", 118, 0.28],
    ["ap-south", 164, 0.38],
    ["sa-east", 141, 0.45],
  ];
  return regions.flatMap(([region, med, spread]) =>
    Array.from({ length: perGroup }, () => ({ region, ms: round(med * Math.exp(gauss(rand) * spread * (0.8 + rand() * 0.2)) * (rand() > 0.97 ? 1.9 : 1), 0.1) })),
  );
}
/** Salary bands by role (box plot from rows). */
export function salaries(seed: number): Array<{ role: string; salary: number }> {
  const rand = mulberry32(seed * 1201 + 137);
  const roles: Array<[string, number, number]> = [
    ["Design", 118_000, 18_000],
    ["Engineering", 152_000, 26_000],
    ["Data", 141_000, 22_000],
    ["Product", 146_000, 24_000],
    ["Support", 72_000, 9_000],
  ];
  return roles.flatMap(([role, mu, sd]) => Array.from({ length: 40 + Math.floor(rand() * 30) }, () => ({ role, salary: round(mu + gauss(rand) * sd * 1.2, 500) })));
}
/** A product signup funnel with last period's values. */
export function productFunnel(seed: number): Array<{ label: string; value: number; previous: number; description?: string }> {
  const rand = mulberry32(seed * 4421 + 139);
  const steps = ["Visited", "Signed up", "Activated", "Trial", "Paid"];
  const rates = [1, 0.32, 0.58, 0.46, 0.38];
  let v = 24_000 + rand() * 9_000;
  let p = v * (0.88 + rand() * 0.2);
  return steps.map((label, i) => {
    const r = (rates[i] as number) * (0.82 + rand() * 0.34);
    if (i) {
      v *= Math.min(0.95, r);
      p *= Math.min(0.95, r * (0.9 + rand() * 0.2));
    }
    return { label, value: round(v), previous: round(p) };
  });
}
/** Checkout funnel (short, steep). */
export function checkoutFunnel(seed: number): Array<{ label: string; value: number }> {
  const rand = mulberry32(seed * 3343 + 149);
  let v = 8_000 + rand() * 4_000;
  return ["Cart", "Shipping", "Payment", "Review", "Ordered"].map((label, i) => {
    if (i) v *= 0.55 + rand() * 0.4;
    return { label, value: round(v) };
  });
}
/** Quarterly P&L bridge: revenue, cost lines and subtotals. */
export function profitBridge(seed: number): Array<{ step: string; amount: number; total?: boolean }> {
  const rand = mulberry32(seed * 5557 + 151);
  const j = (base: number, spread = 0.25) => round(base * (1 - spread + rand() * spread * 2), 1000);
  return [
    { step: "Revenue", amount: j(1_240_000, 0.1) },
    { step: "COGS", amount: -j(410_000) },
    { step: "Gross profit", amount: 0, total: true },
    { step: "Sales", amount: -j(180_000) },
    { step: "Marketing", amount: -j(140_000) },
    { step: "R&D", amount: -j(210_000) },
    { step: "G&A", amount: -j(90_000) },
    { step: "Other income", amount: j(35_000, 0.8) },
    { step: "Operating profit", amount: 0, total: true },
    { step: "Tax", amount: -j(48_000) },
    { step: "Net profit", amount: 0, total: true },
  ];
}
/** Year-over-year ARR bridge (starting ARR, movements, ending ARR). */
export function arrBridge(seed: number): Array<{ step: string; amount: number; total?: boolean }> {
  const rand = mulberry32(seed * 6029 + 157);
  const j = (base: number) => round(base * (0.7 + rand() * 0.6), 10_000);
  return [
    { step: "ARR Jan", amount: j(4_800_000) },
    { step: "New", amount: j(1_300_000) },
    { step: "Expansion", amount: j(720_000) },
    { step: "Reactivation", amount: j(90_000) },
    { step: "Contraction", amount: -j(260_000) },
    { step: "Churn", amount: -j(610_000) },
    { step: "ARR Dec", amount: 0, total: true },
  ];
}

export interface ForecastBandRow {
  date: Date;
  actual: number | null;
  forecast: number | null;
  lo: number | null;
  hi: number | null;
}
/** Daily actuals, then a forecast whose 80% interval widens with the horizon. */
export function forecastBand(seed: number, days = 60, horizon = 30, start = Date.UTC(2026, 3, 1)): ForecastBandRow[] {
  const rand = mulberry32(seed * 4241 + 77);
  let v = 1_200 + rand() * 300;
  const trend = 4 + rand() * 6;
  const rows: ForecastBandRow[] = [];
  for (let i = 0; i < days + horizon; i++) {
    const weekly = 1 + 0.09 * Math.sin((i / 7) * Math.PI * 2);
    const date = new Date(start + i * 86_400_000);
    if (i < days) {
      v += trend + (rand() - 0.5) * 60;
      const actual = round(v * weekly);
      // The forecast starts at the last actual so the two lines join.
      rows.push({ date, actual, forecast: i === days - 1 ? actual : null, lo: i === days - 1 ? actual : null, hi: i === days - 1 ? actual : null });
    } else {
      const h = i - days + 1;
      const f = (v + trend * h) * weekly;
      const spread = f * (0.012 * Math.sqrt(h) + 0.004 * h);
      rows.push({ date, actual: null, forecast: round(f), lo: round(f - spread), hi: round(f + spread) });
    }
  }
  return rows;
}

export interface TempRow {
  date: Date;
  min: number;
  max: number;
  avg: number;
}
/** A year of daily temperature ranges (northern hemisphere seasonality). */
export function temperatures(seed: number, days = 365, start = Date.UTC(2025, 0, 1)): TempRow[] {
  const rand = mulberry32(seed * 9173 + 5);
  let weather = 0;
  return Array.from({ length: days }, (_, i) => {
    weather = weather * 0.82 + (rand() - 0.5) * 3.2;
    const season = 11 - 10 * Math.cos(((i - 15) / 365) * Math.PI * 2);
    const avg = season + weather;
    const spread = 4 + rand() * 3 + 2 * Math.sin((i / 365) * Math.PI);
    return { date: new Date(start + i * 86_400_000), min: round(avg - spread, 0.1), max: round(avg + spread, 0.1), avg: round(avg, 0.1) };
  });
}

export interface PyramidRow {
  age: string;
  male: number;
  female: number;
}
const AGE_BANDS = ["85+", "75-84", "65-74", "55-64", "45-54", "35-44", "25-34", "15-24", "5-14", "0-4"];
/** Population share by age band and sex (percent of total), oldest first. */
export function populationPyramid(seed: number): PyramidRow[] {
  const rand = mulberry32(seed * 3307 + 41);
  return AGE_BANDS.map((age, k) => {
    const young = AGE_BANDS.length - 1 - k;
    const base = 2.2 + 4.6 * Math.exp(-((young - 4.2 - rand()) ** 2) / 14) - (k < 2 ? 1.1 : 0);
    return { age, male: round(base * (0.94 + rand() * 0.1) - (k < 3 ? 0.25 * (3 - k) : 0), 0.1), female: round(base * (0.98 + rand() * 0.1), 0.1) };
  });
}

/** A dense sensor trace (one point per `stepMs`) for decimation demos. */
export function sensorTrace(seed: number, points = 20_000, stepMs = 15_000, start = Date.UTC(2026, 4, 1)): Array<{ t: Date; value: number }> {
  const rand = mulberry32(seed * 1201 + 3);
  let v = 50;
  let drift = 0;
  return Array.from({ length: points }, (_, i) => {
    drift = drift * 0.995 + (rand() - 0.5) * 0.08;
    v += drift + (rand() - 0.5) * 1.4;
    const spike = rand() < 0.0015 ? (rand() - 0.3) * 40 : 0;
    v = Math.max(5, Math.min(95, v));
    return { t: new Date(start + i * stepMs), value: round(v + spike + 6 * Math.sin(i / 480), 0.01) };
  });
}
export interface TreeDatum {
  name: string;
  value?: number;
  /** Day change in % (market maps). */
  change?: number;
  children?: TreeDatum[];
}
const SECTORS: Array<[string, Array<[string, number]>]> = [
  ["Technology", [["Northwind Cloud", 2900], ["Vectorly", 2400], ["Quanta Chips", 1900], ["Helio Soft", 820], ["Bytewise", 540], ["Lumen OS", 380], ["Cobalt AI", 300]]],
  ["Health", [["Meridian Labs", 760], ["Carewell", 520], ["Genexa", 410], ["Pulse Bio", 260], ["Ortho One", 150]]],
  ["Finance", [["Granite Bank", 690], ["Ledgerly", 480], ["Atlas Pay", 430], ["Harbor Insure", 300], ["Coinpath", 140]]],
  ["Consumer", [["Maple Foods", 520], ["Stride Wear", 410], ["Homeline", 330], ["Brewhouse", 190], ["Petly", 120]]],
  ["Energy", [["Solaris Grid", 470], ["Tidewater Oil", 380], ["Windward", 210], ["Voltix", 110]]],
  ["Industrials", [["Ironclad", 360], ["Aerona", 300], ["Railway Co", 220], ["Forge Robotics", 140]]],
];
/** A stock market map: sectors -> companies with market cap ($B) and a day change in %. */
export function marketMap(seed: number): TreeDatum {
  const rand = mulberry32(seed * 7717 + 41);
  return {
    name: "Market",
    children: SECTORS.map(([sector, cos]) => {
      const mood = (rand() - 0.45) * 2.2;
      return {
        name: sector,
        children: cos.map(([name, cap]) => ({
          name,
          value: round(cap * (0.85 + rand() * 0.3)),
          change: round(mood + (rand() - 0.5) * 4.2, 0.01),
        })),
      };
    }),
  };
}
const ORG: Array<[string, Array<[string, string[]]>]> = [
  ["Engineering", [["Platform", ["Compute", "Storage", "Network"]], ["Product", ["Web", "Mobile", "Growth"]], ["Data", ["Pipelines", "ML", "BI"]]]],
  ["Sales", [["Enterprise", ["NA", "EMEA", "APAC"]], ["Self-serve", ["Inbound", "Partners"]]]],
  ["Marketing", [["Brand", ["Events", "Content"]], ["Performance", ["Paid", "SEO", "Lifecycle"]]]],
  ["Operations", [["People", ["Recruiting", "Benefits"]], ["Finance", ["Accounting", "FP&A"]], ["IT", ["Devices", "SaaS"]]]],
  ["Support", [["Tier 1", ["Chat", "Email"]], ["Success", ["Onboarding", "Renewals"]]]],
];
/** Annual budget ($K): department -> team -> line, three levels deep. */
export function orgBudget(seed: number): TreeDatum {
  const rand = mulberry32(seed * 1777 + 43);
  const scale = [2.6, 1.5, 1.1, 0.9, 0.7];
  return {
    name: "Budget",
    children: ORG.map(([dept, teams], d) => ({
      name: dept,
      children: teams.map(([team, lines]) => ({
        name: team,
        children: lines.map((line) => ({ name: line, value: round((scale[d] as number) * (180 + rand() * 520), 5) })),
      })),
    })),
  };
}
const BUNDLE: TreeDatum = {
  name: "app.js",
  children: [
    { name: "node_modules", children: [
      { name: "react-dom", value: 128 },
      { name: "motion", children: [{ name: "dom", value: 34 }, { name: "react", value: 22 }, { name: "utils", value: 9 }] },
      { name: "date-fns", children: [{ name: "locale", value: 18 }, { name: "format", value: 7 }, { name: "parse", value: 6 }] },
      { name: "zod", value: 14 },
      { name: "react", value: 8 },
    ] },
    { name: "src", children: [
      { name: "components", children: [{ name: "charts", value: 46 }, { name: "forms", value: 21 }, { name: "overlays", value: 17 }, { name: "layout", value: 9 }] },
      { name: "pages", children: [{ name: "dashboard", value: 24 }, { name: "settings", value: 12 }, { name: "billing", value: 11 }, { name: "auth", value: 6 }] },
      { name: "lib", children: [{ name: "api", value: 10 }, { name: "hooks", value: 8 }, { name: "i18n", value: 13 }] },
      { name: "styles", value: 9 },
    ] },
    { name: "assets", children: [{ name: "icons", value: 12 }, { name: "fonts", value: 16 }] },
  ],
};
/** A JS bundle breakdown (kB, gzip): node_modules vs src vs assets, a few levels deep. */
export function bundleTree(seed: number): TreeDatum {
  const rand = mulberry32(seed * 523 + 47);
  const jitter = (d: TreeDatum): TreeDatum => ({
    name: d.name,
    value: d.value === undefined ? undefined : round(d.value * (0.7 + rand() * 0.6), 0.1),
    children: d.children?.map(jitter),
  });
  return jitter(BUNDLE);
}
export interface FlowNode {
  id: string;
  label?: string;
  color?: string;
}
export interface FlowLink {
  source: string;
  target: string;
  value: number;
}
/** Energy flow (TWh): sources -> carriers -> end uses, with losses. */
export function energyFlow(seed: number): { nodes: FlowNode[]; links: FlowLink[] } {
  const rand = mulberry32(seed * 2909 + 53);
  const j = (v: number) => round(v * (0.8 + rand() * 0.4));
  const nodes: FlowNode[] = [
    { id: "solar", label: "Solar", color: "var(--pui-chart-3)" },
    { id: "wind", label: "Wind", color: "var(--pui-chart-2)" },
    { id: "hydro", label: "Hydro", color: "var(--pui-chart-6)" },
    { id: "gas", label: "Natural gas", color: "var(--pui-chart-8)" },
    { id: "oil", label: "Oil", color: "var(--pui-chart-4)" },
    { id: "elec", label: "Electricity", color: "var(--pui-chart-1)" },
    { id: "heat", label: "Heat", color: "var(--pui-chart-5)" },
    { id: "fuel", label: "Fuels", color: "var(--pui-chart-4)" },
    { id: "homes", label: "Homes", color: "var(--pui-chart-7)" },
    { id: "industry", label: "Industry", color: "var(--pui-chart-6)" },
    { id: "transport", label: "Transport", color: "var(--pui-chart-5)" },
    { id: "loss", label: "Losses", color: "var(--pui-muted-foreground)" },
  ];
  const links: FlowLink[] = [
    { source: "solar", target: "elec", value: j(64) },
    { source: "wind", target: "elec", value: j(92) },
    { source: "hydro", target: "elec", value: j(48) },
    { source: "gas", target: "elec", value: j(110) },
    { source: "gas", target: "heat", value: j(86) },
    { source: "oil", target: "fuel", value: j(160) },
    { source: "oil", target: "heat", value: j(18) },
    { source: "elec", target: "homes", value: j(96) },
    { source: "elec", target: "industry", value: j(118) },
    { source: "elec", target: "transport", value: j(26) },
    { source: "elec", target: "loss", value: j(52) },
    { source: "heat", target: "homes", value: j(58) },
    { source: "heat", target: "industry", value: j(32) },
    { source: "heat", target: "loss", value: j(12) },
    { source: "fuel", target: "transport", value: j(122) },
    { source: "fuel", target: "industry", value: j(20) },
    { source: "fuel", target: "loss", value: j(18) },
  ];
  return { nodes, links };
}
/** A signup journey: channel -> landing page -> outcome -> plan. */
export function userJourney(seed: number): { nodes: FlowNode[]; links: FlowLink[] } {
  const rand = mulberry32(seed * 4421 + 59);
  const j = (v: number) => round(v * (0.75 + rand() * 0.5), 10);
  const nodes: FlowNode[] = [
    { id: "search", label: "Search" },
    { id: "social", label: "Social" },
    { id: "email", label: "Email" },
    { id: "direct", label: "Direct" },
    { id: "home", label: "Home page" },
    { id: "pricing", label: "Pricing" },
    { id: "blog", label: "Blog" },
    { id: "signup", label: "Signed up" },
    { id: "bounce", label: "Bounced" },
    { id: "trial", label: "Trial" },
    { id: "paid", label: "Paid" },
  ];
  const links: FlowLink[] = [
    { source: "search", target: "home", value: j(4200) },
    { source: "search", target: "blog", value: j(3100) },
    { source: "social", target: "blog", value: j(2400) },
    { source: "social", target: "home", value: j(900) },
    { source: "email", target: "pricing", value: j(1600) },
    { source: "direct", target: "home", value: j(2100) },
    { source: "direct", target: "pricing", value: j(1300) },
    { source: "home", target: "signup", value: j(2300) },
    { source: "home", target: "bounce", value: j(4400) },
    { source: "pricing", target: "signup", value: j(1900) },
    { source: "pricing", target: "bounce", value: j(900) },
    { source: "blog", target: "signup", value: j(800) },
    { source: "blog", target: "bounce", value: j(4300) },
    { source: "signup", target: "trial", value: j(3100) },
    { source: "signup", target: "paid", value: j(1200) },
  ];
  return { nodes, links };
}
export interface GraphNode {
  id: string;
  label: string;
  group: string;
  value?: number;
}
export interface GraphLink {
  source: string;
  target: string;
  value: number;
}
const FIRST = ["Ava", "Ben", "Chloe", "Dev", "Emma", "Finn", "Gia", "Hugo", "Iris", "Jon", "Kai", "Lena", "Milo", "Nora", "Omar", "Pia", "Quinn", "Rosa", "Sam", "Tara", "Uma", "Vik", "Wren", "Xavi", "Yara", "Zed", "Ari", "Bea", "Cy", "Dana", "Eli", "Faye", "Gus", "Hana", "Ivo", "Jade", "Kit", "Leo", "Maya", "Nico", "Odin", "Pax"];
const TEAMS = ["Design", "Frontend", "Backend", "Data", "Product", "Research"];
/** A collaboration graph: people in teams, dense inside teams, a few bridges between them. */
export function collaboration(seed: number, people = 42): { nodes: GraphNode[]; links: GraphLink[] } {
  const rand = mulberry32(seed * 6007 + 61);
  const nodes: GraphNode[] = Array.from({ length: Math.min(people, FIRST.length) }, (_, i) => ({ id: `p${i}`, label: FIRST[i] as string, group: TEAMS[i % TEAMS.length] as string }));
  const links: GraphLink[] = [];
  const add = (a: number, b: number, v: number) => {
    if (a === b || links.some((l) => (l.source === `p${a}` && l.target === `p${b}`) || (l.source === `p${b}` && l.target === `p${a}`))) return;
    links.push({ source: `p${a}`, target: `p${b}`, value: v });
  };
  nodes.forEach((n, i) => {
    const mates = nodes.map((m, k) => ({ m, k })).filter(({ m, k }) => m.group === n.group && k !== i);
    const count = 1 + Math.floor(rand() * 3);
    for (let c = 0; c < count; c++) {
      const pick = mates[Math.floor(rand() * mates.length)];
      if (pick) add(i, pick.k, round(1 + rand() * 9));
    }
    if (rand() < 0.22) add(i, Math.floor(rand() * nodes.length), round(1 + rand() * 4));
  });
  return { nodes, links };
}
const MODULES: Array<[string, string, string[]]> = [
  ["app", "entry", ["router", "store", "ui", "api", "auth"]],
  ["router", "core", ["history", "utils"]],
  ["store", "core", ["immer", "utils", "devtools"]],
  ["ui", "ui", ["button", "dialog", "table", "chart", "theme"]],
  ["api", "data", ["fetch", "cache", "schema"]],
  ["auth", "data", ["api", "crypto", "store"]],
  ["button", "ui", ["theme", "icons"]],
  ["dialog", "ui", ["theme", "focus-trap", "portal"]],
  ["table", "ui", ["theme", "virtual", "utils"]],
  ["chart", "ui", ["theme", "scale", "path", "utils"]],
  ["cache", "data", ["utils"]],
  ["schema", "data", ["zod"]],
  ["theme", "ui", ["tokens"]],
  ["devtools", "core", []],
  ["history", "core", []],
  ["utils", "core", []],
  ["immer", "vendor", []],
  ["fetch", "vendor", []],
  ["crypto", "vendor", []],
  ["focus-trap", "vendor", []],
  ["portal", "ui", []],
  ["virtual", "vendor", []],
  ["scale", "ui", ["utils"]],
  ["path", "ui", []],
  ["zod", "vendor", []],
  ["tokens", "ui", []],
  ["icons", "ui", []],
];
/** A module dependency graph (imports), sized by how many modules depend on each one. */
export function dependencyGraph(seed: number): { nodes: GraphNode[]; links: GraphLink[] } {
  const rand = mulberry32(seed * 811 + 67);
  const nodes = MODULES.map(([id, group]) => ({ id, label: id, group }));
  const links: GraphLink[] = MODULES.flatMap(([id, , deps]) => deps.map((d) => ({ source: id, target: d, value: round(1 + rand() * 4) })));
  return { nodes, links };
}
export interface SalesNode {
  name: string;
  sales: number;
  target: number;
  children?: SalesNode[];
}
const GEO: Array<[string, Array<[string, string[]]>]> = [
  ["Americas", [["United States", ["New York", "Austin", "Seattle", "Chicago"]], ["Canada", ["Toronto", "Vancouver"]], ["Mexico", ["Mexico City", "Monterrey"]]]],
  ["Europe", [["Germany", ["Berlin", "Munich", "Hamburg"]], ["United Kingdom", ["London", "Manchester"]], ["France", ["Paris", "Lyon"]], ["Spain", ["Madrid", "Barcelona"]]]],
  ["Asia Pacific", [["Japan", ["Tokyo", "Osaka"]], ["India", ["Bengaluru", "Mumbai", "Delhi"]], ["Australia", ["Sydney", "Melbourne"]]]],
  ["Middle East & Africa", [["UAE", ["Dubai", "Abu Dhabi"]], ["South Africa", ["Cape Town", "Johannesburg"]]]],
];
/** Sales vs target ($K): region -> country -> city, every level summed (bar drill-down). */
export function regionSales(seed: number): SalesNode[] {
  const rand = mulberry32(seed * 2311 + 71);
  const sum = (kids: SalesNode[], key: "sales" | "target") => kids.reduce((a, k) => a + k[key], 0);
  return GEO.map(([region, countries]) => {
    const cs = countries.map(([country, cities]) => {
      const ks = cities.map((city) => {
        const target = round(120 + rand() * 380, 5);
        return { name: city, target, sales: round(target * (0.7 + rand() * 0.55), 5) };
      });
      return { name: country, sales: sum(ks, "sales"), target: sum(ks, "target"), children: ks };
    });
    return { name: region, sales: sum(cs, "sales"), target: sum(cs, "target"), children: cs };
  });
}
export interface ShareNode {
  name: string;
  value: number;
  children?: ShareNode[];
}
/** Sessions by device -> OS -> version (pie drill-down). */
export function deviceShare(seed: number): ShareNode[] {
  const rand = mulberry32(seed * 977 + 73);
  const leaf = (name: string, base: number) => ({ name, value: round(base * (0.7 + rand() * 0.6), 10) });
  const group = (name: string, kids: ShareNode[]): ShareNode => ({ name, value: kids.reduce((a, k) => a + k.value, 0), children: kids });
  return [
    group("Mobile", [
      group("iOS", [leaf("iOS 18", 9200), leaf("iOS 17", 4100), leaf("Older", 1200)]),
      group("Android", [leaf("Android 15", 5200), leaf("Android 14", 4600), leaf("Android 13", 2200), leaf("Older", 1500)]),
    ]),
    group("Desktop", [
      group("Windows", [leaf("Windows 11", 7300), leaf("Windows 10", 5100)]),
      group("macOS", [leaf("Sequoia", 4200), leaf("Sonoma", 2100), leaf("Older", 900)]),
      leaf("Linux", 1400),
    ]),
    group("Tablet", [leaf("iPadOS", 2600), leaf("Android tablets", 1300)]),
  ];
}

// ---------------------------------------------------------------------------------------------
// Time + finance (c08)

export interface OhlcRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
/** Trading days only (weekends skipped): a drifting walk with volatility clusters and gaps. */
export function ohlcSeries(seed: number, days = 260, start = "2025-06-02", startPrice = 180): OhlcRow[] {
  const rand = mulberry32(seed * 6151 + 17);
  let price = startPrice * (0.85 + rand() * 0.3);
  let vol = 0.016;
  const out: OhlcRow[] = [];
  let t = Date.parse(`${start}T00:00:00Z`);
  while (out.length < days) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) {
      vol = Math.max(0.006, Math.min(0.045, vol + (rand() - 0.5) * 0.004));
      const gap = rand() > 0.97 ? (rand() - 0.5) * vol * 6 : (rand() - 0.5) * vol * 0.6;
      const open = price * (1 + gap);
      const close = Math.max(5, open * (1 + 0.0006 + (rand() + rand() + rand() - 1.5) * 1.6 * vol));
      const high = Math.max(open, close) * (1 + rand() * vol * 0.9);
      const low = Math.min(open, close) * (1 - rand() * vol * 0.9);
      const move = Math.abs(close - open) / open;
      out.push({
        date: new Date(t).toISOString().slice(0, 10),
        open: round(open, 0.01),
        high: round(high, 0.01),
        low: round(low, 0.01),
        close: round(close, 0.01),
        volume: round(4e6 * (0.55 + rand() * 0.7 + move * 40), 1000),
      });
      price = close;
    }
    t += 864e5;
  }
  return out;
}

/** Daily contributions for a year: weekday rhythm, streaky bursts, a couple of vacations. */
export function contributions(seed: number, year = 2025): Array<{ date: string; count: number }> {
  const rand = mulberry32(seed * 9973 + 29);
  const start = Date.UTC(year, 0, 1);
  const days = (Date.UTC(year + 1, 0, 1) - start) / 864e5;
  const vacations = [Math.floor(rand() * 300), Math.floor(rand() * 300)];
  let mood = 0.5;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start + i * 864e5);
    const wd = d.getUTCDay();
    mood = Math.max(0.05, Math.min(1, mood + (rand() - 0.5) * 0.25));
    const away = vacations.some((v) => i >= v && i < v + 9);
    const weekend = wd === 0 || wd === 6;
    const p = away ? 0.03 : weekend ? 0.25 * mood : 0.55 + mood * 0.4;
    const count = rand() < p ? Math.max(1, Math.round((rand() * 6 + rand() * 6) * (0.4 + mood) * (weekend ? 0.5 : 1))) : 0;
    return { date: d.toISOString().slice(0, 10), count };
  });
}

/** Daily focus minutes for a quarter (month layout). */
export function focusMinutes(seed: number, start = "2026-01-01", days = 90): Array<{ date: string; minutes: number }> {
  const rand = mulberry32(seed * 3301 + 7);
  const t0 = Date.parse(`${start}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(t0 + i * 864e5);
    const wd = d.getUTCDay();
    const base = wd === 0 || wd === 6 ? 20 : 140;
    return { date: d.toISOString().slice(0, 10), minutes: rand() < 0.12 ? 0 : round(base * (0.3 + rand() * 1.2), 5) };
  });
}

export interface PlanTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress?: number;
  group?: string;
  dependsOn?: string[];
  milestone?: boolean;
  assignee?: string;
}
const addIso = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + d * 864e5).toISOString().slice(0, 10);
/** A product launch plan with phases, dependencies and a few milestones. */
export function projectPlan(seed: number, start = "2026-03-02"): PlanTask[] {
  const rand = mulberry32(seed * 1201 + 3);
  const len = (a: number, b: number) => Math.round(a + rand() * (b - a));
  const people = ["Ava", "Ben", "Chloe", "Dev", "Eli", "Mia"];
  const who = () => people[Math.floor(rand() * people.length)] as string;
  const tasks: PlanTask[] = [];
  const add = (id: string, name: string, group: string, after: string[], dur: number, lag = 0, extra: Partial<PlanTask> = {}) => {
    const s = after.length ? addIso(after.map((a) => tasks.find((t) => t.id === a)?.end ?? start).sort().slice(-1)[0] as string, 1 + lag) : addIso(start, lag);
    tasks.push({ id, name, group, start: s, dependsOn: after.length ? after : undefined, assignee: extra.milestone ? undefined : who(), ...extra, end: extra.milestone ? s : addIso(s, Math.max(0, dur - 1)) });
  };
  add("research", "User research", "Discovery", [], len(6, 10));
  add("brief", "Product brief", "Discovery", ["research"], len(3, 5));
  add("kickoff", "Kickoff", "Discovery", ["brief"], 0, 0, { milestone: true });
  add("ux", "UX flows", "Design", ["brief"], len(6, 9));
  add("ui", "Visual design", "Design", ["ux"], len(7, 11), len(-3, 0));
  add("proto", "Prototype test", "Design", ["ui"], len(3, 5));
  add("api", "API + data model", "Build", ["brief"], len(10, 14), len(1, 4));
  add("web", "Web app", "Build", ["ui", "api"], len(12, 16), len(-4, 0));
  add("mobile", "Mobile app", "Build", ["ui", "api"], len(14, 18), len(-2, 2));
  add("qa", "QA + accessibility", "Launch", ["web", "mobile"], len(5, 8));
  add("docs", "Docs + help center", "Launch", ["web"], len(5, 7), len(0, 3));
  add("beta", "Public beta", "Launch", ["qa"], 0, 0, { milestone: true });
  add("launch", "Launch campaign", "Launch", ["beta"], len(4, 6), 2);
  // Progress: everything before the "today" line is done or underway.
  const today = addIso(start, 34);
  for (const t of tasks) {
    if (t.milestone) continue;
    const total = (Date.parse(t.end) - Date.parse(t.start)) / 864e5 + 1;
    const done = (Date.parse(today) - Date.parse(t.start)) / 864e5 + 1;
    t.progress = Math.max(0, Math.min(1, round((done / total) * (0.8 + rand() * 0.35), 0.05)));
  }
  return tasks;
}
export const PLAN_TODAY = addIso("2026-03-02", 34);

/** Two-week sprint board (day scale). */
export function sprintPlan(seed: number, start = "2026-04-06"): PlanTask[] {
  const rand = mulberry32(seed * 811 + 5);
  const names = ["Auth refresh", "Billing page", "Search filters", "Email digest", "Perf budget", "Dark mode QA"];
  const tasks: PlanTask[] = names.map((name, i) => {
    const s = addIso(start, Math.floor(rand() * 5));
    const e = addIso(s, 1 + Math.floor(rand() * 5));
    return { id: `s${i}`, name, start: s, end: e, progress: round(rand(), 0.1), group: i < 3 ? "Frontend" : "Platform" };
  });
  tasks.push({ id: "demo", name: "Sprint demo", start: addIso(start, 11), end: addIso(start, 11), milestone: true, group: "Platform", dependsOn: ["s3", "s4"] });
  return tasks;
}

export interface UptimeDay {
  date: string;
  status: string;
  downtimeMinutes: number;
  detail?: string;
}
const INCIDENTS = ["Elevated API latency", "Partial outage in eu-west", "Database failover", "CDN cache misses", "Webhook delays", "Login errors for some users", "Degraded search"];
/** Daily uptime for a service: mostly green, a few degraded days and the odd outage. */
export function uptimeDays(seed: number, days = 90, end = "2026-06-30", quality = 0.93): UptimeDay[] {
  const rand = mulberry32(seed * 2683 + 11);
  return Array.from({ length: days }, (_, i) => {
    const date = addIso(end, i - days + 1);
    const r = rand();
    if (r > quality + (1 - quality) * 0.6) {
      const mins = Math.round(20 + rand() * 160);
      return { date, status: "down", downtimeMinutes: mins, detail: INCIDENTS[Math.floor(rand() * INCIDENTS.length)] };
    }
    if (r > quality) return { date, status: "degraded", downtimeMinutes: Math.round(rand() * 15), detail: INCIDENTS[Math.floor(rand() * INCIDENTS.length)] };
    if (rand() > 0.985) return { date, status: "maintenance", downtimeMinutes: 0, detail: "Scheduled maintenance" };
    return { date, status: "up", downtimeMinutes: 0 };
  });
}

/** CI runs (one block per run, newest last). */
export function ciRuns(seed: number, runs = 60): Array<{ date: string; status: string; detail: string }> {
  const rand = mulberry32(seed * 577 + 13);
  return Array.from({ length: runs }, (_, i) => {
    const r = rand();
    const status = r > 0.9 ? "failed" : r > 0.84 ? "flaky" : r > 0.82 ? "cancelled" : "passed";
    return { date: addIso("2026-05-01", Math.floor(i / 2)), status, detail: `Build #${1240 + i} \u00b7 ${Math.round(4 + rand() * 9)}m ${Math.round(rand() * 59)}s` };
  });
}

export interface LaptopRow {
  model: string;
  brand: string;
  price: number;
  weight: number;
  battery: number;
  performance: number;
  screen: number;
  rating: number;
}
const BRANDS = ["Aero", "Nimbus", "Vertex", "Orbit"];
/** Laptop specs: correlated price, performance, weight and battery, by brand. */
export function laptops(seed: number, count = 160): LaptopRow[] {
  const rand = mulberry32(seed * 3907 + 23);
  return Array.from({ length: count }, (_, i) => {
    const b = Math.floor(rand() * BRANDS.length);
    const tier = rand();
    const screen = [13.3, 14, 15.6, 16][Math.floor(rand() * 4)] as number;
    const performance = round(30 + tier * 60 + (rand() - 0.5) * 16 + b * 2, 1);
    const price = round(450 + tier * 2100 + (rand() - 0.5) * 300 + (b === 1 ? 200 : 0), 10);
    const weight = round(0.95 + (screen - 13) * 0.3 + (performance / 100) * 0.6 + (rand() - 0.5) * 0.3 - (b === 0 ? 0.15 : 0), 0.01);
    const battery = round(Math.max(4, 16 - performance / 12 - (screen - 13) * 0.6 + (rand() - 0.5) * 3 + (b === 2 ? 2 : 0)), 0.1);
    const rating = round(Math.max(2.5, Math.min(5, 3 + performance / 80 + battery / 30 - price / 5000 + (rand() - 0.5) * 0.6)), 0.1);
    return { model: `${BRANDS[b]} ${["Air", "Pro", "Go", "Max", "Flex"][Math.floor(rand() * 5)]} ${i + 1}`, brand: BRANDS[b] as string, price, weight, battery, performance, screen, rating };
  });
}

export interface CityRow {
  city: string;
  region: string;
  rent: number;
  salary: number;
  commute: number;
  sunshine: number;
  safety: number;
}
const CITIES: Array<[string, string]> = [
  ["Lisbon", "Europe"], ["Berlin", "Europe"], ["Madrid", "Europe"], ["Paris", "Europe"], ["Warsaw", "Europe"], ["Dublin", "Europe"], ["Vienna", "Europe"], ["Prague", "Europe"],
  ["Austin", "Americas"], ["Toronto", "Americas"], ["Denver", "Americas"], ["Seattle", "Americas"], ["Mexico City", "Americas"], ["Bogota", "Americas"], ["Santiago", "Americas"],
  ["Tokyo", "Asia-Pacific"], ["Seoul", "Asia-Pacific"], ["Singapore", "Asia-Pacific"], ["Sydney", "Asia-Pacific"], ["Taipei", "Asia-Pacific"], ["Bangkok", "Asia-Pacific"], ["Auckland", "Asia-Pacific"],
];
/** Cost and quality-of-life measures for remote workers. */
export function cityLife(seed: number): CityRow[] {
  const rand = mulberry32(seed * 1499 + 31);
  return CITIES.map(([city, region]) => ({
    city,
    region,
    rent: round(700 + rand() * 2600, 10),
    salary: round(38 + rand() * 90, 1),
    commute: round(18 + rand() * 40, 1),
    sunshine: round(1500 + rand() * 1600, 10),
    safety: round(45 + rand() * 50, 1),
  }));
}
export interface TargetRow {
  month: string;
  actual: number;
  target: number;
  forecast: number;
}
/** Monthly bookings against a stepped target and a forecast; actuals wander above and below. */
export function bookingsVsTarget(seed: number, months = 12): TargetRow[] {
  const rand = mulberry32(seed * 2213 + 41);
  let level = 92 + rand() * 12;
  return Array.from({ length: months }, (_, i) => {
    const target = 100 + Math.floor(i / 3) * 8;
    level = level * (1 + (rand() - 0.42) * 0.09) + Math.sin(i * 0.9 + seed) * 4;
    return {
      month: MONTHS[i % 12] as string,
      actual: round(level * 1000, 100),
      target: target * 1000,
      forecast: round((target + (rand() - 0.5) * 10) * 1000, 100),
    };
  });
}
/** Daily orders with weekly seasonality over 10 weeks, for week-over-week comparisons. */
export function dailyOrders(seed: number, days = 70, start = Date.UTC(2026, 4, 4)): Array<{ date: Date; orders: number }> {
  const rand = mulberry32(seed * 3163 + 7);
  let level = 420 + rand() * 80;
  return Array.from({ length: days }, (_, i) => {
    level *= 1 + (rand() - 0.46) * 0.035;
    const wd = new Date(start + i * 864e5).getUTCDay();
    const week = wd === 0 || wd === 6 ? 0.68 : wd === 1 ? 1.1 : 1;
    const promo = i > days * 0.55 && i < days * 0.62 ? 1.35 : 1;
    return { date: new Date(start + i * 864e5), orders: round(level * week * promo * (0.94 + rand() * 0.12)) };
  });
}
export interface FacetRow {
  region: string;
  week: Date;
  users: number;
}
const FACET_REGIONS: Array<[string, number, number]> = [
  ["North America", 52, 0.012],
  ["Europe", 44, 0.018],
  ["India", 18, 0.05],
  ["Mexico", 14, 0.028],
  ["Japan", 21, -0.004],
  ["Australia", 9, 0.01],
  ["Nigeria", 5, 0.065],
  ["Germany", 16, 0.006],
];
/** Weekly active users per region (thousands): different levels and growth rates, shared shape. */
export function regionWeekly(seed: number, weeks = 26, start = Date.UTC(2026, 0, 5)): FacetRow[] {
  const rand = mulberry32(seed * 811 + 13);
  return FACET_REGIONS.flatMap(([region, base, growth]) => {
    let v = base * (0.85 + rand() * 0.3);
    const g = growth + (rand() - 0.5) * 0.02;
    const dip = Math.floor(rand() * weeks);
    return Array.from({ length: weeks }, (_, i) => {
      v *= 1 + g + (rand() - 0.5) * 0.05;
      const outage = i === dip ? 0.82 : 1;
      return { region, week: new Date(start + i * 7 * 864e5), users: round(v * outage, 0.1) };
    });
  });
}
/** Daily checkout conversion (%) with a spike, a release that lifts the level, and a bad day. */
export function conversionDays(seed: number, days = 60, start = Date.UTC(2026, 2, 1)): Array<{ date: Date; rate: number }> {
  const rand = mulberry32(seed * 6151 + 19);
  const shift = Math.round(days * (0.45 + rand() * 0.15));
  const spike = Math.round(days * (0.15 + rand() * 0.2));
  const dip = Math.min(days - 3, shift + 5 + Math.round(rand() * 10));
  return Array.from({ length: days }, (_, i) => {
    let v = 3.1 + (rand() - 0.5) * 0.28 + (i >= shift ? 0.7 : 0);
    if (i === spike) v += 1.6 + rand() * 0.6;
    if (i === dip) v -= 1.3 + rand() * 0.4;
    return { date: new Date(start + i * 864e5), rate: round(v, 0.01) };
  });
}
/** Two years of weekly active users (thousands) with a launch, an outage and a pricing change. */
export function adoptionStory(seed: number, weeks = 104, start = Date.UTC(2024, 0, 1)): Array<{ week: Date; users: number }> {
  const rand = mulberry32(seed * 977 + 23);
  let v = 40 + rand() * 6;
  return Array.from({ length: weeks }, (_, i) => {
    const g = i < 30 ? 0.006 : i < 34 ? 0.09 : i < 60 ? 0.012 : i < 72 ? -0.004 : 0.022;
    v *= 1 + g + (rand() - 0.5) * 0.03;
    const outage = i === 52 || i === 53 ? 0.7 : 1;
    return { week: new Date(start + i * 7 * 864e5), users: round(v * outage, 0.1) };
  });
}
export const GENRES = ["Pop", "Hip-hop", "Rock", "Electronic", "Indie", "R&B", "Latin", "Jazz"] as const;
export type GenreRow = { week: Date } & Record<(typeof GENRES)[number], number>;
/** A year of weekly streams (millions) per genre: seasonal waves, a summer Latin surge, a rising genre. */
export function genreStreams(seed: number, weeks = 52, start = Date.UTC(2025, 0, 6)): GenreRow[] {
  const rand = mulberry32(seed * 4421 + 29);
  const base = GENRES.map((_, k) => 30 / (1 + k * 0.45) + rand() * 6);
  const phase = GENRES.map(() => rand() * Math.PI * 2);
  const trend = GENRES.map(() => (rand() - 0.4) * 0.9);
  const hit = Math.round(weeks * (0.3 + rand() * 0.4));
  const hitGenre = Math.floor(rand() * GENRES.length);
  return Array.from({ length: weeks }, (_, i) => {
    const t = i / Math.max(1, weeks - 1);
    const row = { week: new Date(start + i * 7 * 864e5) } as GenreRow;
    GENRES.forEach((g, k) => {
      let v = (base[k] as number) * (1 + (trend[k] as number) * t) * (1 + 0.22 * Math.sin(i / 6 + (phase[k] as number)));
      if (g === "Latin") v *= 1 + 0.9 * Math.exp(-(((i - weeks * 0.55) / 5) ** 2));
      if (k === hitGenre) v *= 1 + 1.1 * Math.exp(-(((i - hit) / 2.5) ** 2));
      row[g] = round(Math.max(0.5, v * (0.94 + rand() * 0.12)), 0.1);
    });
    return row;
  });
}
/** Monthly active devices (thousands) by OS: a stream that rebalances when one platform launches. */
export function deviceMix(seed: number, months = 24, startYear = 2024): Array<{ month: Date; ios: number; android: number; web: number; desktop: number; tv: number }> {
  const rand = mulberry32(seed * 733 + 31);
  const launch = Math.round(months * (0.35 + rand() * 0.2));
  return Array.from({ length: months }, (_, i) => {
    const t = i / Math.max(1, months - 1);
    const n = () => 0.92 + rand() * 0.16;
    return {
      month: new Date(Date.UTC(startYear, i, 1)),
      ios: round(120 * (1 + t * 0.5) * n()),
      android: round(150 * (1 + t * 0.35) * n()),
      web: round(90 * (1 - t * 0.3) * n()),
      desktop: round(60 * (1 + 0.1 * Math.sin(i / 2)) * n()),
      tv: i < launch ? round(2 * n()) : round(14 * (1 + (i - launch) * 0.18) * n()),
    };
  });
}
export const LEAGUE = ["Harbor FC", "Northside", "Red Valley", "Union City", "Ironworks", "Lakeshore", "Westbridge", "Kingsport"] as const;
/** League points per team over eight seasons, with momentum so ranks move gradually. */
export function leagueTable(seed: number, seasons = 8, first = 2018): Array<{ season: number; team: string; points: number }> {
  const rand = mulberry32(seed * 9173 + 37);
  const strength = LEAGUE.map(() => 50 + rand() * 30);
  const out: Array<{ season: number; team: string; points: number }> = [];
  for (let s = 0; s < seasons; s++) {
    LEAGUE.forEach((team, k) => {
      strength[k] = Math.max(25, Math.min(95, (strength[k] as number) + (rand() - 0.5) * 18));
      out.push({ season: first + s, team, points: Math.round((strength[k] as number) + (rand() - 0.5) * 8) });
    });
  }
  return out;
}
export const LANGUAGES = ["TypeScript", "Python", "Rust", "Go", "Java", "Kotlin", "Swift", "C#", "Ruby", "PHP"] as const;
/** Developer survey share (%) per language per year: a few risers, a few fallers. */
export function languageSurvey(seed: number, years = 6, first = 2020): Array<{ year: number; language: string; share: number }> {
  const rand = mulberry32(seed * 3307 + 41);
  const drift = LANGUAGES.map(() => (rand() - 0.45) * 2.4);
  let share = LANGUAGES.map(() => 4 + rand() * 18);
  const out: Array<{ year: number; language: string; share: number }> = [];
  for (let y = 0; y < years; y++) {
    share = share.map((v, k) => Math.max(1, v + (drift[k] as number) + (rand() - 0.5) * 2));
    LANGUAGES.forEach((language, k) => out.push({ year: first + y, language, share: round(share[k] as number, 0.1) }));
  }
  return out;
}
export const FUNDING_SECTORS = ["AI", "Fintech", "Health", "Climate", "Dev tools"] as const;
export interface FundingRow {
  company: string;
  sector: string;
  stage: string;
  raised: number;
  employees: number;
}
/** Funding rounds ($M) by stage with sector and headcount: log-normal-ish, a few mega rounds. */
export function fundingRounds(seed: number, count = 220): FundingRow[] {
  const rand = mulberry32(seed * 6029 + 43);
  const stages = [
    { stage: "Seed", mu: 3 },
    { stage: "Series A", mu: 14 },
    { stage: "Series B", mu: 38 },
    { stage: "Series C+", mu: 95 },
  ];
  const syl = ["Nova", "Flux", "Quill", "Orbit", "Lumen", "Pivot", "Cobalt", "Ember", "Vanta", "Kite", "Moss", "Arc"];
  return Array.from({ length: count }, (_, i) => {
    const s = stages[Math.floor(rand() * stages.length)] as (typeof stages)[number];
    const z = (rand() + rand() + rand() - 1.5) * 1.1;
    const mega = rand() > 0.97 ? 2.6 : 1;
    return {
      company: `${syl[Math.floor(rand() * syl.length)]}${syl[Math.floor(rand() * syl.length)]?.toLowerCase()} ${i + 1}`,
      sector: FUNDING_SECTORS[Math.floor(rand() * FUNDING_SECTORS.length)] as string,
      stage: s.stage,
      raised: round(Math.max(0.3, s.mu * Math.exp(z * 0.55) * mega), 0.1),
      employees: Math.round(Math.max(3, s.mu * (2 + rand() * 4))),
    };
  });
}
/** Exam scores (0-100) for one cohort, a bimodal class with a long left tail. */
export function examScores(seed: number, count = 160): Array<{ student: string; score: number; track: string }> {
  const rand = mulberry32(seed * 811 + 47);
  return Array.from({ length: count }, (_, i) => {
    const advanced = rand() > 0.55;
    const z = rand() + rand() + rand() - 1.5;
    const tail = rand() > 0.93 ? -25 : 0;
    return { student: `Student ${i + 1}`, track: advanced ? "Advanced" : "Standard", score: Math.max(8, Math.min(100, Math.round((advanced ? 82 : 64) + z * 14 + tail))) };
  });
}
/** Daily highs (°C) for one city: 12 monthly ridges with a warm summer shift. */
export function dailyHighs(seed: number, year = 2025): Array<{ month: string; temp: number }> {
  const rand = mulberry32(seed * 2333 + 53);
  const warm = (rand() - 0.5) * 3;
  const out: Array<{ month: string; temp: number }> = [];
  for (let mo = 0; mo < 12; mo++) {
    const days = new Date(Date.UTC(year, mo + 1, 0)).getUTCDate();
    const mean = 12 + 13 * Math.sin(((mo - 3.2) / 12) * Math.PI * 2) + warm;
    const spread = 3 + (mo >= 4 && mo <= 8 ? 1.5 : 2.5) * rand();
    for (let d = 0; d < days; d++) {
      const z = rand() + rand() + rand() - 1.5;
      const heat = mo >= 5 && mo <= 7 && rand() > 0.9 ? 6 : 0;
      out.push({ month: MONTHS[mo] as string, temp: round(mean + z * spread * 1.6 + heat, 0.1) });
    }
  }
  return out;
}
/** Commute times (minutes) per city: different medians, skews and spreads. */
export function commuteTimes(seed: number, perCity = 160): Array<{ city: string; minutes: number }> {
  const rand = mulberry32(seed * 1499 + 59);
  const cities = [
    { city: "Lisbon", mu: 28, s: 9 },
    { city: "Austin", mu: 26, s: 11 },
    { city: "Berlin", mu: 31, s: 8 },
    { city: "Seoul", mu: 42, s: 13 },
    { city: "Toronto", mu: 35, s: 12 },
    { city: "Mumbai", mu: 52, s: 18 },
    { city: "Sydney", mu: 37, s: 10 },
    { city: "Paris", mu: 39, s: 11 },
  ];
  const out: Array<{ city: string; minutes: number }> = [];
  for (const c of cities) {
    const mu = c.mu * (0.92 + rand() * 0.16);
    for (let i = 0; i < perCity; i++) {
      const z = rand() + rand() + rand() - 1.5;
      const skew = rand() > 0.85 ? rand() * c.s * 2.2 : 0;
      out.push({ city: c.city, minutes: round(Math.max(4, mu + z * c.s * 1.4 + skew), 1) });
    }
  }
  return out;
}
/** Net Promoter Score per product area before and after a redesign. */
export function npsShift(seed: number): Array<{ area: string; before: number; after: number }> {
  const rand = mulberry32(seed * 5651 + 61);
  const areas = ["Onboarding", "Search", "Checkout", "Billing", "Mobile app", "Support", "Notifications", "Settings", "Reports", "Integrations"];
  return areas.map((area) => {
    const before = Math.round(10 + rand() * 45);
    const move = Math.round((rand() - 0.3) * 30);
    return { area, before, after: Math.max(-20, Math.min(80, before + move)) };
  });
}
/** Median rent ($/month) per city in two years. */
export function cityRents(seed: number): Array<{ city: string; y2020: number; y2025: number }> {
  const rand = mulberry32(seed * 3797 + 67);
  const cities = ["New York", "San Francisco", "Austin", "Miami", "Chicago", "Denver", "Seattle", "Boston", "Phoenix", "Atlanta", "Nashville", "Portland"];
  return cities.map((city) => {
    const base = 1300 + rand() * 2100;
    const g = (rand() - 0.15) * 0.55;
    return { city, y2020: round(base, 10), y2025: round(base * (1 + g), 10) };
  });
}
/** Planned vs delivered story points per team for one quarter. */
export function teamDelivery(seed: number): Array<{ team: string; planned: number; delivered: number }> {
  const rand = mulberry32(seed * 2711 + 71);
  const teams = ["Payments", "Search", "Growth", "Platform", "Mobile", "Data", "Identity", "Messaging", "Billing", "Design system"];
  return teams.map((team) => {
    const planned = Math.round(60 + rand() * 80);
    return { team, planned, delivered: Math.round(planned * (0.62 + rand() * 0.52)) };
  });
}
/** Skill self-ratings (0-10) now vs the role's target. */
export function skillGaps(seed: number): Array<{ skill: string; current: number; target: number }> {
  const rand = mulberry32(seed * 1777 + 73);
  const skills = ["System design", "Testing", "Accessibility", "Performance", "Security", "Mentoring", "Writing", "Data modeling"];
  return skills.map((skill) => {
    const target = round(6.5 + rand() * 3, 0.5);
    return { skill, target, current: round(Math.max(1, target - rand() * 5 + 0.8), 0.5) };
  });
}
