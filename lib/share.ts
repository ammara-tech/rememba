import { MAX_SIDE } from "@/lib/importer";
import type { Card, Deck } from "@/lib/types";

/*
  Sharing a deck with a link (the Share panel on a deck's page, and /shared for whoever opens it).
  - Sharing saves a copy of the deck's words (front, back and tags, never your progress) under a
    long random code. The link is that code: anyone signed in who has it can see the deck and add
    their own copy. Codes can be read one at a time but never listed (firestore.rules).
  - The copy doesn't change by itself when you edit the deck: "Update the shared copy" does that.
    "Stop sharing" deletes it, so the link stops working. Copies people already added stay theirs.
  - Pictures aren't shared (they're kept apart from the cards, and would make the copy too big).
  Tested in tests/share.test.ts.
*/

export const SHARE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L, so it can be read out
export const SHARE_CODE_LENGTH = 12;
export const MAX_SHARED_CARDS = 500;

export type SharedCard = { front: string; back: string; tags: string[] };
export type SharedDeck = {
  code: string;
  name: string;
  colour: string;
  ownerName: string;
  createdBy: string;
  cards: SharedCard[];
  updatedAt: number;
};

/** A new random code. 31^12 is about 787 million million million, so nobody can guess one. */
export function makeShareCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  let code = "";
  while (code.length < SHARE_CODE_LENGTH) {
    for (const b of random(SHARE_CODE_LENGTH)) {
      // 248 = 31 × 8: skipping 248 to 255 keeps every letter equally likely
      if (b < 248 && code.length < SHARE_CODE_LENGTH) code += SHARE_ALPHABET[b % SHARE_ALPHABET.length];
    }
  }
  return code;
}

export const isShareCode = (code: string) => code.length === SHARE_CODE_LENGTH && [...code].every((c) => SHARE_ALPHABET.includes(c));

export function shareLink(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/shared?code=${code}`;
}

/** The code from a pasted link or a typed code ("abcd efgh jkmn" works too); null if there isn't one */
export function codeFromInput(input: string): string | null {
  const fromLink = input.match(/[?&]code=([A-Za-z0-9]+)/)?.[1];
  const code = (fromLink ?? input).replace(/[\s-]/g, "").toUpperCase();
  return isShareCode(code) ? code : null;
}

/** The words of a deck's cards, in the order they were added, for the shared copy (no progress, no pictures) */
export function sharedCards(cards: Card[], deckId: string): SharedCard[] {
  return cards
    .filter((c) => c.deckId === deckId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, MAX_SHARED_CARDS)
    .map((c) => ({ front: c.front, back: c.back, tags: c.tags.slice(0, 10) }));
}

/** Has the deck changed since it was shared? (So the panel can offer "Update the shared copy") */
export function sharedIsOutOfDate(shared: Pick<SharedDeck, "name" | "cards">, deck: Pick<Deck, "id" | "name">, cards: Card[]) {
  return shared.name !== deck.name || JSON.stringify(shared.cards) !== JSON.stringify(sharedCards(cards, deck.id));
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** A shared deck read from the database, checked so a broken one can't break the page; null if unusable */
export function readShared(code: string, v: unknown): SharedDeck | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const name = text(o.name, 60).trim();
  if (!name || !Array.isArray(o.cards)) return null;
  const cards = o.cards
    .slice(0, MAX_SHARED_CARDS)
    .map((c) => {
      const x = (c ?? {}) as Record<string, unknown>;
      const tags = Array.isArray(x.tags) ? x.tags.filter((t): t is string => typeof t === "string").slice(0, 10) : [];
      return { front: text(x.front, MAX_SIDE).trim(), back: text(x.back, MAX_SIDE).trim(), tags };
    })
    .filter((c) => c.front && c.back);
  return {
    code,
    name,
    colour: /^#[0-9a-fA-F]{3,8}$/.test(text(o.colour, 9)) ? text(o.colour, 9) : "#4f46e5",
    ownerName: text(o.ownerName, 30).trim() || "Someone",
    createdBy: text(o.createdBy, 128),
    cards,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : 0,
  };
}

/** The message to send with the link */
export function shareMessage(deckName: string, count: number, link: string) {
  return `Here's my Rememba deck "${deckName}" (${count} ${count === 1 ? "card" : "cards"}). Open the link to add your own copy and study it: ${link}`;
}
