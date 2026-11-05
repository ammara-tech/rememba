"use client";

import { useEffect, useState } from "react";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { isPicture } from "@/lib/picture";
import { getApp } from "@/lib/store";

/*
  Loading and saving card pictures (see lib/picture.ts for why they're kept apart from the cards).
  Each picture is loaded once and kept in memory while the app is open, so studying the same
  card again, or going back to a deck, doesn't load it twice. Firestore also keeps a copy on the
  phone, so pictures you've already seen work offline.
*/

const cache = new Map<string, string | null>();
const loading = new Map<string, Promise<string | null>>();
const ref = (cardId: string) => {
  const uid = getApp().uid;
  if (!uid) throw new Error("Not signed in");
  return doc(firebase().db, "users", uid, "pictures", cardId);
};

export function loadPicture(cardId: string): Promise<string | null> {
  if (cache.has(cardId)) return Promise.resolve(cache.get(cardId) ?? null);
  const running = loading.get(cardId);
  if (running) return running;
  const p = getDoc(ref(cardId))
    .then((snap) => {
      const image = snap.data()?.image;
      const ok = isPicture(image) ? image : null;
      cache.set(cardId, ok);
      return ok;
    })
    .catch(() => null)
    .finally(() => loading.delete(cardId));
  loading.set(cardId, p);
  return p;
}

/** Saves a picture (works offline: Firestore sends it later) */
export function savePicture(cardId: string, image: string) {
  cache.set(cardId, image);
  return setDoc(ref(cardId), { image });
}

export function deletePicture(cardId: string) {
  cache.delete(cardId);
  return deleteDoc(ref(cardId));
}

/** A card's picture for showing: undefined while loading, null if there isn't one */
export function useCardPicture(cardId: string, hasPicture: boolean | undefined) {
  const [image, setImage] = useState<string | null | undefined>(() => (hasPicture ? cache.get(cardId) : null));
  useEffect(() => {
    if (!hasPicture) {
      setImage(null);
      return;
    }
    let live = true;
    setImage(cache.get(cardId));
    loadPicture(cardId).then((img) => live && setImage(img));
    return () => {
      live = false;
    };
  }, [cardId, hasPicture]);
  return image;
}
