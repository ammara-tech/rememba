import type { Card, Deck } from "@/lib/types";

/*
  Tags on cards (like "exam" or "chapter 3"), and searching every card in every deck.
  Tags are kept in lowercase, so "Exam" and "exam" are the same tag.
*/

export const MAX_TAGS = 10;
export const MAX_TAG = 30;

/** "Exam, chapter 3 , exam" → ["exam", "chapter 3"] */
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim().replace(/^#/, "").replace(/\s+/g, " ").toLowerCase().slice(0, MAX_TAG);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, MAX_TAGS);
}

/** Every tag with how many cards have it, most used first */
export function tagCounts(cards: Pick<Card, "tags">[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const c of cards) for (const t of c.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Lowercase, without accents, so "more" finds "môre" */
export function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Cards whose front, back or tags contain the words searched for (all of them, in any order) */
export function searchCards(cards: Card[], query: string, tag: string | null = null) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return cards.filter((c) => {
    if (tag && !(c.tags ?? []).includes(tag)) return false;
    const text = fold(`${c.front} ${c.back} ${(c.tags ?? []).join(" ")}`);
    return words.every((w) => text.includes(w));
  });
}

/** Which cards a study session or quiz covers: one deck, one subject, one tag, or everything */
export type Scope = { deck?: string | null; subject?: string | null; tag?: string | null };

export function cardsIn(cards: Card[], decks: Deck[], scope: Scope) {
  if (scope.deck) return cards.filter((c) => c.deckId === scope.deck);
  if (scope.subject) {
    const ids = new Set(decks.filter((d) => d.subjectId === scope.subject).map((d) => d.id));
    return cards.filter((c) => ids.has(c.deckId));
  }
  if (scope.tag) return cards.filter((c) => (c.tags ?? []).includes(scope.tag!));
  return cards;
}
