/*
  Adding many cards at once.

  1. Two columns, one card per line:
    Hello - Hallo
    Thank you = Dankie
    Please<Tab>Asseblief        (what you get when you copy two columns from Excel, Google Sheets or Quizlet)
    Good morning; Goeie môre
  The front and back are split at the first Tab, " - ", " = " or ";" on the line.

  2. From study notes (parseNotes): "Term: what it means" lines, bullets and numbered lists,
     and Q: / A: pairs. Headings are left out.

  3. A file (parseFile): an export from Anki (.txt) or Quizlet, or a spreadsheet saved as .csv.

  Lines that can't be split, or are empty, are skipped and counted, so nothing disappears silently.
*/

export const MAX_SIDE = 500; // characters on each side of a card
export const MAX_IMPORT = 500; // cards in one paste

export type Pair = { front: string; back: string };

const SEPARATORS = ["\t", " - ", " – ", " = ", ";"];

export function splitLine(line: string): Pair | null {
  const text = line.trim();
  if (!text) return null;
  for (const sep of SEPARATORS) {
    const at = text.indexOf(sep);
    if (at > 0) {
      const front = text.slice(0, at).trim().slice(0, MAX_SIDE);
      const back = text.slice(at + sep.length).trim().slice(0, MAX_SIDE);
      if (front && back) return { front, back };
    }
  }
  return null;
}

export function parseCards(text: string): { cards: Pair[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const cards: Pair[] = [];
  let skipped = 0;
  for (const line of lines) {
    const pair = splitLine(line);
    if (pair && cards.length < MAX_IMPORT) cards.push(pair);
    else skipped++;
  }
  return { cards, skipped };
}

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** Turns study notes into cards. See the comment at the top. */
export function parseNotes(text: string): { cards: Pair[]; skipped: number } {
  const lines = text.split(/\r?\n/).map((l) => l.replace(BULLET, "").trim()).filter(Boolean);
  const cards: Pair[] = [];
  let skipped = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#/.test(line) || /^[^:]{1,60}:$/.test(line)) continue; // a heading, not a card
    const q = line.match(/^q(?:uestion)?\s*[:.]\s*(.+)$/i);
    const a = lines[i + 1]?.match(/^a(?:nswer)?\s*[:.]\s*(.+)$/i);
    if (q && a) {
      cards.push({ front: q[1].slice(0, MAX_SIDE), back: a[1].slice(0, MAX_SIDE) });
      i++;
      continue;
    }
    if (q) {
      skipped++; // a question with no answer after it
      continue;
    }
    const at = line.search(/:\s|\s[–—-]\s/);
    if (at > 0 && at <= 80) {
      const front = line.slice(0, at).trim();
      const back = line.slice(at).replace(/^(:\s|\s[–—-]\s)/, "").trim();
      if (front && back) {
        cards.push({ front: front.slice(0, MAX_SIDE), back: back.slice(0, MAX_SIDE) });
        continue;
      }
    }
    skipped++;
  }
  return { cards: cards.slice(0, MAX_IMPORT), skipped };
}

/** Splits one CSV line into fields, understanding "quoted, fields" and "" inside quotes */
export function csvFields(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out;
}

/** Anki keeps formatting as HTML: line breaks become new lines, other tags are removed */
function stripHtml(text: string) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/** Reads an exported file: .csv as a spreadsheet, anything else as Tab-separated lines (Anki, Quizlet) */
export function parseFile(name: string, text: string): { cards: Pair[]; skipped: number } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  const csv = /\.csv$/i.test(name);
  const cards: Pair[] = [];
  let skipped = 0;
  lines.forEach((line, i) => {
    const fields = csv ? csvFields(line) : line.includes("\t") ? line.split("\t") : null;
    if (!fields) {
      const pair = splitLine(line); // a Quizlet export with " - " or similar
      if (pair && cards.length < MAX_IMPORT) cards.push(pair);
      else skipped++;
      return;
    }
    const [front = "", back = ""] = fields.map((f) => stripHtml(f));
    if (i === 0 && /^(front|term|question)$/i.test(front)) return; // a header row
    if (front && back && cards.length < MAX_IMPORT) cards.push({ front: front.slice(0, MAX_SIDE), back: back.slice(0, MAX_SIDE) });
    else skipped++;
  });
  return { cards, skipped };
}
