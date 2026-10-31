"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import SubjectDot from "@/components/SubjectDot";
import { buildQuiz, canChoose, checkTyped, type Question, type QuizMode } from "@/lib/quiz";
import { useApp } from "@/lib/store";
import { cardsIn } from "@/lib/tags";

/*
  /quiz: practice with a quick quiz. It doesn't change when your cards are due, so you can
  quiz yourself as often as you like, e.g. the night before a test.
  - Choose what to quiz (everything, a subject or a deck; a tag from the home screen's search),
    multiple choice or typing the answer, and how many questions.
  - Multiple choice: keys 1 to 4. Typing: Enter checks your answer, Enter again moves on.
  - At the end: your score, and the ones you missed, which you can quiz again straight away.
*/
export default function QuizPage() {
  return (
    <Suspense>
      <Quiz />
    </Suspense>
  );
}

type Answer = { question: Question; given: string; result: "right" | "close" | "wrong" };

function Quiz() {
  const params = useSearchParams();
  const { cards, decks, subjects } = useApp();
  const [scope, setScope] = useState(() => ({ deck: params.get("deck"), subject: params.get("subject"), tag: params.get("tag") }));
  const [mode, setMode] = useState<QuizMode>("choice");
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [typed, setTyped] = useState("");
  const [current, setCurrent] = useState<Answer | null>(null); // the answer just given, before "Next"
  const box = useRef<HTMLInputElement>(null);

  const pool = cardsIn(cards, decks, scope);
  const choiceOk = canChoose(pool);
  const quizMode: QuizMode = choiceOk ? mode : "typed";
  const deck = scope.deck ? decks.find((d) => d.id === scope.deck) : null;
  const subject = scope.subject ? subjects.find((s) => s.id === scope.subject) : null;
  const title = deck?.name ?? subject?.name ?? (scope.tag ? `#${scope.tag}` : "All your cards");
  const q = questions?.[answers.length] ?? null;

  function start(from = pool) {
    setQuestions(buildQuiz(from, count === 0 ? from.length : count, canChoose(from) ? quizMode : "typed"));
    setAnswers([]);
    setCurrent(null);
    setTyped("");
  }

  function give(given: string) {
    if (!q || current) return;
    const result = q.options.length ? (given === q.answer ? "right" : "wrong") : checkTyped(given, q.answer);
    setCurrent({ question: q, given, result });
  }

  function next() {
    if (!current) return;
    setAnswers((a) => [...a, current]);
    setCurrent(null);
    setTyped("");
  }

  // Keys: 1-4 choose, Enter moves on
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      if (current && e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (!current && q.options.length && ["1", "2", "3", "4"].includes(e.key)) {
        const option = q.options[Number(e.key) - 1];
        if (option) give(option);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (q && !q.options.length && !current) box.current?.focus();
  }, [q, current]);

  // ---------- Setting up ----------
  if (!questions) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Quiz yourself</h1>
        <p className="mt-2 text-ink-soft">Quick practice that doesn&apos;t change when your cards are due. Great for the night before a test.</p>

        <div className="mt-6 space-y-5 rounded-2xl border border-line bg-panel p-5">
          <label className="block text-sm font-semibold">
            What to quiz
            <select
              value={scope.deck ? `deck:${scope.deck}` : scope.subject ? `subject:${scope.subject}` : scope.tag ? `tag:${scope.tag}` : "all"}
              onChange={(e) => {
                const [kind, id] = e.target.value.split(/:(.*)/);
                setScope({ deck: kind === "deck" ? id : null, subject: kind === "subject" ? id : null, tag: kind === "tag" ? id : null });
              }}
              className="field mt-1 font-normal"
            >
              <option value="all">All your cards ({cards.length})</option>
              {scope.tag && <option value={`tag:${scope.tag}`}>#{scope.tag}</option>}
              {subjects.length > 0 && (
                <optgroup label="Subjects">
                  {subjects.map((s) => (
                    <option key={s.id} value={`subject:${s.id}`}>
                      {s.name} ({cardsIn(cards, decks, { subject: s.id }).length})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Decks">
                {decks.map((d) => (
                  <option key={d.id} value={`deck:${d.id}`}>
                    {d.name} ({cards.filter((c) => c.deckId === d.id).length})
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <fieldset>
            <legend className="text-sm font-semibold">Type of quiz</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["choice", "Multiple choice", "Pick the right answer out of four"],
                  ["typed", "Type the answer", "Forgiving about capitals, accents and a small typo"],
                ] as [QuizMode, string, string][]
              ).map(([m, label, hint]) => (
                <label key={m} className={`cursor-pointer rounded-xl border p-3 ${quizMode === m ? "border-indigo bg-indigo-soft" : "border-line"} ${m === "choice" && !choiceOk ? "cursor-not-allowed opacity-50" : ""}`}>
                  <input type="radio" name="mode" value={m} checked={quizMode === m} disabled={m === "choice" && !choiceOk} onChange={() => setMode(m)} className="sr-only" />
                  <span className="block font-bold">{label}</span>
                  <span className="block text-sm text-ink-soft">{m === "choice" && !choiceOk ? "Needs at least 4 cards with different answers" : hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">How many questions</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[10, 20, 0].map((n) => (
                <label key={n} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold ${count === n ? "border-indigo bg-indigo text-on-indigo" : "border-line"}`}>
                  <input type="radio" name="count" checked={count === n} onChange={() => setCount(n)} className="sr-only" />
                  {n === 0 ? `All ${pool.length}` : n}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="button" onClick={() => start()} disabled={pool.length === 0} className="btn w-full py-3">
            <Icon name="play" />
            {pool.length === 0 ? "No cards here yet" : `Start the quiz on ${title}`}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Results ----------
  if (!q) {
    const right = answers.filter((a) => a.result !== "wrong").length;
    const missed = answers.filter((a) => a.result === "wrong");
    const score = answers.length ? Math.round((right / answers.length) * 100) : 0;
    const missedCards = cards.filter((c) => missed.some((m) => m.question.cardId === c.id));
    return (
      <div className="mx-auto max-w-2xl py-6">
        <p className="text-center font-serif text-6xl font-bold text-indigo">{score}%</p>
        <h1 className="mt-2 text-center font-serif text-2xl font-bold">
          {score === 100 ? "Perfect score!" : score >= 80 ? "Great work!" : score >= 50 ? "Getting there!" : "Keep practising!"}
        </h1>
        <p className="mt-1 text-center text-ink-soft">
          {right} of {answers.length} right on {title}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {missedCards.length > 0 && (
            <button type="button" onClick={() => start(missedCards)} className="btn">
              Quiz the {missedCards.length} I missed
            </button>
          )}
          <button type="button" onClick={() => start()} className="btn-quiet">
            <Icon name="refresh" />
            New quiz
          </button>
          <button type="button" onClick={() => setQuestions(null)} className="btn-quiet">
            Change quiz
          </button>
        </div>
        {missed.length > 0 && (
          <section aria-labelledby="missed-title" className="mt-8 rounded-2xl border border-line bg-panel p-5">
            <h2 id="missed-title" className="font-serif text-lg font-bold">
              The ones you missed
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {missed.map((m, i) => (
                <li key={i} className="py-3">
                  <p className="font-semibold">{m.question.prompt}</p>
                  <p className="text-sm">
                    <span className="text-good">{m.question.answer}</span>
                    {m.given && <span className="text-again"> · you said {m.given}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // ---------- A question ----------
  const card = cards.find((c) => c.id === q.cardId);
  const d = decks.find((x) => x.id === card?.deckId);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setQuestions(null)} className="tool" aria-label="Stop the quiz">
          <Icon name="close" />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answers.length}>
          <div className="h-full rounded-full bg-indigo transition-all" style={{ width: `${(answers.length / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-ink-soft">
          {answers.length + 1} of {questions.length}
        </span>
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
        <SubjectDot colour={d?.colour} />
        {d?.name}
      </p>
      <section className="index-card mt-3 flex min-h-56 flex-col px-6 pb-8 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-paper-soft">Question</p>
        <p className={`m-auto whitespace-pre-wrap break-words text-center font-serif font-bold ${q.prompt.length > 120 ? "text-xl" : "text-3xl"}`}>{q.prompt}</p>
      </section>

      {q.options.length > 0 ? (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const isAnswer = o === q.answer;
            const picked = current?.given === o;
            const tone = !current ? "border-line bg-panel hover:border-indigo" : isAnswer ? "border-good bg-good/15" : picked ? "border-again bg-again/15" : "border-line bg-panel opacity-60";
            return (
              <li key={o}>
                <button type="button" onClick={() => give(o)} disabled={!!current} className={`flex h-full w-full items-start gap-3 rounded-xl border-2 p-3 text-left font-semibold ${tone}`}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-page text-xs font-bold text-ink-soft">{i + 1}</span>
                  <span className="break-words">{o}</span>
                  {current && isAnswer && <Icon name="check" className="ml-auto h-5 w-5 shrink-0 text-good" label="Right answer" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (current) next();
            else give(typed);
          }}
          className="mt-5 flex gap-2"
        >
          <label htmlFor="answer" className="sr-only">
            Your answer
          </label>
          <input id="answer" ref={box} value={typed} onChange={(e) => setTyped(e.target.value)} readOnly={!!current} autoComplete="off" placeholder="Type your answer" className="field flex-1 py-3" />
          {!current && (
            <button type="submit" className="btn">
              Check
            </button>
          )}
        </form>
      )}

      {current && (
        <div aria-live="polite" className={`rise mt-4 flex flex-wrap items-center gap-3 rounded-xl border p-4 ${current.result === "wrong" ? "border-again/40 bg-again/10" : "border-good/40 bg-good/10"}`}>
          <p className="flex-1">
            <strong>{current.result === "right" ? "Right!" : current.result === "close" ? "Right, nearly spelt perfectly:" : "Not quite. The answer is:"}</strong>{" "}
            {current.result !== "right" && <span className="font-semibold">{q.answer}</span>}
          </p>
          <button type="button" onClick={next} autoFocus className="btn">
            {answers.length + 1 === questions.length ? "See my score" : "Next"}
          </button>
        </div>
      )}
      {!current && q.options.length > 0 && <p className="mt-3 hidden text-center text-xs text-ink-soft sm:block">Keys 1 to 4 choose an answer</p>}
    </div>
  );
}
