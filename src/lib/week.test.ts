import { describe, expect, it } from "vitest";
import { weekOf, currentWeek, weekStart, dueSunday, dayIndex } from "./week";

// Reunion is UTC+4, no DST: Monday 2026-10-12 00:00 local = 2026-10-11 20:00 UTC.
const utc = (s: string) => Date.parse(s);

describe("weekOf", () => {
  it("starts week 00 on Monday 2026-10-12 00:00 Reunion", () => {
    expect(weekOf(utc("2026-10-11T20:00:00Z"))).toBe(0);
    expect(weekOf(utc("2026-10-11T19:59:59Z"))).toBe(-1);
  });

  it("switches week at Monday 00:00 Reunion, not UTC", () => {
    // Sunday 2026-10-18 23:30 Reunion = 19:30 UTC → still week 00
    expect(weekOf(utc("2026-10-18T19:30:00Z"))).toBe(0);
    // Monday 2026-10-19 00:30 Reunion = Sunday 20:30 UTC → week 01
    expect(weekOf(utc("2026-10-18T20:30:00Z"))).toBe(1);
  });
});

describe("currentWeek", () => {
  it("clamps to 0..51", () => {
    expect(currentWeek(utc("2026-01-01T00:00:00Z"))).toBe(0);
    expect(currentWeek(utc("2026-10-16T12:00:00Z"))).toBe(0);
    expect(currentWeek(utc("2028-01-01T00:00:00Z"))).toBe(51);
  });
});

describe("weekStart / dueSunday", () => {
  it("gives Monday 00:00 and Sunday of a week", () => {
    expect(weekStart(1)).toBe(utc("2026-10-18T20:00:00Z"));
    expect(new Date(dueSunday(0)).toISOString().slice(0, 10)).toBe("2026-10-18");
  });
});

describe("dayIndex", () => {
  it("counts Reunion days from week 00", () => {
    expect(dayIndex(utc("2026-10-11T20:00:00Z"))).toBe(0);
    expect(dayIndex(utc("2026-10-12T19:59:00Z"))).toBe(0);
    expect(dayIndex(utc("2026-10-12T20:00:00Z"))).toBe(1);
  });
});
