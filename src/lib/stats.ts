import { site } from "../site.config";
import { parseAmount } from "./milestone";
import type { Milestone, Product, Status } from "./types";
import { currentWeek, dayIndex } from "./week";

const latest = (p: Product, type: Milestone["type"]) =>
  p.milestones.filter((m) => m.type === type).sort((a, b) => b.committedAt - a.committedAt)[0];

export function productStatus(p: Product, now: number): Status {
  if (p.milestones.some((m) => m.type === "ship")) return "shipped";
  const cur = currentWeek(now);
  if (p.week === cur && p.milestones.length) return "in_progress";
  if (p.week < cur) return "skipped";
  return "planned";
}

const num = (v: string | undefined) => parseAmount(v);
const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export function productFields(p: Product) {
  const ship = latest(p, "ship")?.trailers;
  const verdict = latest(p, "verdict")?.trailers;
  const price = num(ship?.Price);
  return clean({
    price: price === undefined ? undefined : { amount: price, currency: "EUR" as const },
    demoUrl: ship?.Demo,
    videoUrl: ship?.Video,
    hours: num(ship?.Hours),
    verdict: verdict && clean({
      visitors: num(verdict.Visitors),
      signups: num(verdict.Signups),
      paying: num(verdict.Paying),
      revenue: num(verdict.Revenue),
      lesson: verdict.Lesson,
    }),
  });
}

/** Consecutive shipped weeks ending at the last finished week, or the current one if shipped. */
export function streak(shipped: Set<number>, current: number): number {
  let w = shipped.has(current) ? current : current - 1;
  let n = 0;
  while (w >= 0 && shipped.has(w)) { n++; w--; }
  return n;
}

export function counters(products: Product[], now: number) {
  const cur = currentWeek(now);
  const shipped = new Set(products.filter((p) => productStatus(p, now) === "shipped").map((p) => p.week));
  const revenue = products.reduce((sum, p) => sum + (productFields(p).verdict?.revenue ?? 0), 0);
  return { currentWeek: cur, shipped: shipped.size, streak: streak(shipped, cur), revenue };
}

/** 364 days from week 00, level = milestones that day capped at 4. */
export function activityLevels(milestones: Milestone[]): number[] {
  const levels = new Array<number>(364).fill(0);
  for (const m of milestones) {
    const d = dayIndex(m.committedAt);
    if (d >= 0 && d < 364) levels[d] = Math.min(4, levels[d] + 1);
  }
  return levels;
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
const year = (t: number) => new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: site.timeZone }).format(t);

/** Text after "committed ": "2 days ago" under 7 days, else "on Oct 15". */
export function formatCommitDate(t: number, now: number): string {
  const s = Math.floor((now - t) / 1000);
  if (s >= 0 && s < 7 * 86_400) {
    if (s < 60) return "just now";
    if (s < 3_600) return plural(Math.floor(s / 60), "minute");
    if (s < 86_400) return plural(Math.floor(s / 3_600), "hour");
    return plural(Math.floor(s / 86_400), "day");
  }
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: site.timeZone };
  if (year(t) !== year(now)) opts.year = "numeric";
  return `on ${new Intl.DateTimeFormat("en-US", opts).format(t)}`;
}
