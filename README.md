# Rememba

**Flashcards that remember for you.** Rememba shows each card just before you'd forget it (spaced
repetition), so a few minutes a day is enough to remember what you study. Keep a streak, watch your
progress, and study with no signal.

**Live site:** [rememba-one.vercel.app](https://rememba-one.vercel.app)

Built with Next.js, TypeScript, Tailwind CSS and Firebase (Authentication and Cloud Firestore).

## What it does
- **Subjects with colours.** Group decks into subjects like Biology or Languages, each with its own colour.
  Show one subject at a time, and study or quiz a whole subject at once. Deleting a subject keeps its decks.
- **Decks and cards.** Make decks, add cards one at a time (Ctrl + Enter adds the next one), edit, and delete
  with Undo. Start a card again as new if you'd like to relearn it.
- **Tags and search.** Tag cards (like `exam` or `chapter 3`), then search every card in every deck, filter by
  tag, and study or quiz just those cards. Search ignores capitals and accents, so "more" finds "môre".
- **Add many at once, three ways:**
  - **Two columns:** one card per line, split by a Tab, " - ", " = " or ";". Copying two columns from Excel or
    Google Sheets works.
  - **From your notes:** paste study notes, and "Term: what it means" lines, bullet points, numbered lists and
    Q: / A: pairs become cards. Headings are left out.
  - **From a file:** an Anki export (.txt), a Quizlet export, or a spreadsheet saved as .csv.

  You see the cards before adding them, and lines that can't be split are counted and skipped, so nothing
  disappears silently.
- **Quiz mode.** Multiple choice (the wrong answers come from your other cards, so they look believable) or type
  the answer (forgiving about capitals, accents and a small typo, but it shows you the exact spelling). Quizzes
  don't change when cards are due, so you can practise as often as you like. At the end you see your score and
  the ones you missed, and can quiz just those again.
- **Spaced repetition.** After each answer you grade yourself: Again, Hard, Good or Easy. Each button shows
  when you'd see the card again (10m, 1d, 3d, 2mo...). Cards you know come back less and less often; cards you
  forget come back sooner.
- **Study sessions.** "Study now" goes through everything due in every deck, or study one deck. Cards you get
  wrong come round again before you finish. New cards are limited to a number a day (20 to start, changeable),
  so a big deck doesn't bury you on day one. Undo takes back your last answer.
- **Keyboard shortcuts.** Space shows the answer, 1 to 4 grade it, U undoes.
- **Streaks and progress.** Your streak (it stays alive until midnight if you studied yesterday), your best
  streak, the last 30 days of studying, how many you got right, what's due each day this week, and how well
  you know each deck.
- **Sample decks.** "Web development basics" and "Everyday Afrikaans", to try it straight away.
- **Works offline and installs like an app.** Study on the taxi or train; your answers sync when you're back
  online.
- **Sign in** with email and password (with a reset email) or Google. If the browser blocks Google's pop-up window, the whole page goes to Google instead. Sign-in errors say what went wrong in plain words, with Firebase's error code underneath. Light and dark themes.
- **Fast first load:** a new visitor gets the sign-in screen straight from the server, without waiting for Firebase to load. Someone who has signed in on the device before sees the loading screen instead while Firebase checks (a small hint saved on the device decides which).

## Plans
Rememba is free for students. If it grows, this is how it could pay for itself:

| Plan | For | What's in it |
|---|---|---|
| **Free** | Students | Everything above, for one person |
| **Pro** | Serious learners | An AI card maker (suggests cards from your notes or a PDF), pictures and audio on cards, sharing decks with friends, a study reminder each day |
| **Teams** | Businesses | Training decks for staff, with a dashboard showing who has studied what and how well they know it |

## Design
Index cards on a study desk: a cool paper-blue desk, white cards with a red top line and pale blue rules,
and ink-blue buttons. The card turns over to show the answer. The four grade buttons always have the same
colours (Again red, Hard amber, Good green, Easy blue), so you learn where they are. The cards stay white at
night, on a deep ink-blue desk. Animations switch off for people who've asked their device to reduce motion.

The sign-in screen shows three made-up cards (a question, its answer with the grade buttons, and a streak)
so visitors see what Rememba does before signing up. Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces)
for headings and cards, [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) for everything else.

## Tech stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Firebase Authentication, Cloud Firestore,
Vitest, Vercel.

## Project structure
```
app/              Pages: subjects and decks (/), one deck (/decks/[id]), studying (/study), quizzes (/quiz),
                  progress (/progress), settings (/settings), the app manifest, icons and the light/dark script
components/       The sign-in screen, the header and phone bar, the colour picker, the Undo bar, icons and the logo
lib/              The logic: spaced repetition (srs.ts), the study queue (queue.ts), streaks and charts
                  (stats.ts), adding many cards from columns, notes or files (importer.ts), quizzes
                  (quiz.ts), tags and search (tags.ts), the sample decks, the live store (store.ts) and
                  every change to the database (actions.ts)
public/sw.js      The service worker that lets the app open offline
firestore.rules   Who can read and change what (runs on Google's servers)
tests/            Unit tests (npm test)
```

## How the important parts work
**Spaced repetition** (`lib/srs.ts`). Each card keeps an "ease" (2.5 to start) and a gap in days. A new card
needs Good on day 1 and day 3; after that, Good multiplies the gap by the ease, so a card you keep getting
right comes back after about 1, 3, 8, 20 and 50 days. Easy stretches the gap more and makes the card easier;
Hard grows it less and makes it harder; Again sends the card back to the start (you'll see it in 10 minutes)
and makes it harder. Ease never drops below 1.3, and Hard never makes a gap shorter than last time. This is a
simplified version of SM-2, the algorithm behind SuperMemo and Anki.

**Days, not hours.** Reviews are due at midnight on their day, on your device's clock (`lib/dates.ts`), so
"due today" means any time today. Days are counted with `setDate`, so a daylight saving change can't shift a
due date, and the tests run in South African, UK and US time zones.

**The study queue** (`lib/queue.ts`). Due cards first, most overdue first, then new cards oldest first, up to
what's left of today's allowance. The queue is fixed when a session starts, so it doesn't change under you.
A card you get wrong goes to the back of the queue.

**Quizzes** (`lib/quiz.ts`). Questions are picked with a fair shuffle (Fisher–Yates). For multiple choice, the
three wrong answers are other cards' backs from the same quiz. A typed answer is "right" if it matches apart
from capitals, spaces and punctuation, and "close" (still counted right) if only accents or a small typo differ,
measured with edit distance (Levenshtein): 1 letter for answers up to 10 letters, 2 for longer ones, none for
very short ones like "Ja".

**Notes and files** (`lib/importer.ts`). Notes are read line by line: bullets and numbers are taken off,
headings are skipped, "Q:" followed by "A:" makes one card, and otherwise a line is split at its first ": " or
" – ". Files: a .csv is read as a spreadsheet (understanding "quoted, fields"), anything else as Tab-separated
lines like Anki and Quizlet export; Anki's `#` settings lines are skipped and its HTML is turned into text.

**Your history** (`lib/stats.ts`). Each answer adds to a small entry for that day (reviewed, right, new). The
streak, charts and totals are worked out from those entries on the device, even offline. About a year is kept.

**Saving.** `lib/store.ts` listens to your profile, decks and cards with Firestore's `onSnapshot`, and every
screen re-draws when they change. Firestore keeps a copy on the device (`persistentLocalCache`), so studying
works offline and syncs later; `public/sw.js` keeps a copy of the app itself. Big imports and deleting a deck
are written in batches of up to 450 changes, under Firestore's limit of 500.

**Security rules** (`firestore.rules`). Everything is under your own account: only you can read or change your
profile, subjects, decks and cards, and each one is checked for the right fields and sensible sizes (for example, card
sides up to 500 characters and an ease between 1.3 and 5).

## Tests
`npm test` runs the unit tests in `tests/` with Vitest: the spaced repetition maths (gaps, ease, forgetting,
the button labels), what's due and the order of the study queue, the new card limit, streaks (including one
that's still alive until midnight, and your best ever), the 30-day chart and the week's forecast, adding cards
from columns, notes, Anki and CSV files, quizzes (fair options, forgiving typed answers), tags, search and
what a subject covers, and the sample decks. A GitHub Action runs them on every push (`.github/workflows/tests.yml`).

## Setup (run it yourself)
1. **Firebase:** create a project at [console.firebase.google.com](https://console.firebase.google.com).
   - Authentication → Get started → turn on **Email/Password** and **Google**.
   - Firestore Database → Create database (production mode).
   - Firestore Database → **Rules**: paste in `firestore.rules` and press **Publish**.
   - Project settings → General → Your apps → add a **Web app** to get its settings.
2. **Settings:** copy `.env.example` to `.env.local` and fill in the four values from step 1.
3. **Run it:** `npm install`, then `npm run dev`, and open http://localhost:3000.
4. **Deploy on Vercel:** import the GitHub repo, add the same four settings under
   Settings → Environment Variables, and deploy. Then, in Firebase, add the Vercel address under
   Authentication → Settings → **Authorized domains**, so Google sign-in works there.

## Environment variables
Names only; the values are in `.env.local` (never committed) and in Vercel.

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | The web app's API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | The Firebase project's ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | The web app's ID |

These are public by design: they say which Firebase project to use, they don't unlock anything. What protects
your cards is `firestore.rules`.

## Known gaps
- **The security rules aren't in the automatic tests.** They'd need the Firebase emulator; they're tested by hand.
- **Text only.** Cards can't have pictures or audio yet.
- **No AI.** Cards come from what you type, paste or import; an AI card maker is an idea for the Pro plan.
- **No reminders.** Rememba can't nudge you to study; you have to remember to open it (we know: a memory app you have to remember to open).
- **One person per account.** Decks can't be shared yet (that's the Pro and Teams idea above).
- **Two devices at once:** answering the same card on two devices offline at the same time keeps the last
  answer that syncs.

## Use of AI
I built Rememba with Claude (by Anthropic) as my AI pair programmer:

1. **I decided what to build**: the idea, who it's for, the features and how it should look and behave.
2. **Claude wrote the code** for it and explained how it works.
3. **I set up Firebase and Vercel, added each change to my project**, ran it, tested it on my laptop and
   phone, committed it and deployed it, and reported anything that broke or looked wrong so we could fix it.
