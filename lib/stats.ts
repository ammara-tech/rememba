import { addDays, dayKey } from "@/lib/dates";
import { isDue } from "@/lib/queue";
import { isNew } from "@/lib/srs";
import type { Card, DayStats, Profile } from "@/lib/types";

/*
  Your progress: the streak, the last few weeks of studying, and what's coming up.
  Your history is kept as one small entry per day ("2026-10-31": reviewed 34, right 29, new 10),
  so these are quick to work out on the phone, even offline.
*/

export const KEEP_DAYS = 400; // a little over a year of history

/** Adds one answer to today's entry. Old days beyond KEEP_DAYS are dropped. */
export function recordReview(days: Profile["days"], now: number, correct: boolean, wasNew: boolean): Profile["days"] {
  const key = dayKey(now);
  const today = days[key] ?? { reviewed: 0, correct: 0, newCards: 0 };
  const next = { ...days, [key]: { reviewed: today.reviewed + 1, correct: today.correct + (correct ? 1 : 0), newCards: today.newCards + (wasNew ? 1 : 0) } };
  const keys = Object.keys(next).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete next[old];
  return next;
}

/**
 * Days in a row you've studied. Today counts if you've studied today; if you haven't yet,
 * the streak from yesterday is still alive until midnight.
 */
export function streak(days: Profile["days"], now: number) {
  const studied = (t: number) => (days[dayKey(t)]?.reviewed ?? 0) > 0;
  let day = studied(now) ? now : addDays(now, -1);
  let count = 0;
  while (studied(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

export function studiedToday(days: Profile["days"], now: number) {
  return (days[dayKey(now)]?.reviewed ?? 0) > 0;
}

export type DayBar = DayStats & { key: string; label: string };

/** The last `n` days, oldest first, for the bar chart */
export function lastDays(days: Profile["days"], now: number, n: number): DayBar[] {
  return Array.from({ length: n }, (_, i) => {
    const t = addDays(now, i - (n - 1));
    const key = dayKey(t);
    return {
      key,
      label: new Date(t).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" }),
      ...(days[key] ?? { reviewed: 0, correct: 0, newCards: 0 }),
    };
  });
}

/** How many cards fall due on each of the next `n` days (today includes anything overdue) */
export function forecast(cards: Card[], now: number, n: number) {
  const counts = Array.from({ length: n }, (_, i) => ({ key: dayKey(addDays(now, i)), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(addDays(now, i)).toLocaleDateString("en-ZA", { weekday: "short" }), due: 0 }));
  for (const c of cards) {
    if (isNew(c)) continue;
    if (isDue(c, now)) {
      counts[0].due++;
      continue;
    }
    const i = Math.round((addDays(c.due, 0) - addDays(now, 0)) / 86_400_000);
    if (i > 0 && i < n) counts[i].due++;
  }
  return counts;
}

/** Totals over all your history */
export function totals(days: Profile["days"]) {
  let reviewed = 0;
  let correct = 0;
  let studyDays = 0;
  for (const d of Object.values(days)) {
    reviewed += d.reviewed;
    correct += d.correct;
    if (d.reviewed > 0) studyDays++;
  }
  return { reviewed, correct, studyDays, accuracy: reviewed ? Math.round((correct / reviewed) * 100) : null };
}

/** Your longest run of study days ever */
export function longestStreak(days: Profile["days"]) {
  const studied = Object.keys(days)
    .filter((k) => days[k].reviewed > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of studied) {
    const [y, m, d] = k.split("-").map(Number);
    const t = new Date(y, m - 1, d).getTime();
    run = prev !== null && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}
