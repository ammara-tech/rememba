"use client";

import { collection, deleteField, doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { MAX_SIDE, type Pair } from "@/lib/importer";
import { DECK_COLOURS, type Sample } from "@/lib/samples";
import { isNew, newSchedule, schedule } from "@/lib/srs";
import { recordReview } from "@/lib/stats";
import { getApp, reportProblem } from "@/lib/store";
import type { Card, Deck, Grade, Profile, Subject } from "@/lib/types";
import { parseTags } from "@/lib/tags";
import { deletePicture, loadPicture, savePicture } from "@/lib/pictures";
import { makeShareCode, readShared, sharedCards, type SharedDeck } from "@/lib/share";

/*
  Every change Rememba makes to Firestore. firestore.rules checks each one on Google's
  servers: you can only ever touch your own decks, cards, pictures and history, and the
  shared copies of decks you shared yourself.
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

/** Deletes a deck and all its cards (and its shared link, if it had one). Returns the cards, for Undo. */
export function deleteDeck(deck: Deck): Card[] {
  const cards = getApp().cards.filter((c) => c.deckId === deck.id);
  cards.forEach(keepPictureForUndo);
  inBatches(cards, (batch, c) => batch.delete(doc(cardsRef(), c.id)));
  const batch = writeBatch(db()).delete(doc(decksRef(), deck.id));
  if (deck.shareCode) batch.delete(doc(db(), "shared", deck.shareCode));
  quietly(batch.commit());
  return cards;
}

export function restoreDeck(deck: Deck, cards: Card[]) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the shared link was deleted with the deck
  const { id, shareCode, ...data } = deck;
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

/** Adds cards. `tags` go on every card; a pair can bring its own tags too (a shared deck's cards do). */
export function addCards(deckId: string, pairs: (Pair & { tags?: string[] })[], tags: string[] = []) {
  const now = Date.now();
  inBatches(
    pairs.map((p, i) => ({ ...p, createdAt: now + i })), // keeps them in the order given
    (batch, p) => {
      const own = [...new Set([...tags, ...(p.tags ?? [])])].slice(0, 10);
      const card: Omit<Card, "id"> = { deckId, front: clean(p.front, MAX_SIDE), back: clean(p.back, MAX_SIDE), tags: own, createdAt: p.createdAt, ...newSchedule(now) };
      batch.set(doc(cardsRef()), card);
    },
  );
}

/** Adds one card, with a picture if there is one (a small JPEG from lib/picture.ts) */
export function addCard(deckId: string, pair: Pair, tags: string[], picture: string | null) {
  const ref = doc(cardsRef());
  const now = Date.now();
  const card: Omit<Card, "id"> = { deckId, front: clean(pair.front, MAX_SIDE), back: clean(pair.back, MAX_SIDE), tags, createdAt: now, ...newSchedule(now) };
  if (picture) card.picture = true;
  quietly(setDoc(ref, card));
  if (picture) quietly(savePicture(ref.id, picture));
  return ref.id;
}

/** Saves an edited card. picture: a new picture, null to remove it, or undefined to leave it as it is. */
export function editCard(card: Card, front: string, back: string, tags: string, picture?: string | null) {
  const f = clean(front, MAX_SIDE);
  const b = clean(back, MAX_SIDE);
  if (!f || !b) return;
  const change: Record<string, unknown> = { front: f, back: b, tags: parseTags(tags) };
  if (picture) change.picture = true;
  if (picture === null) change.picture = deleteField();
  quietly(updateDoc(doc(cardsRef(), card.id), change));
  if (picture) quietly(savePicture(card.id, picture));
  if (picture === null && card.picture) quietly(deletePicture(card.id));
}

// Pictures of deleted cards, kept in memory for a while so Undo can put them back
const removedPictures = new Map<string, string>();

function keepPictureForUndo(card: Card) {
  if (!card.picture) return;
  loadPicture(card.id).then((image) => {
    if (image) removedPictures.set(card.id, image);
    quietly(deletePicture(card.id));
  });
}

export function deleteCard(card: Card) {
  keepPictureForUndo(card);
  quietly(writeBatch(db()).delete(doc(cardsRef(), card.id)).commit());
}

export function restoreCards(cards: Card[]) {
  inBatches(cards, (batch, { id, ...data }) => batch.set(doc(cardsRef(), id), data));
  for (const c of cards) {
    const image = removedPictures.get(c.id);
    if (c.picture && image) {
      quietly(savePicture(c.id, image));
      removedPictures.delete(c.id);
    }
  }
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

// ---------- Sharing a deck with a link (lib/share.ts) ----------

const sharedRef = (code: string) => doc(db(), "shared", code);

function sharedCopy(deck: Deck) {
  const { profile, cards } = getApp();
  return { name: deck.name, colour: deck.colour, ownerName: profile.name || "Someone", createdBy: me(), cards: sharedCards(cards, deck.id), updatedAt: Date.now() };
}

/** Shares a deck: saves a copy of its words under a new code, and returns the code */
export async function shareDeck(deck: Deck): Promise<string> {
  const code = makeShareCode();
  const batch = writeBatch(db());
  batch.set(sharedRef(code), { ...sharedCopy(deck), createdAt: Date.now() });
  batch.update(doc(decksRef(), deck.id), { shareCode: code });
  await batch.commit();
  return code;
}

/** Puts the deck's latest cards into the shared copy (the link stays the same) */
export async function updateSharedDeck(deck: Deck) {
  if (!deck.shareCode) return;
  await updateDoc(sharedRef(deck.shareCode), sharedCopy(deck));
}

/** Deletes the shared copy, so the link stops working. Copies other people already added stay theirs. */
export async function stopSharing(deck: Deck) {
  if (!deck.shareCode) return;
  const batch = writeBatch(db());
  batch.delete(sharedRef(deck.shareCode));
  batch.update(doc(decksRef(), deck.id), { shareCode: deleteField() });
  await batch.commit();
}

/** Opens a shared deck by its code: null if the link is wrong or the owner stopped sharing it */
export async function openSharedDeck(code: string): Promise<SharedDeck | null> {
  try {
    const snap = await getDoc(sharedRef(code));
    return snap.exists() ? readShared(code, snap.data()) : null;
  } catch {
    return null; // the rules refuse a code that doesn't exist, the same as a wrong one
  }
}

/** Adds your own copy of a shared deck, starting every card as new. Returns the new deck's id. */
export function addSharedDeck(shared: SharedDeck) {
  const deckId = createDeck(shared.name, shared.colour);
  addCards(deckId, shared.cards);
  return deckId;
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
