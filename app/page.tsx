"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ColourPicker from "@/components/ColourPicker";
import Icon from "@/components/Icon";
import SubjectDot from "@/components/SubjectDot";
import { addSample, createDeck, createSubject, deleteSubject, editSubject } from "@/lib/actions";
import { deckCounts, newLeftToday } from "@/lib/queue";
import { DECK_COLOURS, SAMPLES } from "@/lib/samples";
import { streak, studiedToday } from "@/lib/stats";
import { searchCards, tagCounts } from "@/lib/tags";
import { useApp } from "@/lib/store";
import type { Deck, Subject } from "@/lib/types";

/*
  The home screen: what's due today and your streak, a search across every card (with tags),
  and your decks grouped by subject. Each subject has its own colour, and choosing one
  shows only its decks, with Study and Quiz buttons for the whole subject.
*/

const NONE = "none"; // the "No subject" group

export default function Home() {
  const { profile, subjects, decks, cards } = useApp();
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(null); // a subject id, NONE, or null for all
  const [form, setForm] = useState<null | "deck" | "subject" | "editSubject">(null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const now = Date.now();

  // A tag link from a card (/?tag=exam) opens with that tag chosen
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tag");
    if (t) setTag(t);
  }, []);

  const all = deckCounts(cards, null, now);
  const newLeft = newLeftToday(profile, now);
  const toStudy = all.due + Math.min(newLeft, all.fresh);
  const days = streak(profile.days, now);
  const doneToday = studiedToday(profile.days, now);
  const hour = new Date(now).getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const subject = subjects.find((s) => s.id === chosen) ?? null;
  const tags = tagCounts(cards).slice(0, 12);
  const searching = query.trim() !== "" || tag !== null;
  const found = searching ? searchCards(cards, query, tag) : [];

  // Decks grouped by subject (subjects A to Z, then decks with no subject)
  const groups: { id: string; subject: Subject | null; decks: Deck[] }[] = [
    ...subjects.map((s) => ({ id: s.id, subject: s, decks: decks.filter((d) => d.subjectId === s.id) })),
    { id: NONE, subject: null, decks: decks.filter((d) => !subjects.some((s) => s.id === d.subjectId)) },
  ].filter((g) => (chosen ? g.id === chosen : g.decks.length > 0 || g.subject));

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {hello}, {profile.name || "there"}.
      </h1>

      {/* Today */}
      <section aria-label="Today" className="mt-6 grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-2xl bg-indigo p-6 text-on-indigo">
          <p className="text-sm font-semibold opacity-90">{toStudy ? "Ready to study" : decks.length ? "All done for today" : "Let's get started"}</p>
          <p className="mt-1 font-serif text-4xl font-bold">
            {toStudy} {toStudy === 1 ? "card" : "cards"}
          </p>
          <p className="mt-1 text-sm opacity-90">
            {all.due} due · {Math.min(newLeft, all.fresh)} new
          </p>
          {toStudy > 0 ? (
            <Link href="/study" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-on-indigo px-4 py-2.5 font-bold text-indigo hover:opacity-90">
              <Icon name="play" className="h-5 w-5" />
              Study now
            </Link>
          ) : (
            <p className="mt-4 text-sm opacity-90">{decks.length ? "Come back tomorrow, add more cards, or try a quiz." : "Make a deck, or try a sample deck below."}</p>
          )}
        </div>
        <Stat label="Streak" value={`${days} ${days === 1 ? "day" : "days"}`} hint={days ? (doneToday ? "You've studied today" : "Study today to keep it") : "Study today to start one"} icon="flame" />
        <Stat label="Cards" value={String(all.total)} hint={`${all.mature} known well`} icon="cards" />
      </section>

      {/* Search every card */}
      {cards.length > 0 && (
        <section aria-label="Search your cards" className="mt-8">
          <label className="relative block">
            <span className="sr-only">Search every card</span>
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every card, in every deck" className="field py-3 pl-11" />
          </label>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Tags">
              <span className="text-xs font-bold uppercase tracking-widest text-ink-soft">Tags</span>
              {tags.map(([t, n]) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold ${tag === t ? "border-indigo bg-indigo text-on-indigo" : "border-line bg-panel hover:border-indigo hover:text-indigo"}`}
                >
                  #{t} <span className="opacity-70">{n}</span>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className="mt-4 rounded-2xl border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 font-semibold" aria-live="polite">
                  {found.length} {found.length === 1 ? "card" : "cards"}
                  {tag ? ` tagged #${tag}` : ""}
                  {query.trim() ? ` matching "${query.trim()}"` : ""}
                </p>
                {tag && found.length > 0 && (
                  <>
                    <Link href={`/study?tag=${encodeURIComponent(tag)}`} className="btn px-3 py-1.5 text-sm">
                      Study these
                    </Link>
                    <Link href={`/quiz?tag=${encodeURIComponent(tag)}`} className="btn-quiet px-3 py-1.5 text-sm">
                      Quiz these
                    </Link>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setTag(null);
                  }}
                  className="tool"
                  aria-label="Clear the search"
                >
                  <Icon name="close" />
                </button>
              </div>
              <ul className="mt-2 max-h-80 divide-y divide-line overflow-auto">
                {found.slice(0, 100).map((c) => {
                  const d = decks.find((x) => x.id === c.deckId);
                  return (
                    <li key={c.id}>
                      <Link href={`/decks/${c.deckId}`} className="grid gap-1 py-2.5 hover:text-indigo sm:grid-cols-[1fr_1fr_auto] sm:gap-4">
                        <span className="break-words font-semibold">{c.front}</span>
                        <span className="break-words text-ink-soft">{c.back}</span>
                        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                          <SubjectDot colour={d?.colour} />
                          {d?.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Subjects and decks */}
      <section aria-labelledby="decks-title" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="decks-title" className="font-serif text-2xl font-bold">
            Subjects and decks
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setForm(form === "subject" ? null : "subject")} className="btn-quiet">
              <Icon name="plus" className="h-4 w-4" />
              Subject
            </button>
            <button type="button" onClick={() => setForm(form === "deck" ? null : "deck")} className="btn">
              <Icon name="plus" />
              New deck
            </button>
          </div>
        </div>

        {/* Subject filter */}
        {subjects.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Show a subject">
            <Chip active={chosen === null} onClick={() => setChosen(null)} label="All" count={decks.length} />
            {subjects.map((s) => (
              <Chip key={s.id} active={chosen === s.id} onClick={() => setChosen(s.id)} label={s.name} colour={s.colour} count={decks.filter((d) => d.subjectId === s.id).length} />
            ))}
            {decks.some((d) => !subjects.some((s) => s.id === d.subjectId)) && (
              <Chip active={chosen === NONE} onClick={() => setChosen(NONE)} label="No subject" count={decks.filter((d) => !subjects.some((s) => s.id === d.subjectId)).length} />
            )}
          </div>
        )}

        {form === "subject" && (
          <SubjectForm
            title="New subject"
            onSave={(name, colour) => {
              setChosen(createSubject(name, colour));
              setForm(null);
            }}
            onCancel={() => setForm(null)}
          />
        )}
        {form === "editSubject" && subject && (
          <SubjectForm
            title={`Edit ${subject.name}`}
            name={subject.name}
            colour={subject.colour}
            onSave={(name, colour) => {
              editSubject(subject, name, colour);
              setForm(null);
            }}
            onDelete={() => {
              deleteSubject(subject);
              setChosen(null);
              setForm(null);
            }}
            onCancel={() => setForm(null)}
          />
        )}
        {form === "deck" && (
          <DeckForm
            subjects={subjects}
            subjectId={subject?.id ?? ""}
            onSave={(name, subjectId) => {
              const id = createDeck(name, undefined, subjectId);
              setForm(null);
              router.push(`/decks/${id}`);
            }}
            onCancel={() => setForm(null)}
          />
        )}

        {decks.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-line p-6">
            <p className="font-serif text-xl font-bold">No decks yet</p>
            <p className="mt-1 text-ink-soft">Add a subject (like Biology or Maths) and a deck, or start with a sample deck:</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SAMPLES.map((s) => (
                <button key={s.name} type="button" onClick={() => router.push(`/decks/${addSample(s)}`)} className="rounded-xl border border-line bg-panel p-4 text-left hover:border-indigo">
                  <span className="block h-1.5 w-10 rounded-full" style={{ background: s.colour }} />
                  <span className="mt-2 block font-bold">{s.name}</span>
                  <span className="block text-sm text-ink-soft">{s.description}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          groups.map((g) => {
            const ids = g.decks.map((d) => d.id);
            const inGroup = cards.filter((c) => ids.includes(c.deckId));
            const counts = deckCounts(inGroup, null, now);
            return (
              <section key={g.id} aria-label={g.subject?.name ?? "No subject"} className="mt-6">
                {(subjects.length > 0 || chosen) && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2" style={g.subject ? { borderColor: g.subject.colour } : undefined}>
                    <SubjectDot colour={g.subject?.colour} className="h-3.5 w-3.5" />
                    <h3 className="font-serif text-lg font-bold">{g.subject?.name ?? "No subject"}</h3>
                    <span className="text-sm text-ink-soft">
                      {g.decks.length} {g.decks.length === 1 ? "deck" : "decks"} · {counts.due} due
                    </span>
                    <span className="ml-auto flex flex-wrap gap-1.5">
                      {g.subject && counts.due + Math.min(newLeft, counts.fresh) > 0 && (
                        <Link href={`/study?subject=${g.subject.id}`} className="btn px-3 py-1 text-sm">
                          Study
                        </Link>
                      )}
                      {g.subject && counts.total > 0 && (
                        <Link href={`/quiz?subject=${g.subject.id}`} className="btn-quiet px-3 py-1 text-sm">
                          Quiz
                        </Link>
                      )}
                      {g.subject && (
                        <button
                          type="button"
                          onClick={() => {
                            setChosen(g.id);
                            setForm("editSubject");
                          }}
                          className="tool h-8 min-w-8"
                          aria-label={`Edit the subject ${g.subject.name}`}
                        >
                          <Icon name="pencil" className="h-4 w-4" />
                        </button>
                      )}
                    </span>
                  </div>
                )}
                {g.decks.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">No decks in this subject yet. Use &quot;New deck&quot; to add one.</p>
                ) : (
                  <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {g.decks.map((d) => (
                      <DeckCard key={d.id} deck={d} now={now} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </section>
    </div>
  );
}

function DeckCard({ deck, now }: { deck: Deck; now: number }) {
  const { cards } = useApp();
  const c = deckCounts(cards, deck.id, now);
  const known = c.total ? Math.round((c.mature / c.total) * 100) : 0;
  return (
    <li>
      <Link href={`/decks/${deck.id}`} className="group block h-full rounded-2xl border border-line border-l-4 bg-panel p-5 transition hover:-translate-y-0.5 hover:border-indigo" style={{ borderLeftColor: deck.colour }}>
        <span className="block font-serif text-xl font-bold group-hover:text-indigo">{deck.name}</span>
        <span className="mt-1 block text-sm text-ink-soft">
          {c.total} {c.total === 1 ? "card" : "cards"} · <strong className={c.due ? "text-coral" : ""}>{c.due} due</strong> · {c.fresh} new
        </span>
        <span className="mt-4 block h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <span className="block h-full rounded-full" style={{ width: `${known}%`, background: deck.colour }} />
        </span>
        <span className="mt-1 block text-xs text-ink-soft">{known}% known well</span>
      </Link>
    </li>
  );
}

function Chip({ active, onClick, label, colour, count }: { active: boolean; onClick: () => void; label: string; colour?: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${active ? "border-ink bg-ink text-page" : "border-line bg-panel hover:border-indigo"}`}
    >
      {colour && <SubjectDot colour={colour} />}
      {label}
      <span className="opacity-60">{count}</span>
    </button>
  );
}

function SubjectForm({
  title,
  name = "",
  colour = DECK_COLOURS[2],
  onSave,
  onDelete,
  onCancel,
}: {
  title: string;
  name?: string;
  colour?: string;
  onSave: (name: string, colour: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [n, setN] = useState(name);
  const [c, setC] = useState(colour);
  const [sure, setSure] = useState(false);
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSave(n, c);
      }}
      className="mt-4 space-y-4 rounded-2xl border border-line bg-panel p-5"
    >
      <h3 className="font-serif text-lg font-bold">{title}</h3>
      <label className="block text-sm font-semibold">
        Subject name
        <input autoFocus required maxLength={40} value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. Biology" className="field mt-1 font-normal" />
      </label>
      <ColourPicker name="subject-colour" value={c} onChange={setC} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn">
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn-quiet">
          Cancel
        </button>
        {onDelete &&
          (sure ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Its decks stay, with no subject.
              <button type="button" onClick={onDelete} className="btn px-3 py-2 !bg-again !text-white">
                Delete subject
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setSure(true)} className="btn-quiet ml-auto !text-again hover:!border-again">
              Delete subject
            </button>
          ))}
      </div>
    </form>
  );
}

function DeckForm({ subjects, subjectId, onSave, onCancel }: { subjects: Subject[]; subjectId: string; onSave: (name: string, subjectId: string) => void; onCancel: () => void }) {
  const [n, setN] = useState("");
  const [sub, setSub] = useState(subjectId);
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSave(n, sub);
      }}
      className="mt-4 grid gap-3 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-[2fr_1fr_auto_auto] sm:items-end"
    >
      <label className="text-sm font-semibold">
        Deck name
        <input autoFocus required maxLength={60} value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. Chapter 3: Plants" className="field mt-1 font-normal" />
      </label>
      <label className="text-sm font-semibold">
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
      <button type="submit" className="btn">
        Create
      </button>
      <button type="button" onClick={onCancel} className="btn-quiet">
        Cancel
      </button>
    </form>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: "flame" | "cards" }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <Icon name={icon} className={`h-5 w-5 ${icon === "flame" ? "text-flame" : "text-indigo"}`} />
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
    </div>
  );
}
