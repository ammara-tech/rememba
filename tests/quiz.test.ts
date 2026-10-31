import { describe, expect, it } from "vitest";
import { buildQuiz, canChoose, checkTyped, editDistance, normalise, shuffle } from "@/lib/quiz";
import type { Card } from "@/lib/types";

const card = (id: string, front: string, back: string): Card => ({ id, deckId: "d", front, back, tags: [], createdAt: 0, reps: 0, interval: 0, ease: 2.5, lapses: 0, due: 0, lastReviewed: null });
const cards = [card("1", "Hello", "Hallo"), card("2", "Thank you", "Dankie"), card("3", "Please", "Asseblief"), card("4", "Milk", "Melk"), card("5", "Bread", "Brood")];

// A repeatable "random" for tests
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

describe("building a quiz", () => {
  it("shuffles without losing or repeating anything", () => {
    const s = shuffle([1, 2, 3, 4, 5], seeded(7));
    expect([...s].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("gives each multiple choice question the right answer and three different wrong ones from the deck", () => {
    const quiz = buildQuiz(cards, 5, "choice", seeded(3));
    expect(quiz).toHaveLength(5);
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(4);
      for (const o of q.options) expect(cards.map((c) => c.back)).toContain(o);
    }
  });

  it("uses only as many questions as asked for, and no options when typing", () => {
    expect(buildQuiz(cards, 3, "typed", seeded(1))).toHaveLength(3);
    expect(buildQuiz(cards, 3, "typed", seeded(1))[0].options).toEqual([]);
  });

  it("needs at least 4 different answers for multiple choice", () => {
    expect(canChoose(cards)).toBe(true);
    expect(canChoose(cards.slice(0, 3))).toBe(false);
  });
});

describe("checking a typed answer", () => {
  it.each([
    ["Dankie", "Dankie", "right"],
    ["  dankie! ", "Dankie", "right"],
    ["goeie more", "Goeie môre", "close"],
    ["Asseblif", "Asseblief", "close"],
    ["Hyper Text Markup Langauge", "HyperText Markup Language", "wrong"],
    ["HyperText Markup Langauge", "HyperText Markup Language", "close"],
    ["Ja", "Nee", "wrong"],
    ["Mlk", "Melk", "wrong"],
    ["", "Melk", "wrong"],
  ])("%s for %s is %s", (typed, answer, result) => {
    expect(checkTyped(typed, answer)).toBe(result);
  });

  it("measures typos and tidies answers", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(normalise("  Goeie   Môre! ")).toBe("goeie more");
  });
});
