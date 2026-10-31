import { addDays } from "@/lib/dates";
import type { Grade, Schedule } from "@/lib/types";

/*
  Spaced repetition: show each card just before you'd forget it.

  After you answer, you grade yourself: Again (forgot), Hard, Good or Easy. Each card keeps
  an "ease" number (2.5 to start). A Good answer multiplies the gap before the next review
  by the ease, so a card you keep getting right comes back after 1 day, then 3, then about 8,
  20, 50... Easy stretches the gap more and makes the card easier; Hard and Again shrink
  it and make the card harder, so tricky cards come back more often.

  This is based on SM-2, the algorithm behind SuperMemo and Anki, simplified:
  - a new card needs Good on day 1 and day 3 before the gaps start to grow
  - Again sends a card back to the start: you'll see it again in 10 minutes
  - review days start at midnight, so "due today" means any time today
*/

export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 5;
export const MAX_INTERVAL = 3650; // 10 years
export const RELEARN_MS = 10 * 60_000; // Again: back in 10 minutes

export function newSchedule(now: number): Schedule {
  return { reps: 0, interval: 0, ease: START_EASE, lapses: 0, due: now, lastReviewed: null };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clampInterval = (n: number) => Math.min(MAX_INTERVAL, Math.max(1, Math.round(n)));

/** The card's new schedule after you grade it */
export function schedule(card: Schedule, grade: Grade, now: number): Schedule {
  const base = { ...card, lastReviewed: now };

  if (grade === "again") {
    return {
      ...base,
      reps: 0,
      interval: 0,
      ease: card.reps > 0 || card.lapses > 0 ? round2(Math.max(MIN_EASE, card.ease - 0.2)) : card.ease,
      lapses: card.reps > 0 ? card.lapses + 1 : card.lapses,
      due: now + RELEARN_MS,
    };
  }

  let interval: number;
  let ease = card.ease;
  if (card.reps === 0) {
    // Learning (new, or relearning after Again)
    interval = grade === "easy" ? 4 : 1;
    if (grade === "easy") ease += 0.15;
  } else if (card.reps === 1) {
    interval = grade === "hard" ? 2 : grade === "good" ? 3 : 6;
    if (grade === "hard") ease -= 0.15;
    if (grade === "easy") ease += 0.15;
  } else if (grade === "hard") {
    interval = card.interval * 1.2;
    ease -= 0.15;
  } else if (grade === "good") {
    interval = card.interval * ease;
  } else {
    interval = card.interval * ease * 1.3;
    ease += 0.15;
  }

  // Never shorter than last time (unless you forgot it), so progress isn't undone by a Hard
  const days = clampInterval(card.reps > 0 ? Math.max(interval, grade === "hard" ? card.interval : card.interval + 1) : interval);
  return { ...base, reps: card.reps + 1, interval: days, ease: round2(Math.min(MAX_EASE, Math.max(MIN_EASE, ease))), due: addDays(now, days) };
}

/** What each grade button would mean, e.g. "10m", "1d", "3d", "2mo", "1y" */
export function gapLabel(card: Schedule, grade: Grade, now: number) {
  const next = schedule(card, grade, now);
  if (grade === "again") return "10m";
  const d = next.interval;
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${Math.round((d / 365) * 10) / 10}y`;
}

/** Cards you know well: a gap of 3 weeks or more */
export const MATURE_DAYS = 21;
export const isNew = (c: Schedule) => c.lastReviewed === null;
export const isMature = (c: Schedule) => c.interval >= MATURE_DAYS;
