"use client";

import Icon from "@/components/Icon";
import { deckCounts } from "@/lib/queue";
import { forecast, lastDays, longestStreak, streak, studiedToday, totals } from "@/lib/stats";
import { useApp } from "@/lib/store";

/*
  /progress: your streak, the last 30 days of studying, what's coming up this week,
  and how well you know each deck. The charts are drawn with plain HTML, and each one
  has a table version for screen readers.
*/
export default function Progress() {
  const { profile, cards, decks } = useApp();
  const now = Date.now();
  const days = streak(profile.days, now);
  const today = studiedToday(profile.days, now);
  const all = totals(profile.days);
  const month = lastDays(profile.days, now, 30);
  const week = forecast(cards, now, 7);
  const max = Math.max(1, ...month.map((d) => d.reviewed));
  const maxDue = Math.max(1, ...week.map((d) => d.due));
  const best = longestStreak(profile.days);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Your progress</h1>

      <section aria-label="Summary" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon="flame" tone="text-flame" label="Streak" value={`${days} ${days === 1 ? "day" : "days"}`} hint={days ? (today ? "Studied today" : "Study today to keep it") : `Best: ${best} ${best === 1 ? "day" : "days"}`} />
        <Tile icon="check" tone="text-good" label="Answers right" value={all.accuracy === null ? "–" : `${all.accuracy}%`} hint={`${all.correct} of ${all.reviewed} answers`} />
        <Tile icon="chart" tone="text-indigo" label="Days studied" value={String(all.studyDays)} hint={`Best streak: ${best} ${best === 1 ? "day" : "days"}`} />
        <Tile icon="cards" tone="text-coral" label="Known well" value={String(deckCounts(cards, null, now).mature)} hint={`of ${cards.length} cards (a gap of 3+ weeks)`} />
      </section>

      {/* Last 30 days */}
      <section aria-labelledby="month-title" className="mt-8 rounded-2xl border border-line bg-panel p-5">
        <h2 id="month-title" className="font-serif text-xl font-bold">
          The last 30 days
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Cards studied each day. The darker part is what you got right.</p>
        <div aria-hidden="true" className="mt-5 flex h-40 items-end gap-[3px]">
          {month.map((d) => (
            <div key={d.key} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.reviewed} studied, ${d.correct} right`}>
              <div className="flex flex-col justify-end overflow-hidden rounded-t bg-indigo/30" style={{ height: `${(d.reviewed / max) * 100}%`, minHeight: d.reviewed ? 3 : 0 }}>
                <div className="bg-indigo" style={{ height: `${d.reviewed ? (d.correct / d.reviewed) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-2 flex justify-between text-xs text-ink-soft">
          <span>{month[0].label}</span>
          <span>Today</span>
        </div>
        <table className="sr-only">
          <caption>Cards studied in the last 30 days</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Studied</th>
              <th>Right</th>
            </tr>
          </thead>
          <tbody>
            {month.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td>
                <td>{d.reviewed}</td>
                <td>{d.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Coming up */}
        <section aria-labelledby="week-title" className="rounded-2xl border border-line bg-panel p-5">
          <h2 id="week-title" className="font-serif text-xl font-bold">
            Coming up this week
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Cards due each day (today includes anything overdue).</p>
          <ul className="mt-4 space-y-2">
            {week.map((d) => (
              <li key={d.key} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 font-semibold">{d.label}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <span className="block h-full rounded-full bg-coral" style={{ width: `${(d.due / maxDue) * 100}%` }} />
                </span>
                <span className="w-10 text-right font-bold">{d.due}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* By deck */}
        <section aria-labelledby="decks-title" className="rounded-2xl border border-line bg-panel p-5">
          <h2 id="decks-title" className="font-serif text-xl font-bold">
            By deck
          </h2>
          <p className="mt-1 flex flex-wrap gap-3 text-sm text-ink-soft">
            <Key className="bg-good" label="Known well" />
            <Key className="bg-indigo" label="Learning" />
            <Key className="bg-line" label="New" />
          </p>
          {decks.length === 0 ? (
            <p className="mt-4 text-ink-soft">No decks yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {decks.map((d) => {
                const c = deckCounts(cards, d.id, now);
                const learning = c.total - c.mature - c.fresh;
                const pct = (n: number) => (c.total ? (n / c.total) * 100 : 0);
                return (
                  <li key={d.id}>
                    <p className="flex justify-between text-sm">
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-ink-soft">
                        {c.mature} known · {learning} learning · {c.fresh} new
                      </span>
                    </p>
                    <span className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-line" aria-hidden="true">
                      <span className="bg-good" style={{ width: `${pct(c.mature)}%` }} />
                      <span className="bg-indigo" style={{ width: `${pct(learning)}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({ icon, tone, label, value, hint }: { icon: "flame" | "check" | "chart" | "cards"; tone: string; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <Icon name={icon} className={`h-5 w-5 ${tone}`} />
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
    </div>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} aria-hidden="true" />
      {label}
    </span>
  );
}
