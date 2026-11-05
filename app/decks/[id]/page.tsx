"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import UndoBar from "@/components/UndoBar";
import { addCard, addCards, deleteCard, deleteDeck, editCard, editDeck, resetCard, restoreCards } from "@/lib/actions";
import CardPicture from "@/components/CardPicture";
import PicturePicker from "@/components/PicturePicker";
import SharePanel from "@/components/SharePanel";
import { MAX_SIDE, parseCards, parseFile, parseNotes, type Pair } from "@/lib/importer";
import { cardStatus, deckCounts, isDue } from "@/lib/queue";
import ColourPicker from "@/components/ColourPicker";
import SubjectDot from "@/components/SubjectDot";
import { parseTags } from "@/lib/tags";
import { isNew } from "@/lib/srs";
import { useApp } from "@/lib/store";
import type { Card, Subject } from "@/lib/types";

/*
  One deck: add cards one at a time (with a picture if you like), or many at once (two columns,
  study notes or a file), tag them, search them, edit or delete them, study or quiz just this
  deck, and share it with a link (components/SharePanel.tsx).
*/

type PasteMode = "columns" | "notes" | "file";
export default function DeckPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { decks, cards, subjects } = useApp();
  const deck = decks.find((d) => d.id === id);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [tags, setTags] = useState("");
  const [picture, setPicture] = useState<string | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<PasteMode>("columns");
  const [pasted, setPasted] = useState("");
  const [file, setFile] = useState<{ name: string; cards: Pair[]; skipped: number } | null>(null);
  const [query, setQuery] = useState("");
  const [editingDeck, setEditingDeck] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [undo, setUndo] = useState<{ text: string; cards: Card[] } | null>(null);
  const frontBox = useRef<HTMLTextAreaElement>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  if (!deck) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-3xl font-bold">That deck isn&apos;t here</h1>
        <p className="mt-2 text-ink-soft">It may have been deleted.</p>
        <Link href="/" className="btn mt-6">
          Back to your decks
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const inDeck = cards.filter((c) => c.deckId === deck.id).sort((a, b) => a.createdAt - b.createdAt);
  const counts = deckCounts(cards, deck.id, now);
  const q = query.trim().toLowerCase();
  const shown = q ? inDeck.filter((c) => `${c.front} ${c.back}`.toLowerCase().includes(q)) : inDeck;
  const preview = mode === "file" ? (file ?? { cards: [], skipped: 0 }) : mode === "notes" ? parseNotes(pasted) : parseCards(pasted);
  const subject = subjects.find((x) => x.id === deck.subjectId);

  function add(e?: FormEvent) {
    e?.preventDefault();
    if (!front.trim() || !back.trim() || !deck) return;
    addCard(deck.id, { front, back }, parseTags(tags), picture ?? null);
    setFront("");
    setBack(""); // the tags stay, for the next card
    setPicture(undefined);
    frontBox.current?.focus();
  }

  function importAll() {
    if (!deck || preview.cards.length === 0) return;
    addCards(deck.id, preview.cards, parseTags(tags));
    setPasted("");
    setFile(null);
    setImporting(false);
  }

  function offerUndo(text: string, removed: Card[]) {
    clearTimeout(undoTimer.current);
    setUndo({ text, cards: removed });
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  }

  return (
    <div>
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <Icon name="back" className="h-4 w-4" />
        All decks
      </Link>

      {/* The deck */}
      <header className="mt-3 rounded-2xl border border-line bg-panel p-5">
        {editingDeck ? (
          <DeckForm
            name={deck.name}
            colour={deck.colour}
            subjectId={deck.subjectId}
            subjects={subjects}
            onSave={(n, c, sub) => {
              editDeck(deck, n, c, sub);
              setEditingDeck(false);
            }}
            onCancel={() => setEditingDeck(false)}
          />
        ) : (
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <span className="block h-1.5 w-14 rounded-full" style={{ background: deck.colour }} />
                {subject && (
                  <>
                    <SubjectDot colour={subject.colour} />
                    {subject.name}
                  </>
                )}
              </span>
              <h1 className="mt-3 break-words font-serif text-3xl font-bold">{deck.name}</h1>
              <p className="mt-1 text-ink-soft">
                {counts.total} {counts.total === 1 ? "card" : "cards"} · {counts.due} due · {counts.fresh} new · {counts.mature} known well
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/study?deck=${deck.id}`} className={`btn ${counts.due + counts.fresh === 0 ? "pointer-events-none opacity-55" : ""}`} aria-disabled={counts.due + counts.fresh === 0}>
                <Icon name="play" />
                Study this deck
              </Link>
              <Link href={`/quiz?deck=${deck.id}`} className={`btn-quiet ${counts.total === 0 ? "pointer-events-none opacity-55" : ""}`} aria-disabled={counts.total === 0}>
                Quiz
              </Link>
              <button type="button" onClick={() => setEditingDeck(true)} className="btn-quiet">
                <Icon name="pencil" className="h-4 w-4" />
                Edit
              </button>
              <button type="button" onClick={() => setSharing((v) => !v)} aria-expanded={sharing} className={`btn-quiet ${deck.shareCode ? "!border-indigo !text-indigo" : ""}`}>
                <Icon name="share" className="h-4 w-4" />
                {deck.shareCode ? "Shared" : "Share"}
              </button>
            </div>
          </div>
        )}
      </header>

      {sharing && <SharePanel deck={deck} cards={cards} onClose={() => setSharing(false)} />}

      {/* Add a card */}
      <section aria-labelledby="add-title" className="mt-6 rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="add-title" className="font-serif text-xl font-bold">
            Add a card
          </h2>
          <button type="button" onClick={() => setImporting((v) => !v)} aria-expanded={importing} className="btn-quiet px-3 py-1.5 text-sm">
            <Icon name={importing ? "close" : "upload"} className="h-4 w-4" />
            {importing ? "One at a time" : "Add many"}
          </button>
        </div>

        {importing ? (
          <div className="mt-4">
            <div role="tablist" aria-label="How to add them" className="flex flex-wrap gap-1 rounded-xl border border-line p-1">
              {(
                [
                  ["columns", "Two columns"],
                  ["notes", "From notes"],
                  ["file", "From a file"],
                ] as [PasteMode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === m ? "bg-indigo text-on-indigo" : "text-ink-soft hover:text-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "file" ? (
              <div className="mt-4">
                <label className="text-sm font-semibold">
                  An export from Anki (.txt) or Quizlet, or a spreadsheet saved as .csv (front in the first column, back in the second)
                  <input
                    type="file"
                    accept=".txt,.tsv,.csv,text/plain,text/csv"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return setFile(null);
                      if (f.size > 2_000_000) return setFile({ name: f.name, cards: [], skipped: 0 });
                      setFile({ name: f.name, ...parseFile(f.name, await f.text()) });
                    }}
                    className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-soft file:px-3 file:py-2 file:font-semibold file:text-indigo"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4">
                <label htmlFor="paste" className="text-sm font-semibold">
                  {mode === "columns"
                    ? "One card per line: front and back split by a Tab, \" - \", \" = \" or \";\""
                    : "Paste your notes: \"Term: what it means\" lines, bullet points and Q: / A: pairs become cards, and headings are left out"}
                </label>
                <textarea
                  id="paste"
                  rows={7}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={
                    mode === "columns"
                      ? "Hello - Hallo\nThank you - Dankie\n(or copy two columns from Excel or Google Sheets)"
                      : "Chapter 3: Plants\n- Chlorophyll: the green pigment that captures light\n- Stomata: tiny pores that let gases in and out\nQ: What gas do plants give off?\nA: Oxygen"
                  }
                  className="field mt-2 font-mono text-sm"
                />
              </div>
            )}

            <label className="mt-3 block text-sm font-semibold">
              Tags for all of them <span className="font-normal text-ink-soft">(optional, separated by commas)</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. exam, chapter 3" className="field mt-1 font-normal" />
            </label>

            {preview.cards.length > 0 && (
              <details className="mt-3 rounded-xl border border-line px-4 py-2 text-sm">
                <summary className="cursor-pointer font-semibold">Check them first ({preview.cards.length})</summary>
                <ul className="mt-2 max-h-48 divide-y divide-line overflow-auto">
                  {preview.cards.slice(0, 50).map((p, i) => (
                    <li key={i} className="grid grid-cols-2 gap-3 py-1.5">
                      <span className="break-words font-semibold">{p.front}</span>
                      <span className="break-words text-ink-soft">{p.back}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={importAll} disabled={preview.cards.length === 0} className="btn">
                Add {preview.cards.length} {preview.cards.length === 1 ? "card" : "cards"}
              </button>
              {preview.skipped > 0 && (
                <span className="text-sm text-again">
                  {preview.skipped} {preview.skipped === 1 ? "line has" : "lines have"} no front and back, so {preview.skipped === 1 ? "it" : "they"}&apos;ll be skipped
                </span>
              )}
              {mode === "file" && file && file.cards.length === 0 && file.skipped === 0 && <span className="text-sm text-again">No cards found in {file.name}. Is it a text or CSV file under 2 MB?</span>}
            </div>
          </div>
        ) : (
          <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Front (the question)
              <textarea
                ref={frontBox}
                rows={3}
                maxLength={MAX_SIDE}
                value={front}
                onChange={(e) => setFront(e.target.value)}
                onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && add()}
                className="field mt-1 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Back (the answer)
              <textarea
                rows={3}
                maxLength={MAX_SIDE}
                value={back}
                onChange={(e) => setBack(e.target.value)}
                onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && add()}
                className="field mt-1 font-normal"
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Tags <span className="font-normal text-ink-soft">(optional, separated by commas; they stay for the next card)</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. exam, chapter 3" className="field mt-1 font-normal" />
            </label>
            <div className="sm:col-span-2">
              <PicturePicker id="new-card-picture" value={picture} hadPicture={false} onChange={setPicture} />
              <p className="mt-1 text-xs text-ink-soft">Optional: a diagram, a map or a photo, shown with the question.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button type="submit" disabled={!front.trim() || !back.trim()} className="btn">
                <Icon name="plus" />
                Add card
              </button>
              <span className="hidden text-xs text-ink-soft sm:inline">Ctrl + Enter adds it too</span>
            </div>
          </form>
        )}
      </section>

      {/* The cards */}
      <section aria-labelledby="cards-title" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="cards-title" className="font-serif text-xl font-bold">
            Cards ({inDeck.length})
          </h2>
          {inDeck.length > 5 && (
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Search cards</span>
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cards" className="field py-2 pl-9" />
            </label>
          )}
        </div>

        {inDeck.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">No cards yet. Add your first one above.</p>
        ) : shown.length === 0 ? (
          <p className="mt-4 text-ink-soft">No cards match &quot;{query.trim()}&quot;.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel">
            {shown.map((c) => (
              <CardRow
                key={c.id}
                card={c}
                now={now}
                onDelete={() => {
                  deleteCard(c);
                  offerUndo("Card deleted", [c]);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Delete the deck */}
      <section className="mt-10 border-t border-line pt-6">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Delete <strong>{deck.name}</strong> and its {inDeck.length} {inDeck.length === 1 ? "card" : "cards"}? Your study history stays.
            </span>
            <button
              type="button"
              onClick={() => {
                deleteDeck(deck);
                router.push("/");
              }}
              className="btn !bg-again !text-white"
            >
              Delete deck
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="btn-quiet">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn-quiet !text-again hover:!border-again">
            <Icon name="trash" className="h-4 w-4" />
            Delete this deck
          </button>
        )}
      </section>

      {undo && (
        <UndoBar
          text={undo.text}
          onUndo={() => {
            restoreCards(undo.cards);
            setUndo(null);
          }}
        />
      )}
    </div>
  );
}

/* One card in the list: its front and back, when it's next due, and Edit / Start again / Delete */
function CardRow({ card, now, onDelete }: { card: Card; now: number; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [tagText, setTagText] = useState(card.tags.join(", "));
  const [picture, setPicture] = useState<string | null | undefined>(undefined);
  const status = cardStatus(card, now);
  const tone = isNew(card) ? "bg-indigo-soft text-indigo" : isDue(card, now) ? "bg-coral/15 text-coral" : "bg-good/15 text-good";

  if (editing) {
    return (
      <li className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editCard(card, front, back, tagText, picture);
            setPicture(undefined);
            setEditing(false);
          }}
          className="grid gap-2 sm:grid-cols-2"
        >
          <label className="text-xs font-semibold text-ink-soft">
            Front
            <textarea autoFocus rows={2} maxLength={MAX_SIDE} value={front} onChange={(e) => setFront(e.target.value)} className="field mt-1 text-ink" />
          </label>
          <label className="text-xs font-semibold text-ink-soft">
            Back
            <textarea rows={2} maxLength={MAX_SIDE} value={back} onChange={(e) => setBack(e.target.value)} className="field mt-1 text-ink" />
          </label>
          <label className="text-xs font-semibold text-ink-soft sm:col-span-2">
            Tags
            <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="e.g. exam, chapter 3" className="field mt-1 text-ink" />
          </label>
          <div className="sm:col-span-2">
            <PicturePicker id={`picture-${card.id}`} value={picture} hadPicture={Boolean(card.picture)} onChange={setPicture} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn px-4 py-2">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setPicture(undefined);
                setEditing(false);
              }}
              className="btn-quiet px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-start gap-3 p-4">
      {card.picture && <CardPicture cardId={card.id} hasPicture question={card.front} className="h-14 w-14 shrink-0 border border-line bg-white object-cover" />}
      <div className="grid min-w-0 flex-1 basis-64 gap-1 sm:grid-cols-2 sm:gap-4">
        <p className="whitespace-pre-wrap break-words font-semibold">{card.front}</p>
        <p className="whitespace-pre-wrap break-words text-ink-soft">{card.back}</p>
        {card.tags.length > 0 && (
          <p className="flex flex-wrap gap-1.5 sm:col-span-2">
            {card.tags.map((t) => (
              <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink-soft hover:border-indigo hover:text-indigo">
                #{t}
              </Link>
            ))}
          </p>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{status}</span>
      <div className="flex shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="tool h-9 min-w-9" aria-label={`Edit the card "${card.front}"`} title="Edit">
          <Icon name="pencil" className="h-4 w-4" />
        </button>
        {!isNew(card) && (
          <button type="button" onClick={() => resetCard(card)} className="tool h-9 min-w-9" aria-label={`Start "${card.front}" again as a new card`} title="Start again as new">
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onDelete} className="tool h-9 min-w-9 hover:!bg-again/10 hover:!text-again" aria-label={`Delete the card "${card.front}"`} title="Delete">
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

/* Renaming a deck, and choosing its colour and subject */
function DeckForm({
  name,
  colour,
  subjectId,
  subjects,
  onSave,
  onCancel,
}: {
  name: string;
  colour: string;
  subjectId: string;
  subjects: Subject[];
  onSave: (name: string, colour: string, subjectId: string) => void;
  onCancel: () => void;
}) {
  const [n, setN] = useState(name);
  const [c, setC] = useState(colour);
  const [sub, setSub] = useState(subjectId);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(n, c, sub);
      }}
      className="space-y-4"
    >
      <label className="block text-sm font-semibold">
        Deck name
        <input autoFocus required maxLength={60} value={n} onChange={(e) => setN(e.target.value)} className="field mt-1 font-normal" />
      </label>
      <label className="block text-sm font-semibold">
        Subject
        <select value={sub} onChange={(e) => setSub(e.target.value)} className="field mt-1 font-normal">
          <option value="">No subject</option>
          {subjects.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <ColourPicker name="deck-colour" value={c} onChange={setC} />
      <div className="flex gap-2">
        <button type="submit" className="btn">
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn-quiet">
          Cancel
        </button>
      </div>
    </form>
  );
}
