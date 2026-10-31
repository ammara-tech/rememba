import { describe, expect, it } from "vitest";
import { buildQueue, cardStatus, deckCounts, isDue, newLeftToday, nextQueue } from "@/lib/queue";
import { addDays, dayKey } from "@/lib/dates";
import type { Card } from "@/lib/types";

const now = new Date(2026, 9, 31, 10, 0).getTime();
const card = (over: Partial<Card>): Card => ({
  id: "x", deckId: "d1", front: "F", back: "B", tags: [], createdAt: 1,
  reps: 0, interval: 0, ease: 2.5, lapses: 0, due: now, lastReviewed: null, ...over,
});
const studied = (id: string, due: number, extra: Partial<Card> = {}) => card({ id, reps: 2, interval: 3, due, lastReviewed: now - 86_400_000, ...extra });

describe("what's due", () => {
  it("counts anything due before tomorrow, but never a new card", () => {
    expect(isDue(studied("a", addDays(now, 0) + 23 * 3_600_000), now)).toBe(true);
    expect(isDue(studied("b", addDays(now, 1)), now)).toBe(false);
    expect(isDue(card({}), now)).toBe(false);
  });

  it("limits new cards to what's left of today's allowance", () => {
    expect(newLeftToday({ dailyNew: 20, days: {} }, now)).toBe(20);
    expect(newLeftToday({ dailyNew: 20, days: { [dayKey(now)]: { reviewed: 30, correct: 25, newCards: 15 } } }, now)).toBe(5);
    expect(newLeftToday({ dailyNew: 10, days: { [dayKey(now)]: { reviewed: 30, correct: 25, newCards: 15 } } }, now)).toBe(0);
  });
});

describe("the study queue", () => {
  const cards = [
    card({ id: "n2", createdAt: 20 }),
    card({ id: "n1", createdAt: 10 }),
    studied("late", now - 3 * 86_400_000),
    studied("today", now - 3_600_000),
    studied("later", addDays(now, 4)),
    card({ id: "other", deckId: "d2" }),
  ];

  it("puts the most overdue reviews first, then new cards oldest first, up to the limit", () => {
    expect(buildQueue(cards, "d1", now, 1)).toEqual(["late", "today", "n1"]);
    expect(buildQueue(cards, "d1", now, 5)).toEqual(["late", "today", "n1", "n2"]);
    expect(buildQueue(cards, null, now, 5)).toContain("other");
  });

  it("sends a card you got wrong to the back, and takes out one you got right", () => {
    expect(nextQueue(["a", "b", "c"], "a", true)).toEqual(["b", "c", "a"]);
    expect(nextQueue(["a", "b", "c"], "a", false)).toEqual(["b", "c"]);
  });

  it("counts a deck's cards", () => {
    expect(deckCounts(cards, "d1", now)).toEqual({ total: 5, due: 2, fresh: 2, mature: 0 });
  });

  it("describes when a card is next due", () => {
    expect(cardStatus(card({}), now)).toBe("New");
    expect(cardStatus(studied("a", now - 1000), now)).toBe("Due");
    expect(cardStatus(studied("a", addDays(now, 1)), now)).toBe("Tomorrow");
    expect(cardStatus(studied("a", addDays(now, 5)), now)).toBe("In 5 days");
    expect(cardStatus(studied("a", addDays(now, 60)), now)).toBe("In 2 months");
  });
});
