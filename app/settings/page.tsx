"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import ThemeToggle from "@/components/ThemeToggle";
import { setProfile } from "@/lib/actions";
import { signOutUser, useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";

/* /settings: your name, how many new cards a day, the theme, keyboard shortcuts and signing out */
export default function Settings() {
  const { profile } = useApp();
  const auth = useAuth();
  const [name, setName] = useState(profile.name);
  const [dailyNew, setDailyNew] = useState(profile.dailyNew);
  const [saved, setSaved] = useState(false);
  useEffect(() => setName(profile.name), [profile.name]);
  useEffect(() => setDailyNew(profile.dailyNew), [profile.dailyNew]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setProfile({ name, dailyNew });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="space-y-5 rounded-2xl border border-line bg-panel p-5"
      >
        <label className="block text-sm font-semibold">
          Your name
          <input required maxLength={30} value={name} onChange={(e) => setName(e.target.value)} className="field mt-1 font-normal" />
        </label>
        <div>
          <label htmlFor="daily-new" className="text-sm font-semibold">
            New cards a day: <span className="text-indigo">{dailyNew}</span>
          </label>
          <input id="daily-new" type="range" min={0} max={100} step={5} value={dailyNew} onChange={(e) => setDailyNew(Number(e.target.value))} className="mt-2 w-full accent-indigo" />
          <p className="mt-1 text-sm text-ink-soft">
            How many cards you&apos;ve never studied are added to each day&apos;s session. 20 is about 10 to 15 minutes a day once reviews build up. Set it to 0 to only review.
          </p>
        </div>
        <button type="submit" className="btn">
          {saved ? "Saved" : "Save"}
        </button>
      </form>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-serif text-xl font-bold">Appearance</h2>
        <p className="mt-2 flex items-center gap-2 text-ink-soft">
          Light or dark: <ThemeToggle />
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-serif text-xl font-bold">Keyboard shortcuts</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {[
            ["Space", "Show the answer"],
            ["1 2 3 4", "Again, Hard, Good, Easy"],
            ["U", "Undo the last answer"],
            ["1 2 3 4 (quiz)", "Choose an answer; Enter for the next question"],
            ["Ctrl + Enter", "Add the card you're typing"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded border border-line bg-page px-2 py-0.5 font-mono text-xs">{k}</kbd>
              </dt>
              <dd className="text-ink-soft">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-serif text-xl font-bold">Account</h2>
        <p className="mt-1 text-sm text-ink-soft">Signed in as {auth.status === "signedIn" ? auth.user.email : ""}</p>
        <button type="button" onClick={() => signOutUser()} className="btn-quiet mt-4">
          <Icon name="logout" />
          Sign out
        </button>
      </section>
    </div>
  );
}
