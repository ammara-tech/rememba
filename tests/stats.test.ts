import { describe, expect, it } from "vitest";
import { KEEP_DAYS, forecast, lastDays, longestStreak, recordReview, streak, totals } from "@/lib/stats";
import { addDays, dayKey } from "@/lib/dates";
import type { Card } from "@/lib/types";

const now = new Date(2026, 9, 31, 10, 0).getTime();
const day = (offset: number, reviewed = 5) => ({ [dayKey(addDays(now, offset))]: { reviewed, correct: reviewed - 1, newCards: 1 } });

describe("your study history", () => {
  it("adds each answer to today", () => {
    let days = recordReview({}, now, true, true);
    days = recordReview(days, now, false, false);
    expect(days[dayKey(now)]).toEqual({ reviewed: 2, correct: 1, newCards: 1 });
  });

  it("keeps a little over a year, dropping the oldest days", () => {
    let days = {};
    for (let i = KEEP_DAYS + 5; i >= 0; i--) days = { ...days, ...day(-i) };
    const kept = recordReview(days, now, true, false);
    expect(Object.keys(kept)).toHaveLength(KEEP_DAYS);
    expect(kept[dayKey(now)]).toBeDefined();
  });
});

describe("the streak", () => {
  it("counts days in a row, including today", () => {
    expect(streak({ ...day(0), ...day(-1), ...day(-2), ...day(-4) }, now)).toBe(3);
  });

  it("stays alive until midnight if you studied yesterday but not yet today", () => {
    expect(streak({ ...day(-1), ...day(-2) }, now)).toBe(2);
  });

  it("remembers your best run, even across a month change", () => {
    expect(longestStreak({ ...day(-10), ...day(-9), ...day(-8), ...day(-7), ...day(-2), ...day(-1), ...day(0) })).toBe(4);
    expect(longestStreak({})).toBe(0);
  });

  it("is broken by a missed day", () => {
    expect(streak({ ...day(-2), ...day(-3) }, now)).toBe(0);
    expect(streak({}, now)).toBe(0);
  });
});

describe("charts and totals", () => {
  it("gives the last days oldest first, with empty days as zero", () => {
    const bars = lastDays({ ...day(0, 8) }, now, 7);
    expect(bars).toHaveLength(7);
    expect(bars[6].reviewed).toBe(8);
    expect(bars[0].reviewed).toBe(0);
  });

  it("forecasts what's due each day, with overdue cards counted today", () => {
    const card = (due: number, lastReviewed: number | null = now): Card => ({ id: String(due), deckId: "d", front: "", back: "", tags: [], createdAt: 0, reps: 1, interval: 1, ease: 2.5, lapses: 0, due, lastReviewed });
    const f = forecast([card(now - 5 * 86_400_000), card(addDays(now, 1)), card(addDays(now, 1)), card(addDays(now, 3)), card(now, null)], now, 7);
    expect(f.map((d) => d.due)).toEqual([1, 2, 0, 1, 0, 0, 0]);
    expect(f[0].label).toBe("Today");
  });

  it("adds up everything, with accuracy as a percentage", () => {
    expect(totals({ ...day(0, 10), ...day(-1, 10) })).toEqual({ reviewed: 20, correct: 18, studyDays: 2, accuracy: 90 });
    expect(totals({}).accuracy).toBe(null);
  });
});
