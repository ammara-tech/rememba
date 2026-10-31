import { addDays, dayKey } from "@/lib/dates";
import { isMature, isNew } from "@/lib/srs";
import type { Card, Profile } from "@/lib/types";

/*
  What to study now.
  - Due: cards you've studied before whose day has come (or that you forgot 10 minutes ago).
  - New: cards you've never studied, oldest first, up to your "new cards a day" (20 to start),
    so a big imported deck doesn't bury you on day one.
  Reviews come first, then new cards. In a session, a card you get wrong goes to the back
  of the queue and comes round again before you finish (see nextQueue).
*/

/** Due by the end of today (or already overdue) */
export function isDue(card: Card, now: number) {
  return !isNew(card) && card.due < addDays(now, 1);
}

/** How many new cards you can still start today */
export function newLeftToday(profile: Pick<Profile, "dailyNew" | "days">, now: number) {
  return Math.max(0, profile.dailyNew - (profile.days[dayKey(now)]?.newCards ?? 0));
}

/** The study queue: due cards (most overdue first), then new cards (oldest first) */
export function buildQueue(cards: Card[], deckId: string | null, now: number, newLeft: number): string[] {
  const inDeck = deckId ? cards.filter((c) => c.deckId === deckId) : cards;
  const due = inDeck.filter((c) => isDue(c, now)).sort((a, b) => a.due - b.due);
  const fresh = inDeck.filter(isNew).sort((a, b) => a.createdAt - b.createdAt).slice(0, newLeft);
  return [...due, ...fresh].map((c) => c.id);
}

/** After an answer: the card leaves the queue, or goes to the back if you got it wrong */
export function nextQueue(queue: string[], cardId: string, again: boolean) {
  const rest = queue.filter((id) => id !== cardId);
  return again ? [...rest, cardId] : rest;
}

export type DeckCounts = { total: number; due: number; fresh: number; mature: number };

/** The numbers on a deck: total, due now, new, and known well */
export function deckCounts(cards: Card[], deckId: string | null, now: number): DeckCounts {
  const inDeck = deckId ? cards.filter((c) => c.deckId === deckId) : cards;
  return {
    total: inDeck.length,
    due: inDeck.filter((c) => isDue(c, now)).length,
    fresh: inDeck.filter(isNew).length,
    mature: inDeck.filter(isMature).length,
  };
}

/** "New", "Due", "Tomorrow", "In 5 days", "In 2 months" for a card in the deck list */
export function cardStatus(card: Card, now: number) {
  if (isNew(card)) return "New";
  if (isDue(card, now)) return "Due";
  const days = Math.round((card.due - addDays(now, 0)) / 86_400_000);
  if (days <= 1) return "Tomorrow";
  if (days < 30) return `In ${days} days`;
  const months = Math.round(days / 30);
  return months < 12 ? `In ${months} month${months === 1 ? "" : "s"}` : `In ${Math.round(days / 365)} year${Math.round(days / 365) === 1 ? "" : "s"}`;
}
