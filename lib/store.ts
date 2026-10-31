"use client";

import { useSyncExternalStore } from "react";
import { collection, doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import type { Card, Deck, Profile, Subject } from "@/lib/types";

/*
  The app's live copy of your decks, cards and progress, kept up to date by Firestore.
  connect(uid) listens to your profile, subjects, decks and cards. Every change you make
  shows straight away, even offline: Firestore saves it on the phone first and sends it
  when the connection is back, and any other device you're signed in on updates too.
*/

export type AppState = {
  uid: string | null;
  ready: boolean;
  profile: Profile;
  subjects: Subject[];
  decks: Deck[];
  cards: Card[];
  pending: boolean;
  online: boolean;
  problem: string | null;
};

export const DEFAULT_DAILY_NEW = 20;
const emptyProfile: Profile = { name: "", dailyNew: DEFAULT_DAILY_NEW, days: {} };

let state: AppState = { uid: null, ready: false, profile: emptyProfile, subjects: [], decks: [], cards: [], pending: false, online: true, problem: null };
const listeners = new Set<() => void>();
function set(change: Partial<AppState>) {
  state = { ...state, ...change };
  listeners.forEach((l) => l());
}

let stops: Unsubscribe[] = [];
let loaded = { profile: false, subjects: false, decks: false, cards: false };
let pending = { profile: false, subjects: false, decks: false, cards: false };

function part(name: keyof typeof loaded, hasPending: boolean) {
  loaded = { ...loaded, [name]: true };
  pending = { ...pending, [name]: hasPending };
  set({ ready: Object.values(loaded).every(Boolean), pending: Object.values(pending).some(Boolean) });
}

export function reportProblem(problem: string | null) {
  set({ problem });
}

const onOnline = () => set({ online: navigator.onLine });
const failed = () => set({ ready: true, problem: "Couldn't load your cards. Check your connection and refresh." });

export function connect(uid: string, name: string) {
  if (state.uid === uid) return;
  disconnect();
  set({ uid, ready: false, online: navigator.onLine });
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOnline);
  const { db } = firebase();

  stops = [
    onSnapshot(
      doc(db, "users", uid),
      { includeMetadataChanges: true },
      (snap) => {
        const saved = snap.data() as Partial<Profile> | undefined;
        // First visit: save a starting profile with your name from the sign-in
        if (!snap.exists() && !snap.metadata.fromCache) {
          setDoc(doc(db, "users", uid), { name: name || "Me", dailyNew: DEFAULT_DAILY_NEW, days: {} }, { merge: true }).catch(() => {});
        }
        set({ profile: { name: saved?.name || name, dailyNew: saved?.dailyNew ?? DEFAULT_DAILY_NEW, days: saved?.days ?? {} } });
        part("profile", snap.metadata.hasPendingWrites);
      },
      failed,
    ),
    onSnapshot(
      collection(db, "users", uid, "subjects"),
      { includeMetadataChanges: true },
      (snap) => {
        set({ subjects: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subject, "id">) })).sort((a, b) => a.name.localeCompare(b.name)) });
        part("subjects", snap.metadata.hasPendingWrites);
      },
      failed,
    ),
    onSnapshot(
      collection(db, "users", uid, "decks"),
      { includeMetadataChanges: true },
      (snap) => {
        set({
          decks: snap.docs
            .map((d) => {
              const data = d.data() as Omit<Deck, "id">;
              return { ...data, subjectId: data.subjectId ?? "", id: d.id }; // decks made before subjects existed have none
            })
            .sort((a, b) => a.createdAt - b.createdAt),
        });
        part("decks", snap.metadata.hasPendingWrites);
      },
      failed,
    ),
    onSnapshot(
      collection(db, "users", uid, "cards"),
      { includeMetadataChanges: true },
      (snap) => {
        set({
          cards: snap.docs.map((d) => {
            const data = d.data() as Omit<Card, "id">;
            return { ...data, tags: data.tags ?? [], id: d.id };
          }),
        });
        part("cards", snap.metadata.hasPendingWrites);
      },
      failed,
    ),
  ];
}

export function disconnect() {
  stops.forEach((s) => s());
  stops = [];
  loaded = { profile: false, subjects: false, decks: false, cards: false };
  pending = { profile: false, subjects: false, decks: false, cards: false };
  if (typeof window !== "undefined") {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOnline);
  }
  set({ uid: null, ready: false, profile: emptyProfile, subjects: [], decks: [], cards: [], pending: false, problem: null });
}

export function getApp() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getApp, getApp);
}
