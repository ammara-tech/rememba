"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { addSharedDeck, openSharedDeck } from "@/lib/actions";
import { codeFromInput, type SharedDeck } from "@/lib/share";
import { useApp } from "@/lib/store";

/*
  /shared?code=…: a deck someone shared with a link (lib/share.ts).
  Shows its name, who shared it, how many cards and the first few, and "Add to my decks",
  which makes your own copy with every card starting as new. Without a code (or with a wrong
  one), you can paste a link or a code here instead.
  Someone who isn't signed in sees the sign-in screen first, then comes back to this page.
*/
export default function SharedPage() {
  return (
    <Suspense>
      <Shared />
    </Suspense>
  );
}

function Shared() {
  const params = useSearchParams();
  const router = useRouter();
  const { uid } = useApp();
  const code = codeFromInput(params.get("code") ?? "");
  const [deck, setDeck] = useState<SharedDeck | null | undefined>(code ? undefined : null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!code) return setDeck(null);
    let live = true;
    setDeck(undefined);
    openSharedDeck(code).then((d) => live && setDeck(d));
    return () => {
      live = false;
    };
  }, [code]);

  if (deck === undefined) return <p role="status" className="py-16 text-center text-ink-soft">Opening the shared deck…</p>;
  if (!deck) return <OpenALink wrong={Boolean(params.get("code"))} />;

  const mine = deck.createdBy === uid;

  function add() {
    if (!deck || added) return;
    setAdded(true);
    const id = addSharedDeck(deck);
    router.push(`/decks/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold text-ink-soft">{mine ? "You shared this deck" : `${deck.ownerName} shared a deck with you`}</p>
      <section aria-labelledby="shared-title" className="mt-3 rounded-2xl border border-line bg-panel p-5">
        <span className="block h-1.5 w-14 rounded-full" style={{ background: deck.colour }} aria-hidden="true" />
        <h1 id="shared-title" className="mt-3 break-words font-serif text-3xl font-bold">
          {deck.name}
        </h1>
        <p className="mt-1 text-ink-soft">
          {deck.cards.length} {deck.cards.length === 1 ? "card" : "cards"}
        </p>

        {deck.cards.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {deck.cards.slice(0, 5).map((c, i) => (
              <li key={i} className="grid gap-1 px-4 py-2.5 sm:grid-cols-2 sm:gap-4">
                <span className="break-words font-semibold">{c.front}</span>
                <span className="break-words text-ink-soft">{c.back}</span>
              </li>
            ))}
          </ul>
        )}
        {deck.cards.length > 5 && <p className="mt-2 text-sm text-ink-soft">…and {deck.cards.length - 5} more.</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={add} disabled={added || deck.cards.length === 0} className="btn">
            <Icon name="plus" />
            {added ? "Adding…" : mine ? "Add another copy to my decks" : "Add to my decks"}
          </button>
          <Link href="/" className="btn-quiet">
            Not now
          </Link>
        </div>
        <p className="mt-3 text-sm text-ink-soft">You get your own copy: every card starts as new, and changes you make don&apos;t change the original.</p>
      </section>
    </div>
  );
}

/* No code, or one that doesn't work: paste a link or a code */
function OpenALink({ wrong }: { wrong: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const code = codeFromInput(value);
    if (!code) return setError(true);
    router.push(`/shared?code=${code}`);
  }

  return (
    <div className="mx-auto max-w-xl py-8">
      <h1 className="font-serif text-3xl font-bold">{wrong ? "That shared deck isn't here" : "Open a shared deck"}</h1>
      <p className="mt-2 text-ink-soft">
        {wrong
          ? "The link may be mistyped, or the person who shared it stopped sharing it. Ask them for a new link."
          : "Paste the link someone sent you, or the 12-letter code in it."}
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-wrap gap-2">
        <label htmlFor="shared-code" className="sr-only">
          Share link or code
        </label>
        <input
          id="shared-code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Paste the link"
          aria-describedby={error ? "shared-error" : undefined}
          className="field min-w-0 flex-1 basis-64"
        />
        <button type="submit" className="btn">
          Open
        </button>
      </form>
      {error && (
        <p id="shared-error" role="alert" className="mt-2 text-sm text-again">
          That doesn&apos;t look like a Rememba share link. Paste the whole link, or the 12-letter code.
        </p>
      )}
      <Link href="/" className="btn-quiet mt-6">
        Back to your decks
      </Link>
    </div>
  );
}
