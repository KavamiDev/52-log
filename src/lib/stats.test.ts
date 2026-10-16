import { describe, expect, it } from "vitest";
import type { Milestone, Product } from "./types";
import { productStatus, productFields, streak, counters, activityLevels, formatCommitDate } from "./stats";

const utc = (s: string) => Date.parse(s);
let n = 0;
const ms = (type: Milestone["type"], week: number, at: string, trailers: Record<string, string> = {}): Milestone => ({
  sha: `sha${n++}`, repo: "KavamiDev/p", type, week, subject: "s", body: "", trailers,
  committedAt: utc(at), url: null,
});
const product = (week: number, milestones: Milestone[]): Product => ({
  week, slug: `p${week}`, name: `P${week}`, repo: `KavamiDev/p${week}`, isPublic: true,
  homepage: null, description: null, milestones,
});

const WEEK2 = utc("2026-10-28T12:00:00Z"); // Wednesday of week 02

describe("productStatus", () => {
  it("is shipped as soon as there is a ship", () => {
    expect(productStatus(product(0, [ms("init", 0, "2026-10-15T08:00:00Z"), ms("ship", 0, "2026-10-18T10:00:00Z")]), WEEK2)).toBe("shipped");
  });
  it("is in_progress for the current week with milestones", () => {
    expect(productStatus(product(2, [ms("init", 2, "2026-10-26T08:00:00Z")]), WEEK2)).toBe("in_progress");
  });
  it("is skipped when its week is past without ship", () => {
    expect(productStatus(product(1, [ms("init", 1, "2026-10-19T08:00:00Z")]), WEEK2)).toBe("skipped");
  });
  it("is planned otherwise", () => {
    expect(productStatus(product(5, []), WEEK2)).toBe("planned");
    expect(productStatus(product(2, []), WEEK2)).toBe("planned");
  });
});

describe("productFields", () => {
  it("takes the latest ship and verdict trailers", () => {
    const f = productFields(product(0, [
      ms("ship", 0, "2026-10-18T10:00:00Z", { Price: "5 EUR", Demo: "https://old", Hours: "6" }),
      ms("ship", 0, "2026-10-18T12:00:00Z", { Price: "9 EUR", Demo: "https://new", Video: "https://v", Hours: "7" }),
      ms("verdict", 0, "2026-11-17T10:00:00Z", { Visitors: "120", Signups: "10", Paying: "3", Revenue: "27 EUR", Lesson: "Price higher" }),
    ]));
    expect(f).toEqual({
      price: { amount: 9, currency: "EUR" }, demoUrl: "https://new", videoUrl: "https://v", hours: 7,
      verdict: { visitors: 120, signups: 10, paying: 3, revenue: 27, lesson: "Price higher" },
    });
  });
  it("is empty without ship or verdict", () => {
    expect(productFields(product(0, [ms("init", 0, "2026-10-15T08:00:00Z")]))).toEqual({});
  });
});

describe("streak", () => {
  it("counts consecutive shipped weeks ending at the last finished week", () => {
    expect(streak(new Set([0, 1]), 2)).toBe(2);
    expect(streak(new Set([0, 2]), 3)).toBe(1);
  });
  it("includes the current week when it is shipped", () => {
    expect(streak(new Set([0, 1, 2]), 2)).toBe(3);
  });
  it("is 0 at the start or after a miss", () => {
    expect(streak(new Set(), 0)).toBe(0);
    expect(streak(new Set([0]), 2)).toBe(0);
  });
});

describe("counters", () => {
  it("computes shipped, streak, revenue and current week", () => {
    const products = [
      product(0, [ms("ship", 0, "2026-10-18T10:00:00Z"), ms("verdict", 0, "2026-11-17T10:00:00Z", { Revenue: "15 EUR" })]),
      product(1, [ms("ship", 1, "2026-10-25T10:00:00Z"), ms("verdict", 1, "2026-11-24T10:00:00Z", { Revenue: "10,50 EUR" })]),
      product(2, [ms("init", 2, "2026-10-26T08:00:00Z")]),
    ];
    expect(counters(products, WEEK2)).toEqual({ currentWeek: 2, shipped: 2, streak: 2, revenue: 25.5 });
  });
  it("is honest when empty", () => {
    expect(counters([], utc("2026-10-16T12:00:00Z"))).toEqual({ currentWeek: 0, shipped: 0, streak: 0, revenue: 0 });
  });
});

describe("activityLevels", () => {
  it("returns 364 days with levels 0..4", () => {
    const list = [
      ms("init", 0, "2026-10-12T08:00:00Z"),
      ...Array.from({ length: 6 }, () => ms("progress", 0, "2026-10-14T08:00:00Z")),
      ms("init", 0, "2026-10-01T08:00:00Z"), // before week 00, dropped
    ];
    const levels = activityLevels(list);
    expect(levels).toHaveLength(364);
    expect(levels[0]).toBe(1);
    expect(levels[2]).toBe(4);
    expect(levels.reduce((a, b) => a + b, 0)).toBe(5);
  });
});

describe("formatCommitDate", () => {
  const now = utc("2026-10-20T12:00:00Z");
  it.each([
    ["2026-10-20T11:59:40Z", "just now"],
    ["2026-10-20T11:59:00Z", "1 minute ago"],
    ["2026-10-20T09:00:00Z", "3 hours ago"],
    ["2026-10-19T12:00:00Z", "1 day ago"],
    ["2026-10-15T08:00:00Z", "5 days ago"],
    ["2026-10-13T11:00:00Z", "on Oct 13"],
    ["2025-10-13T11:00:00Z", "on Oct 13, 2025"],
  ])("%s → %s", (at, out) => {
    expect(formatCommitDate(utc(at), now)).toBe(out);
  });
  it("uses the Reunion calendar day", () => {
    // 2026-10-12 21:00 UTC = Oct 13 01:00 Reunion
    expect(formatCommitDate(utc("2026-10-12T21:00:00Z"), now)).toBe("on Oct 13");
  });
});
