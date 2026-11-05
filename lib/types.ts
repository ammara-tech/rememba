/*
  The shapes of Rememba's data, as stored in Firestore (see firestore.rules and the README).
  Everything lives under your own account, so only you can ever read it:

  users/{uid}                 your name, how many new cards a day, and your study history by day
  users/{uid}/subjects/{id}   a subject (Biology, Maths…): its name and colour, to group decks
  users/{uid}/decks/{id}      a deck: its name, colour and subject
  users/{uid}/cards/{id}      a card: front, back, tags, which deck, and when you should see it again
  users/{uid}/pictures/{id}   a card's picture (same id as the card), loaded only when it's shown
  shared/{code}               a copy of a deck's words that you shared with a link (lib/share.ts)

  Times are milliseconds (Date.now()). Intervals are whole days.
*/

export type Grade = "again" | "hard" | "good" | "easy";

/** Where a card is in its spaced repetition schedule (lib/srs.ts) */
export type Schedule = {
  reps: number; // correct answers in a row (0 = new, or forgotten and being relearned)
  interval: number; // days until the next review
  ease: number; // how easy this card is for you: 2.5 to start, never below 1.3
  lapses: number; // how many times you've forgotten it
  due: number; // when it's next due
  lastReviewed: number | null; // null = never studied (a new card)
};

export type Card = Schedule & {
  id: string;
  deckId: string;
  front: string;
  back: string;
  tags: string[]; // e.g. ["exam", "chapter 3"], lowercase
  createdAt: number;
  picture?: boolean; // true if it has a picture (lib/picture.ts), shown with the question
};

export type Deck = {
  id: string;
  name: string;
  colour: string;
  subjectId: string; // "" = no subject
  createdAt: number;
  shareCode?: string; // set while the deck is shared with a link (lib/share.ts)
};

export type Subject = {
  id: string;
  name: string;
  colour: string;
  createdAt: number;
};

/** What you did on one day: cards reviewed, how many you got right, and how many were new */
export type DayStats = { reviewed: number; correct: number; newCards: number };

export type Profile = {
  name: string;
  dailyNew: number; // new cards to learn per day
  days: Record<string, DayStats>; // "2026-10-31" → that day's stats
};
