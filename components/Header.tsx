"use client";

import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { streak, studiedToday } from "@/lib/stats";
import { useApp } from "@/lib/store";

export const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Decks", icon: "cards" },
  { href: "/study", label: "Study", icon: "play" },
  { href: "/quiz", label: "Quiz", icon: "quiz" },
  { href: "/progress", label: "Progress", icon: "chart" },
  { href: "/settings", label: "Settings", icon: "cog" },
];

export function isActive(path: string, href: string) {
  return href === "/" ? path === "/" || path.startsWith("/decks") : path.startsWith(href);
}

/*
  A slim bar at the top that stays out of the way: the logo, your streak, whether your answers
  are saved, and the theme. The pages are in the dock at the bottom (components/PhoneNav.tsx).
*/
export default function Header() {
  const { profile, online, pending } = useApp();
  const now = Date.now();
  const days = streak(profile.days, now);
  const today = studiedToday(profile.days, now);

  return (
    <header className="sticky top-0 z-30 bg-page/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-3xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-bold" aria-label="Rememba: your decks">
          <Logo className="h-7 w-7" />
          Rememba
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/progress"
            title={days ? `${days}-day streak${today ? "" : ". Study today to keep it going!"}` : "Study today to start a streak"}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${days && today ? "text-flame" : "text-ink-soft"}`}
          >
            <Icon name="flame" className="h-5 w-5" />
            {days}
            <span className="sr-only">-day streak{days && !today ? ", study today to keep it" : ""}</span>
          </Link>
          <span role="status" title={!online ? "Offline: your answers are saved here and synced later" : pending ? "Saving" : "Saved"} className="tool pointer-events-none">
            <Icon name={online ? "cloud" : "cloudOff"} className={`h-5 w-5 ${!online ? "text-coral" : pending ? "opacity-50" : "text-good"}`} />
            <span className="sr-only">{!online ? "Offline" : pending ? "Saving" : "Saved"}</span>
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
