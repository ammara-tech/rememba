/*
  Days on this phone's clock. Rememba thinks in days ("due today", "a 5-day streak"),
  and a day starts at midnight where you are, not in London.
*/

export const DAY = 86_400_000;

export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Midnight a number of days after the day of `t` (setDate, so daylight saving can't shift it) */
export function addDays(t: number, days: number) {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** "2026-10-31", the key for a day in your study history */
export function dayKey(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days from the day of `a` to the day of `b` */
export function daysBetween(a: number, b: number) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}
