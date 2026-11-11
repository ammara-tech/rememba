"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { connect, disconnect, reportProblem, useApp } from "@/lib/store";
import Header from "@/components/Header";
import Icon from "@/components/Icon";
import DemoBanner from "@/components/DemoBanner";
import { seedDemoOnce } from "@/lib/demo";
import LoginScreen from "@/components/LoginScreen";
import Logo from "@/components/Logo";
import PhoneNav from "@/components/PhoneNav";

/*
  Wraps every page. Until someone is signed in, it shows the sign-in screen instead, so no
  page ever loads without an account. After sign-in it connects to that person's decks and
  cards (lib/store.ts). The real protection is in firestore.rules: even a changed copy of
  this code can only ever read the signed-in person's own cards.
*/

/** A first name from the sign-in: the Google name, or the start of the email address */
export function startingName(user: { displayName?: string | null; email?: string | null }) {
  const google = user.displayName?.trim().split(/\s+/)[0];
  if (google) return google.slice(0, 30);
  const local = user.email?.split("@")[0]?.split(/[._+-]/)[0] ?? "";
  return local ? (local[0].toUpperCase() + local.slice(1)).slice(0, 30) : "Me";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const app = useApp();
  const user = auth.status === "signedIn" ? auth.user : null;

  useEffect(() => {
    if (user) connect(user.uid, user.isAnonymous ? "Guest" : startingName(user));
    else disconnect();
  }, [user]);

  // "Try the demo": a guest with no decks yet gets the example decks, once (lib/demo.ts)
  const demo = Boolean(user?.isAnonymous);
  useEffect(() => {
    if (demo && user && app.ready && app.uid === user.uid) seedDemoOnce(user.uid, app.decks.length === 0);
  }, [demo, user, app.ready, app.uid, app.decks.length]);

  if (!firebaseConfigured) return <SetupNeeded />;
  // Until Firebase has checked, both screens are on the page and the saved hint picks one
  // (see lib/auth.ts). The sign-in screen stays in the same place, so nothing typed is lost.
  if (auth.status !== "signedIn")
    return (
      <>
        {auth.status === "loading" && (
          <div className="gate-splash">
            <Splash text="Opening Rememba…" />
          </div>
        )}
        <div className={auth.status === "loading" ? "gate-login" : undefined}>
          <LoginScreen />
        </div>
      </>
    );
  if (!app.ready) return <Splash text="Getting your cards…" />;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-panel focus:px-4 focus:py-2">
        Skip to content
      </a>
      {demo && <DemoBanner />}
      <Header />
      <main id="main" className="mx-auto max-w-3xl px-4 pb-32 pt-6 sm:px-6">
        {!app.online && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-panel px-4 py-3 text-sm">
            <Icon name="cloudOff" className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
            <span>
              <strong>You&apos;re offline.</strong> Keep studying: your answers are saved on this device and synced when you&apos;re back online.
            </span>
          </p>
        )}
        {app.problem && (
          <p role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-again/40 bg-panel px-4 py-3 text-sm">
            <span className="flex-1">{app.problem}</span>
            <button type="button" onClick={() => reportProblem(null)} aria-label="Close" className="text-ink-soft hover:text-ink">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </p>
        )}
        {children}
      </main>
      <PhoneNav />
    </>
  );
}

function Splash({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-ink-soft">
      <Logo className="h-14 w-14 motion-safe:animate-pulse" />
      <p role="status">{text}</p>
    </div>
  );
}

/* Shown only to a developer who hasn't added the Firebase settings yet */
function SetupNeeded() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <h1 className="font-serif text-3xl font-bold">Rememba needs its Firebase settings</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Add the four NEXT_PUBLIC_FIREBASE_ settings to .env.local on your computer and restart npm run dev, or to Vercel&apos;s
        Environment Variables and redeploy. The README explains where to find them.
      </p>
    </div>
  );
}
