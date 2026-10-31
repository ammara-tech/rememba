"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { authErrorMessage, resetPassword, signInEmail, signInGoogle, signUpEmail } from "@/lib/auth";

/*
  The sign-in screen. On a laptop the ink-blue side shows three example cards
  (a question, its answer with the four grade buttons, and a streak), so people see
  what Rememba does before they sign up.
*/
export default function LoginScreen() {
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(() => (mode === "signIn" ? signInEmail(email, password) : signUpEmail(email, password)));
  }

  async function forgot() {
    if (!email.trim()) {
      setError("Type your email address first, then press \"Forgot your password?\" again.");
      return;
    }
    await run(async () => {
      await resetPassword(email);
      setNotice("If there's an account for that email, a reset link is on its way. Check your inbox.");
    });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#232869] p-12 text-white lg:flex lg:flex-col">
        <p className="flex items-center gap-2 font-serif text-2xl font-bold">
          <Logo className="h-9 w-9" />
          Rememba
        </p>
        <DemoList />
        <h1 className="relative mt-auto max-w-md font-serif text-5xl font-bold leading-[1.05] tracking-tight">Remember what you study.</h1>
        <p className="relative mt-5 max-w-md text-lg text-white/85">
          Flashcards that show each card just before you&apos;d forget it, so ten minutes a day is enough. Keep a streak, watch your progress, and study offline.
        </p>
      </aside>

      <section className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-serif text-xl font-bold lg:invisible">
            <Logo />
            Rememba
          </p>
          <ThemeToggle />
        </div>

        <div className="m-auto w-full max-w-sm py-10">
          <h2 className="font-serif text-3xl font-bold tracking-tight">{mode === "signIn" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-2 text-ink-soft">{mode === "signIn" ? "Sign in to keep studying." : "It's free, and takes a minute."}</p>

          <button type="button" disabled={busy} onClick={() => run(signInGoogle)} className="btn-quiet mt-8 w-full py-3">
            <Icon name="google" />
            Continue with Google
          </button>

          <p className="my-6 flex items-center gap-3 text-sm text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or</p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1 font-normal" />
            </label>
            <div>
              <label htmlFor="password" className="text-sm font-semibold">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-pressed={show}
                  className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-semibold text-indigo hover:bg-indigo-soft"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="text-sm font-semibold text-again">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm text-indigo">
                {notice}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn w-full py-3">
              {mode === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "signIn" && (
            <button type="button" onClick={forgot} className="mt-4 text-sm font-semibold text-indigo hover:underline">
              Forgot your password?
            </button>
          )}

          <p className="mt-8 text-ink-soft">
            {mode === "signIn" ? "New to Rememba? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signIn" ? "create" : "signIn");
                setError(null);
                setNotice(null);
              }}
              className="font-bold text-indigo hover:underline"
            >
              {mode === "signIn" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="mt-6 text-sm text-ink-soft">Only you can see your cards. They&apos;re stored in your own private space in Google&apos;s Firebase database.</p>
        </div>
      </section>
    </div>
  );
}

/*
  Three made-up index cards overlapping on the desk, as a preview on the sign-in screen.
  Each shows something Rememba does:
    back:   a question card (Afrikaans: "How are you?")
    middle: the answer, with the four grade buttons and how long until you'd see it again
    front:  your streak and the last week of studying
  Decorative only: screen readers skip it.
*/
const card = "rounded-2xl bg-[#fffdf7] p-5 text-[#1b1e33] shadow-[0_24px_50px_-18px_rgba(0,0,0,0.6)]";
const ruled = {
  backgroundImage:
    "linear-gradient(#e05a5a,#e05a5a), repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #cfe0f3 27px, #cfe0f3 28px)",
  backgroundSize: "100% 2px, 100% 100%",
  backgroundPosition: "0 2.9rem, 0 3rem",
  backgroundRepeat: "no-repeat",
};

function DemoList() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-8 h-[400px] w-full max-w-[520px] select-none">
      {/* The question */}
      <div className={`${card} absolute left-0 top-2 w-[250px] rotate-[-6deg]`} style={ruled}>
        <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-[#565b78]">
          <span>Afrikaans</span>
          <span>3 of 12</span>
        </p>
        <p className="mt-10 text-center font-serif text-2xl font-bold">How are you?</p>
        <p className="mt-10 rounded-lg bg-[#3b4cca] py-2 text-center text-sm font-bold text-white">Show answer</p>
      </div>

      {/* The answer and the grade buttons */}
      <div className={`${card} absolute left-[46%] top-[40px] w-[270px] rotate-[4deg]`} style={ruled}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#565b78]">Answer</p>
        <p className="mt-9 text-center font-serif text-2xl font-bold">Hoe gaan dit?</p>
        <div className="mt-8 grid grid-cols-4 gap-1.5 text-center text-xs font-bold text-white">
          {(
            [
              ["Again", "10m", "#c0392b"],
              ["Hard", "2d", "#a86412"],
              ["Good", "3d", "#23794a"],
              ["Easy", "6d", "#3b4cca"],
            ] as const
          ).map(([label, gap, colour]) => (
            <span key={label} className="rounded-lg py-1.5" style={{ background: colour }}>
              {label}
              <span className="block text-[10px] font-semibold opacity-85">{gap}</span>
            </span>
          ))}
        </div>
      </div>

      {/* The streak */}
      <div className={`${card} absolute bottom-0 left-[8%] w-[240px] rotate-[-2deg]`}>
        <p className="flex items-center gap-2 whitespace-nowrap font-serif text-xl font-bold text-[#e8781d]">
          <Icon name="flame" className="h-6 w-6" />
          12-day streak
        </p>
        <div className="mt-4 flex h-16 items-end gap-1.5">
          {[30, 45, 25, 60, 50, 70, 55].map((h, i) => (
            <span key={i} className="flex-1 rounded-t bg-[#3b4cca]" style={{ height: `${h}%`, opacity: i === 6 ? 1 : 0.55 }} />
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-[#565b78]">34 cards today · 91% right</p>
      </div>
    </div>
  );
}
