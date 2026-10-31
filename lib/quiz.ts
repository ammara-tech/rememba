import { fold } from "@/lib/tags";
import type { Card } from "@/lib/types";

/*
  Quiz mode: practice without changing when cards are due.
  - Multiple choice: the right answer plus three wrong ones, taken from the backs of
    other cards in the same quiz, so they look believable.
  - Type the answer: forgiving about capitals, punctuation, accents and a small typo,
    which counts as right but shows you the exact spelling.
*/

export type QuizMode = "choice" | "typed";
export type Question = { cardId: string; prompt: string; answer: string; options: string[] };

/** A fair shuffle. `random` is only passed in by the tests. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Multiple choice needs at least 4 different answers to choose from */
export function canChoose(cards: Card[]) {
  return new Set(cards.map((c) => c.back.trim())).size >= 4;
}

export function buildQuiz(cards: Card[], count: number, mode: QuizMode, random: () => number = Math.random): Question[] {
  const answers = [...new Set(cards.map((c) => c.back.trim()))];
  return shuffle(cards, random)
    .slice(0, count)
    .map((c) => {
      const right = c.back.trim();
      const wrong = mode === "choice" ? shuffle(answers.filter((a) => a !== right), random).slice(0, 3) : [];
      return { cardId: c.id, prompt: c.front, answer: right, options: mode === "choice" ? shuffle([right, ...wrong], random) : [] };
    });
}

/** Letters and numbers only, single spaces, lowercase, no accents */
export function normalise(text: string) {
  return fold(text)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** How many single-letter changes turn one word into another (Levenshtein distance) */
export function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

/**
 * "right": the same, apart from capitals, spaces and punctuation.
 * "close": right apart from accents or a small typo (1 letter, or 2 in a longer answer). Counts as right.
 * "wrong": anything else, or nothing typed.
 */
export function checkTyped(typed: string, answer: string): "right" | "close" | "wrong" {
  const exact = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  if (!exact(typed)) return "wrong";
  if (exact(typed) === exact(answer)) return "right";
  const a = normalise(typed);
  const b = normalise(answer);
  if (a === b) return "close";
  const allowed = b.length <= 4 ? 0 : b.length <= 10 ? 1 : 2;
  return editDistance(a, b) <= allowed ? "close" : "wrong";
}
