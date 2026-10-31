import { describe, expect, it } from "vitest";
import { MIN_EASE, RELEARN_MS, START_EASE, gapLabel, isMature, isNew, newSchedule, schedule } from "@/lib/srs";
import { addDays } from "@/lib/dates";
import type { Grade, Schedule } from "@/lib/types";

// Local times, so the tests work in any time zone
const now = new Date(2026, 9, 31, 10, 0).getTime();
const run = (grades: Grade[]) => grades.reduce<Schedule>((card, g) => schedule(card, g, now), newSchedule(now));

describe("spaced repetition", () => {
  it("starts a new card with ease 2.5, never studied", () => {
    const card = newSchedule(now);
    expect(card.ease).toBe(START_EASE);
    expect(isNew(card)).toBe(true);
  });

  it("grows the gaps as you keep getting a card right: 1, 3, then about ×2.5", () => {
    expect(run(["good"]).interval).toBe(1);
    expect(run(["good", "good"]).interval).toBe(3);
    expect(run(["good", "good", "good"]).interval).toBe(8);
    expect(run(["good", "good", "good", "good"]).interval).toBe(20);
  });

  it("is due at midnight on the day it comes back", () => {
    expect(run(["good"]).due).toBe(addDays(now, 1));
    expect(run(["good", "good"]).due).toBe(addDays(now, 3));
  });

  it("brings a forgotten card back in 10 minutes, makes it harder and counts the lapse", () => {
    const known = run(["good", "good", "good"]);
    const forgot = schedule(known, "again", now);
    expect(forgot.reps).toBe(0);
    expect(forgot.due).toBe(now + RELEARN_MS);
    expect(forgot.ease).toBe(2.3);
    expect(forgot.lapses).toBe(1);
  });

  it("doesn't punish Again on a brand new card, but never lets ease fall below 1.3", () => {
    expect(schedule(newSchedule(now), "again", now).ease).toBe(START_EASE);
    let card = run(["good", "good"]);
    for (let i = 0; i < 20; i++) card = schedule(schedule(card, "again", now), "good", now);
    expect(card.ease).toBe(MIN_EASE);
  });

  it("makes Easy gaps longer than Good, and Hard shorter, but Hard never goes backwards", () => {
    const known = run(["good", "good", "good"]); // 8 days
    expect(schedule(known, "easy", now).interval).toBeGreaterThan(schedule(known, "good", now).interval);
    expect(schedule(known, "hard", now).interval).toBeLessThan(schedule(known, "good", now).interval);
    expect(schedule(known, "hard", now).interval).toBeGreaterThanOrEqual(known.interval);
  });

  it("labels the buttons with what they'd do", () => {
    const card = run(["good", "good", "good"]);
    expect(gapLabel(newSchedule(now), "again", now)).toBe("10m");
    expect(gapLabel(newSchedule(now), "good", now)).toBe("1d");
    expect(gapLabel(newSchedule(now), "easy", now)).toBe("4d");
    expect(gapLabel(card, "good", now)).toBe("20d");
    expect(gapLabel({ ...card, interval: 200 }, "good", now)).toMatch(/y$|mo$/);
  });

  it("calls a card mature once the gap is 3 weeks or more", () => {
    expect(isMature(run(["good", "good", "good"]))).toBe(false);
    expect(isMature(run(["good", "good", "good", "good", "good"]))).toBe(true);
  });
});
