"use client";

import { collection, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { MAX_SIDE, type Pair } from "@/lib/importer";
import { DECK_COLOURS, type Sample } from "@/lib/samples";
import { isNew, newSchedule, schedule } from "@/lib/srs";
import { recordReview } from "@/lib/stats";
import { getApp, reportProblem } from "@/lib/store";
import type { Card, Deck, Grade, Profile, Subject } from "@/lib/types";
import { parseTags } from "@/lib/tags";

/*
  Every change Rememba makes to Firestore. firestore.rules checks each one on Google's
  servers: you can only ever touch your own decks, cards and history.
  None of these wait for the server, so they all work offline and sync later.
*/

const db = () => firebase().db;
const me = () => {
  const uid = getApp().uid;
  if (!uid) throw new Error("Not signed in");
  return uid;
};
const decksRef = () => collection(db(), "users", me(), "decks");
const cardsRef = () => collection(db(), "users", me(), "cards");
const subjectsRef = () => collection(db(), "users", me(), "subjects");
const BATCH = 450; // Firestore allows 500 writes in one batch

function quietly(promise: Promise<unknown>) {
  promise.catch(() => reportProblem("A change couldn't be saved. Check your connection and refresh to see your latest cards."));
}

const clean = (text: string, max: number) => text.replace(/\s+$/g, "").replace(/^\s+/g, "").slice(0, max);

/** Writes many documents in batches of up to 450 */
function inBatches<T>(items: T[], write: (batch: ReturnType<typeof writeBatch>, item: T) => void) {
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = writeBatch(db());
    items.slice(i, i + BATCH).forEach((item) => write(batch, item));
    quietly(batch.commit());
  }
}

// ---------- Subjects ----------

export function createSubject(name: string, colour: string): string {
  const ref = doc(subjectsRef());
  const subject: Omit<Subject, "id"> = { name: clean(name, 40) || "New subject", colour, createdAt: Date.now() };
  quietly(setDoc(ref, subject));
  return ref.id;
}

export function editSubject(subject: Subject, name: string, colour: string) {
  const n = clean(name, 40);
  if (!n) return;
  quietly(updateDoc(doc(subjectsRef(), subject.id), { name: n, colour }));
}

/** Deletes a subject. Its decks and cards stay, with no subject. */
export function deleteSubject(subject: Subject) {
  const decks = getApp().decks.filter((d) => d.subjectId === subject.id);
  inBatches(decks, (batch, d) => batch.update(doc(decksRef(), d.id), { subjectId: "" }));
  quietly(writeBatch(db()).delete(doc(subjectsRef(), subject.id)).commit());
}

// ---------- Decks ----------

export function createDeck(name: string, colour?: string, subjectId = ""): string {
  const ref = doc(decksRef());
  const count = getApp().decks.length;
  const subject = getApp().subjects.find((s) => s.id === subjectId);
  const deck: Omit<Deck, "id"> = {
    name: clean(name, 60) || "New deck",
    colour: colour ?? subject?.colour ?? DECK_COLOURS[count % DECK_COLOURS.length],
    subjectId: subject ? subjectId : "",
    createdAt: Date.now(),
  };
  quietly(setDoc(ref, deck));
  return ref.id;
}

export function editDeck(deck: Deck, name: string, colour: string, subjectId: string) {
  const n = clean(name, 60);
  if (!n) return;
  quietly(updateDoc(doc(decksRef(), deck.id), { name: n, colour, subjectId }));
}

/** Deletes a deck and all its cards. Returns the cards, for Undo. */
export function deleteDeck(deck: Deck): Card[] {
  const cards = getApp().cards.filter((c) => c.deckId === deck.id);
  inBatches(cards, (batch, c) => batch.delete(doc(cardsRef(), c.id)));
  quietly(writeBatch(db()).delete(doc(decksRef(), deck.id)).commit());
  return cards;
}

export function restoreDeck(deck: Deck, cards: Card[]) {
  const { id, ...data } = deck;
  quietly(setDoc(doc(decksRef(), id), data));
  restoreCards(cards);
}

/** Adds one of the ready-made decks */
export function addSample(sample: Sample, subjectId = "") {
  const deckId = createDeck(sample.name, sample.colour, subjectId);
  addCards(deckId, sample.cards);
  return deckId;
}

// ---------- Cards ----------

export function addCards(deckId: string, pairs: Pair[], tags: string[] = []) {
  const now = Date.now();
  inBatches(
    pairs.map((p, i) => ({ ...p, createdAt: now + i })), // keeps them in the order given
    (batch, p) => {
      const card: Omit<Card, "id"> = { deckId, front: clean(p.front, MAX_SIDE), back: clean(p.back, MAX_SIDE), tags, createdAt: p.createdAt, ...newSchedule(now) };
      batch.set(doc(cardsRef()), card);
    },
  );
}

export function editCard(card: Card, front: string, back: string, tags: string) {
  const f = clean(front, MAX_SIDE);
  const b = clean(back, MAX_SIDE);
  if (!f || !b) return;
  quietly(updateDoc(doc(cardsRef(), card.id), { front: f, back: b, tags: parseTags(tags) }));
}

export function deleteCard(card: Card) {
  quietly(writeBatch(db()).delete(doc(cardsRef(), card.id)).commit());
}

export function restoreCards(cards: Card[]) {
  inBatches(cards, (batch, { id, ...data }) => batch.set(doc(cardsRef(), id), data));
}

/** Starts a card again as if it were new */
export function resetCard(card: Card) {
  quietly(updateDoc(doc(cardsRef(), card.id), { ...newSchedule(Date.now()) }));
}

// ---------- Studying ----------

/** Saves your answer: the card's new schedule, and today's numbers for your streak and charts */
export function review(card: Card, grade: Grade) {
  const now = Date.now();
  const next = schedule(card, grade, now);
  const { profile } = getApp();
  const days = recordReview(profile.days, now, grade !== "again", isNew(card));
  const batch = writeBatch(db());
  batch.update(doc(cardsRef(), card.id), { ...next });
  batch.update(doc(db(), "users", me()), { days }); // replaces the whole history, so trimmed old days go
  quietly(batch.commit());
  return next;
}

/** Undo the last answer: puts the card's schedule and today's numbers back as they were */
export function undoReview(before: Card, daysBefore: Profile["days"]) {
  const { reps, interval, ease, lapses, due, lastReviewed } = before;
  const batch = writeBatch(db());
  batch.update(doc(cardsRef(), before.id), { reps, interval, ease, lapses, due, lastReviewed });
  batch.update(doc(db(), "users", me()), { days: daysBefore });
  quietly(batch.commit());
}

// ---------- You ----------

export function setProfile(change: { name?: string; dailyNew?: number }) {
  const data: Record<string, unknown> = {};
  if (change.name !== undefined) {
    const n = clean(change.name, 30);
    if (n) data.name = n;
  }
  if (change.dailyNew !== undefined) data.dailyNew = Math.min(200, Math.max(0, Math.round(change.dailyNew)));
  if (Object.keys(data).length) quietly(setDoc(doc(db(), "users", me()), data, { merge: true }));
}
