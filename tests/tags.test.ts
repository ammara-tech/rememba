import { describe, expect, it } from "vitest";
import { MAX_TAGS, cardsIn, parseTags, searchCards, tagCounts } from "@/lib/tags";
import type { Card, Deck } from "@/lib/types";

const card = (id: string, deckId: string, front: string, back: string, tags: string[] = []): Card => ({ id, deckId, front, back, tags, createdAt: 0, reps: 0, interval: 0, ease: 2.5, lapses: 0, due: 0, lastReviewed: null });
const cards = [
  card("1", "bio1", "What do plants make from light?", "Glucose, through photosynthesis", ["exam", "chapter 3"]),
  card("2", "bio2", "Where is DNA kept?", "In the nucleus", ["exam"]),
  card("3", "afr", "Good morning", "Goeie môre"),
];
const decks: Deck[] = [
  { id: "bio1", name: "Plants", colour: "#2f8f5b", subjectId: "biology", createdAt: 0 },
  { id: "bio2", name: "Cells", colour: "#2f8f5b", subjectId: "biology", createdAt: 1 },
  { id: "afr", name: "Afrikaans", colour: "#d4572e", subjectId: "", createdAt: 2 },
];

describe("tags", () => {
  it("tidies what's typed into lowercase tags, without repeats", () => {
    expect(parseTags("Exam, chapter 3 , exam, #Revision,")).toEqual(["exam", "chapter 3", "revision"]);
    expect(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(","))).toHaveLength(MAX_TAGS);
  });

  it("counts how many cards have each tag", () => {
    expect(tagCounts(cards)).toEqual([
      ["exam", 2],
      ["chapter 3", 1],
    ]);
  });
});

describe("searching every card", () => {
  it("finds all the words, in any order, in the front, back or tags", () => {
    expect(searchCards(cards, "plants light").map((c) => c.id)).toEqual(["1"]);
    expect(searchCards(cards, "chapter").map((c) => c.id)).toEqual(["1"]);
    expect(searchCards(cards, "nucleus DNA").map((c) => c.id)).toEqual(["2"]);
  });

  it("ignores accents and capitals, and can stay inside one tag", () => {
    expect(searchCards(cards, "MORE").map((c) => c.id)).toEqual(["3"]);
    expect(searchCards(cards, "", "exam").map((c) => c.id)).toEqual(["1", "2"]);
  });
});

describe("what a session or quiz covers", () => {
  it("can be one deck, one subject, one tag or everything", () => {
    expect(cardsIn(cards, decks, { deck: "afr" }).map((c) => c.id)).toEqual(["3"]);
    expect(cardsIn(cards, decks, { subject: "biology" }).map((c) => c.id)).toEqual(["1", "2"]);
    expect(cardsIn(cards, decks, { tag: "chapter 3" }).map((c) => c.id)).toEqual(["1"]);
    expect(cardsIn(cards, decks, {})).toHaveLength(3);
  });
});
