"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { authErrorMessage, errorCode, finishRedirectSignIn, resetPassword, signInDemo, signInEmail, signInGoogle, signUpEmail } from "@/lib/auth";

/*
  The sign-in screen: one big index card under a night sky. The front asks a question
  ("What's the best way to remember what you study?") and answers it, the way Rememba works.
  Turning it over shows the sign-in form. It turns over by itself when there's something to see
  on the back (an error, a reset email, or creating an account), keyboard focus moves to the side
  that's showing, and the hidden side can't be reached (inert). With reduced motion it switches
  without turning. "Try the demo" sits under the card, or above it when opened from my portfolio.
*/
export default function LoginScreen() {
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; code: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const frontHeading = useRef<HTMLHeadingElement>(null);
  const backHeading = useRef<HTMLHeadingElement>(null);
  // Opened from a "Try the demo" link (…/?demo): the demo box goes to the top
  const [fromDemoLink, setFromDemoLink] = useState(false);
  useEffect(() => {
    setFromDemoLink(new URLSearchParams(window.location.search).has("demo"));
  }, []);

  const demoBox = (
    <div className="rounded-2xl border border-dashed border-indigo/50 bg-indigo-soft p-4">
      <p className="font-bold">Just looking?</p>
      <p className="mt-1 text-sm text-ink-soft">Try Rememba with two example decks. No account needed, and everything is deleted when you end the demo.</p>
      <button type="button" disabled={busy} onClick={() => run(signInDemo)} className="btn mt-3 w-full py-2.5">
        Try the demo
      </button>
    </div>
  );

  // If Google sign-in went the full-page way and failed, say why when the page comes back.
  useEffect(() => {
    finishRedirectSignIn().catch((e) => {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e);
    });
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e); // the code, for whoever is fixing it
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
      setError({ text: "Type your email address first, then press \"Forgot your password?\" again.", code: "" });
      return;
    }
    await run(async () => {
      await resetPassword(email);
      setNotice("If there's an account for that email, a reset link is on its way. Check your inbox.");
    });
  }

  // The sign-in card shows its back (the form) straight away when there's something to do there
  const showBack = flipped || Boolean(error) || Boolean(notice) || mode === "create";

  function turn(to: boolean) {
    setFlipped(to);
    // Move keyboard focus to the side that's now showing
    setTimeout(() => (to ? backHeading : frontHeading).current?.focus(), 50);
  }

  return (
    <div className="night flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <p className="flex items-center gap-2 font-serif text-xl font-bold">
          <Logo />
          Rememba
        </p>
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 pb-16">
        {fromDemoLink && <div className="mb-8">{demoBox}</div>}

        {/* One big index card that turns over: a question on the front, the sign-in form on the back */}
        <div className="flip">
          <div className={`flip-inner ${showBack ? "flipped" : ""}`}>
            {/* Front: the question */}
            <section inert={showBack} aria-hidden={showBack} className="index-card flex flex-col rounded-3xl p-7 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-paper-soft">Card 1 of 1 · Question</p>
              <h1 ref={frontHeading} tabIndex={-1} className="mt-10 font-serif text-3xl font-bold leading-tight outline-none sm:text-4xl">
                What&apos;s the best way to remember what you study?
              </h1>
              <p className="mt-6 text-lg text-paper-soft">
                Seeing each card again just before you&apos;d forget it. Rememba does the timing for you, so ten minutes a day is enough.
              </p>
              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => turn(true)} className="rounded-xl bg-[#1b1e33] px-4 py-3 font-bold text-white hover:opacity-90">
                  Turn over to sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    turn(true);
                  }}
                  className="rounded-xl border-2 border-[#1b1e33] px-4 py-3 font-bold text-[#1b1e33] hover:bg-[#1b1e33]/5"
                >
                  New? Make an account
                </button>
              </div>
            </section>

            {/* Back: the answer is the sign-in form */}
            <section inert={!showBack} aria-hidden={!showBack} className="flip-back rounded-3xl border border-line bg-panel p-7 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] sm:p-10">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink-soft">Answer</p>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signIn");
                    setError(null);
                    setNotice(null);
                    turn(false);
                  }}
                  className="text-sm font-semibold text-indigo hover:underline"
                >
                  Turn back
                </button>
              </div>
              <h1 ref={backHeading} tabIndex={-1} className="mt-4 font-serif text-3xl font-bold tracking-tight outline-none">
                {mode === "signIn" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-2 text-ink-soft">{mode === "signIn" ? "Sign in to keep studying." : "It's free, and takes a minute."}</p>
          <button type="button" disabled={busy} onClick={() => run(signInGoogle)} className="btn-quiet mt-6 w-full py-3">
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
              <div role="alert" className="text-sm font-semibold text-again">
                <p>{error.text}</p>
                {error.code && <p className="mt-1 text-xs font-normal opacity-70">Error code: {error.code}</p>}
              </div>
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
            </section>
          </div>
        </div>

        {!fromDemoLink && <div className="mt-10">{demoBox}</div>}
        <p className="mt-6 text-center text-sm text-ink-soft">Only you can see your cards, unless you share a deck with a link. They&apos;re stored in your own private space in Google&apos;s Firebase database.</p>
      </main>
    </div>
  );
}
