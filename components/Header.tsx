"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

/* The bar at the top: logo, the pages (on bigger screens), your streak, sync and the theme */
export default function Header() {
  const { profile, online, pending } = useApp();
  const path = usePathname();
  const now = Date.now();
  const days = streak(profile.days, now);
  const today = studiedToday(profile.days, now);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-2 flex items-center gap-2 font-serif text-xl font-bold" aria-label="Rememba: your decks">
          <Logo />
          Rememba
        </Link>
        <nav aria-label="Main" className="hidden gap-1 sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(path, n.href) ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${isActive(path, n.href) ? "bg-indigo-soft text-indigo" : "text-ink-soft hover:text-ink"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/progress"
            title={days ? `${days}-day streak${today ? "" : ". Study today to keep it going!"}` : "Study today to start a streak"}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${days ? (today ? "text-flame" : "text-ink-soft") : "text-ink-soft"}`}
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
