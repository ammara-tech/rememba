"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { openSharedDeck, shareDeck, stopSharing, updateSharedDeck } from "@/lib/actions";
import { MAX_SHARED_CARDS, shareLink, shareMessage, sharedCards, sharedIsOutOfDate, type SharedDeck } from "@/lib/share";
import type { Card, Deck } from "@/lib/types";

/*
  The Share panel on a deck's page (lib/share.ts has the rules).
  Not shared yet: one button makes a link. Shared: the link with Copy and WhatsApp,
  "Update the shared copy" when the deck has changed since, and "Stop sharing".
*/
export default function SharePanel({ deck, cards, onClose }: { deck: Deck; cards: Card[]; onClose: () => void }) {
  const [shared, setShared] = useState<SharedDeck | null | undefined>(deck.shareCode ? undefined : null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  // Load the shared copy, to know whether it's out of date
  useEffect(() => {
    if (!deck.shareCode) return setShared(null);
    let live = true;
    openSharedDeck(deck.shareCode).then((s) => live && setShared(s));
    return () => {
      live = false;
    };
  }, [deck.shareCode]);

  const count = sharedCards(cards, deck.id).length;
  const total = cards.filter((c) => c.deckId === deck.id).length;
  const link = deck.shareCode && origin ? shareLink(origin, deck.shareCode) : "";
  const outOfDate = shared ? sharedIsOutOfDate(shared, deck, cards) : false;
  const hasPictures = cards.some((c) => c.deckId === deck.id && c.picture);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await action();
      setNote(done);
      if (deck.shareCode) setShared(await openSharedDeck(deck.shareCode));
    } catch {
      setError("That didn't work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setNote("Link copied.");
    } catch {
      setError("Couldn't copy. Press and hold the link to copy it instead.");
    }
  }

  return (
    <section aria-labelledby="share-title" className="mt-4 rounded-2xl border border-indigo/40 bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id="share-title" className="font-serif text-xl font-bold">
          Share this deck
        </h2>
        <button type="button" onClick={onClose} className="tool h-9 min-w-9" aria-label="Close sharing">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {!deck.shareCode ? (
        <>
          <p className="mt-2 text-ink-soft">
            Make a link for classmates or your study group. Anyone signed in to Rememba who opens it can see this deck and add their own copy. They get the
            cards, never your progress.
          </p>
          <button type="button" disabled={busy || total === 0} onClick={() => run(() => shareDeck(deck), "Your link is ready.")} className="btn mt-4">
            <Icon name="link" className="h-4 w-4" />
            {busy ? "Making the link…" : "Make a share link"}
          </button>
          {total === 0 && <p className="mt-2 text-sm text-ink-soft">Add some cards first.</p>}
        </>
      ) : (
        <>
          <p className="mt-2 text-ink-soft">
            Anyone signed in who has this link can add their own copy of {count === 1 ? "this card" : `these ${count} cards`}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label htmlFor="share-link" className="sr-only">
              Share link
            </label>
            <input id="share-link" readOnly value={link} onFocus={(e) => e.target.select()} className="field min-w-0 flex-1 basis-64 font-mono text-sm" />
            <button type="button" onClick={copy} className="btn">
              <Icon name="copy" className="h-4 w-4" />
              Copy
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage(deck.name, count, link))}`} target="_blank" rel="noopener noreferrer" className="btn-quiet">
              <Icon name="whatsapp" className="h-4 w-4" />
              WhatsApp
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          {shared === null && (
            <p className="mt-3 text-sm text-again">The shared copy isn&apos;t there any more. Stop sharing, then make a new link.</p>
          )}
          {outOfDate && (
            <p className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-indigo-soft px-4 py-2 text-sm">
              You&apos;ve changed this deck since you shared it. People who open the link still get the old cards.
              <button type="button" disabled={busy} onClick={() => run(() => updateSharedDeck(deck), "The shared copy is up to date.")} className="btn px-3 py-1.5 text-sm">
                Update the shared copy
              </button>
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => stopSharing(deck), "Sharing stopped. The link doesn't work any more.")}
            className="btn-quiet mt-4 !text-again hover:!border-again"
          >
            Stop sharing
          </button>
        </>
      )}

      {(total > MAX_SHARED_CARDS || hasPictures) && (
        <p className="mt-3 text-sm text-ink-soft">
          {total > MAX_SHARED_CARDS && `Only the first ${MAX_SHARED_CARDS} cards are shared. `}
          {hasPictures && "Pictures aren't shared, only the words on the cards."}
        </p>
      )}
      {note && (
        <p role="status" className="mt-3 text-sm font-semibold text-good">
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-again">
          {error}
        </p>
      )}
    </section>
  );
}
