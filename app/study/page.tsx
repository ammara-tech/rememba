"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import CardPicture from "@/components/CardPicture";
import { review, undoReview } from "@/lib/actions";
import { buildQueue, newLeftToday, nextQueue } from "@/lib/queue";
import { gapLabel, isNew } from "@/lib/srs";
import { streak } from "@/lib/stats";
import { getApp, useApp } from "@/lib/store";
import { cardsIn } from "@/lib/tags";
import type { Card, Grade, Profile } from "@/lib/types";

/*
  /study (every deck), /study?deck=ID, /study?subject=ID or /study?tag=exam: a study session.
  1. You see the front and try to remember the answer.
  2. "Show answer" (or Space) turns the card over.
  3. You grade yourself: Again, Hard, Good or Easy (or keys 1 to 4). Each button shows when
     you'd see the card again. A card you got wrong comes round again before you finish.
  Undo (or U) takes back your last answer.
*/
export default function StudyPage() {
  return (
    <Suspense>
      <Study />
    </Suspense>
  );
}

const GRADES: { grade: Grade; label: string; key: string; colour: string }[] = [
  { grade: "again", label: "Again", key: "1", colour: "bg-again" },
  { grade: "hard", label: "Hard", key: "2", colour: "bg-hard" },
  { grade: "good", label: "Good", key: "3", colour: "bg-good" },
  { grade: "easy", label: "Easy", key: "4", colour: "bg-easy" },
];

type Last = { before: Card; daysBefore: Profile["days"]; queue: string[]; right: boolean };

function Study() {
  const params = useSearchParams();
  const deckId = params.get("deck");
  const subjectId = params.get("subject");
  const tag = params.get("tag");
  const { cards, decks, subjects, profile } = useApp();
  const deck = deckId ? decks.find((d) => d.id === deckId) : null;
  const subject = subjectId ? subjects.find((x) => x.id === subjectId) : null;
  const [queue, setQueue] = useState<string[] | null>(null);
  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState({ reviewed: 0, right: 0 });
  const [last, setLast] = useState<Last | null>(null);
  const started = useRef(Date.now());

  // The queue is made once when the session starts, so it doesn't change under you
  useEffect(() => {
    if (queue !== null) return;
    const now = Date.now();
    const { cards: all, decks: allDecks, profile: p } = getApp();
    const q = buildQueue(cardsIn(all, allDecks, { deck: deckId, subject: subjectId, tag }), null, now, newLeftToday(p, now));
    setQueue(q);
    setTotal(q.length);
  }, [queue, deckId, subjectId, tag]);

  // Skip cards deleted while studying
  const live = (queue ?? []).filter((id) => cards.some((c) => c.id === id));
  const current = cards.find((c) => c.id === live[0]) ?? null;
  const now = Date.now();

  const answer = useCallback(
    (grade: Grade) => {
      if (!current || !queue) return;
      setLast({ before: current, daysBefore: getApp().profile.days, queue, right: grade !== "again" });
      review(current, grade);
      setQueue(nextQueue(queue, current.id, grade === "again"));
      setDone((d) => ({ reviewed: d.reviewed + 1, right: d.right + (grade === "again" ? 0 : 1) }));
      setShown(false);
    },
    [current, queue],
  );

  const takeBack = useCallback(() => {
    if (!last) return;
    undoReview(last.before, last.daysBefore);
    setQueue(last.queue);
    setDone((d) => ({ reviewed: d.reviewed - 1, right: d.right - (last.right ? 1 : 0) }));
    setShown(true);
    setLast(null);
  }, [last]);

  // Keyboard: Space or Enter shows the answer, 1-4 grade it, U undoes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (!shown && (e.key === " " || e.key === "Enter") && current) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ["1", "2", "3", "4"].includes(e.key)) {
        answer(GRADES[Number(e.key) - 1].grade);
      } else if (e.key.toLowerCase() === "u") {
        takeBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, current, answer, takeBack]);

  if (queue === null) return null;
  const title = deck ? deck.name : subject ? subject.name : tag ? `#${tag}` : "All decks";
  const backTo = deck ? `/decks/${deck.id}` : "/";

  // Nothing to study, or finished
  if (!current) {
    const minutes = Math.max(1, Math.round((Date.now() - started.current) / 60_000));
    const days = streak(profile.days, now);
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        {done.reviewed > 0 ? (
          <>
            <p className="font-serif text-5xl">🎉</p>
            <h1 className="mt-4 font-serif text-3xl font-bold">Session done!</h1>
            <p className="mt-3 text-lg text-ink-soft">
              {done.reviewed} {done.reviewed === 1 ? "answer" : "answers"}, {Math.round((done.right / done.reviewed) * 100)}% right, in about {minutes} min.
            </p>
            {days > 0 && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-flame/15 px-4 py-2 font-bold text-flame">
                <Icon name="flame" />
                {days}-day streak
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-bold">Nothing to study {deck || subject || tag ? `in ${title} ` : ""}right now</h1>
            <p className="mt-3 text-ink-soft">
              {total === 0 && cards.length === 0 ? "Add some cards to a deck first." : "You're up to date. Cards come back on the day you're about to forget them, so check in tomorrow."}
            </p>
          </>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {last && (
            <button type="button" onClick={takeBack} className="btn-quiet">
              <Icon name="undo" />
              Undo last answer
            </button>
          )}
          <Link href={backTo} className="btn">
            {deck ? "Back to the deck" : "Back to your decks"}
          </Link>
          {cards.length > 0 && (
            <Link href={`/quiz${deck ? `?deck=${deck.id}` : subject ? `?subject=${subject.id}` : tag ? `?tag=${encodeURIComponent(tag)}` : ""}`} className="btn-quiet">
              Try a quiz
            </Link>
          )}
        </div>
      </div>
    );
  }

  const cardDeck = decks.find((d) => d.id === current.deckId);
  const position = Math.min(total, total - live.length + 1);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress through the session */}
      <div className="flex items-center gap-3">
        <Link href={backTo} className="tool" aria-label="Stop studying">
          <Icon name="close" />
        </Link>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={total - live.length}>
          <div className="h-full rounded-full bg-indigo transition-all" style={{ width: `${total ? ((total - live.length) / total) * 100 : 0}%` }} />
        </div>
        <span className="text-sm font-semibold text-ink-soft">{live.length} left</span>
        <button type="button" onClick={takeBack} disabled={!last} className="tool disabled:opacity-30" aria-label="Undo last answer (U)" title="Undo last answer (U)">
          <Icon name="undo" />
        </button>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: cardDeck?.colour }} aria-hidden="true" />
        <span>{deck ? title : `${title === "All decks" ? "" : `${title} · `}${cardDeck?.name ?? ""}`}</span>
        {isNew(current) && <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-xs font-bold text-indigo">New</span>}
        {current.lapses > 0 && <span className="text-xs">· forgotten {current.lapses}×</span>}
        <span className="sr-only">
          Card {position} of {total}
        </span>
      </p>

      {/* The card: front, then turned over to the back */}
      <div className={`flip mt-3 ${shown ? "flipped" : ""}`}>
        <div className="flip-inner">
          <Face label="Question" text={current.front} hidden={shown} picture={current.picture ? current.id : undefined} />
          <div className="back">
            <Face label="Answer" text={current.back} question={current.front} hidden={!shown} picture={current.picture ? current.id : undefined} small />
          </div>
        </div>
      </div>

      {/* Show answer, or grade it */}
      <div className="mt-6" aria-live="polite">
        {!shown ? (
          <button type="button" onClick={() => setShown(true)} className="btn w-full py-4 text-lg">
            Show answer
            <span className="hidden text-sm font-semibold opacity-80 sm:inline">(Space)</span>
          </button>
        ) : (
          <>
            <p className="mb-2 text-center text-sm text-ink-soft">How well did you remember it?</p>
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button key={g.grade} type="button" onClick={() => answer(g.grade)} className={`rounded-xl py-3 font-bold text-white hover:brightness-110 ${g.colour} dark:text-page`}>
                  {g.label}
                  <span className="block text-xs font-semibold opacity-90">
                    {gapLabel(current, g.grade, now)}
                    <span className="hidden sm:inline"> · {g.key}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* One side of the index card */
function Face({ label, text, question, hidden, picture, small }: { label: string; text: string; question?: string; hidden: boolean; picture?: string; small?: boolean }) {
  return (
    <section aria-hidden={hidden} className="index-card flex min-h-72 flex-col px-6 pb-8 pt-4 sm:min-h-80">
      <p className="text-xs font-bold uppercase tracking-widest text-paper-soft">{label}</p>
      {picture && <CardPicture cardId={picture} hasPicture question={question ?? text} className={`mx-auto mt-4 bg-white ${small ? "h-20 w-28" : "h-44 w-full max-w-sm sm:h-56"}`} />}
      {question && <p className="mt-8 text-center text-sm text-paper-soft">{question}</p>}
      <p className={`m-auto whitespace-pre-wrap break-words text-center font-serif font-bold ${text.length > 120 ? "text-xl" : "text-3xl sm:text-4xl"}`}>{text}</p>
    </section>
  );
}
