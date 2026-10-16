import { describe, expect, it } from "vitest";
import { parseMilestone, validateMilestone, parseAmount } from "./milestone";

describe("parseMilestone", () => {
  it("parses type, week, subject and trailers", () => {
    const m = parseMilestone(
      "ship(#01): Invoice Buddy is live\n\nDemo: https://invoice-buddy.pages.dev\nVideo: https://youtu.be/xxxx\nPrice: 5 EUR\nHours: 7\n",
    );
    expect(m).toEqual({
      type: "ship",
      week: 1,
      subject: "Invoice Buddy is live",
      body: "",
      trailers: { Demo: "https://invoice-buddy.pages.dev", Video: "https://youtu.be/xxxx", Price: "5 EUR", Hours: "7" },
    });
  });

  it("keeps the body and separates the trailer paragraph", () => {
    const m = parseMilestone("progress: auth works\n\nStripe is blocking.\nTomorrow: webhooks.\n\nHours: 3");
    expect(m?.body).toBe("Stripe is blocking.\nTomorrow: webhooks.");
    expect(m?.trailers).toEqual({ Hours: "3" });
    expect(m?.week).toBeNull();
  });

  it("treats a last paragraph that is not all trailers as body", () => {
    const m = parseMilestone("cut: scope frozen\n\nOut of V1: exports\nand also the dashboard");
    expect(m?.trailers).toEqual({});
    expect(m?.body).toBe("Out of V1: exports\nand also the dashboard");
  });

  it("handles CRLF line endings", () => {
    const m = parseMilestone("verdict(#01): first numbers\r\n\r\nPaying: 3\r\nRevenue: 15 EUR");
    expect(m?.trailers).toEqual({ Paying: "3", Revenue: "15 EUR" });
  });

  it.each([
    "fix typo",
    "wip",
    "shipping the fix", // starts with a type word but is not a milestone
    "Ship(#01): capitalised type",
    "ship(#1): one-digit week",
    "ship(#52): week out of range",
    "ship:no space",
    "init: no week on init",
    `ship(#01): ${"x".repeat(73)}`,
  ])("ignores %j", (msg) => {
    expect(parseMilestone(msg)).toBeNull();
  });

  it("accepts a 72-char subject", () => {
    expect(parseMilestone(`ship(#01): ${"x".repeat(72)}`)?.subject).toHaveLength(72);
  });
});

describe("validateMilestone (commit-msg hook)", () => {
  it("lets normal commits through", () => {
    expect(validateMilestone("fix typo")).toBeNull();
    expect(validateMilestone("shipping the fix")).toBeNull();
  });

  it("accepts a valid milestone", () => {
    expect(validateMilestone("init(#03): Invoice Buddy\n\nPrice: 5 EUR")).toBeNull();
  });

  it.each([
    ["ship(#1): bad week", /week/],
    ["ship(#60): bad week", /week/],
    ["ship:missing space", /format/],
    ["init: forgot the week", /init/],
    [`ship(#01): ${"x".repeat(73)}`, /72/],
  ])("rejects %j", (msg, err) => {
    expect(validateMilestone(msg)).toMatch(err);
  });
});

describe("parseAmount", () => {
  it.each([
    ["5 EUR", 5],
    ["15,50 EUR", 15.5],
    ["€12", 12],
    ["1 200 EUR", 1200],
    ["nope", undefined],
    [undefined, undefined],
  ])("%j → %j", (v, out) => {
    expect(parseAmount(v)).toBe(out);
  });
});
