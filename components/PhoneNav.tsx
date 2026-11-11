"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { NAV, isActive } from "@/components/Header";

/*
  The dock: the five pages in a small floating bar at the bottom, on phones and laptops, where a
  thumb (or a glance) can reach it. It hides while you study or take a quiz, so nothing else is
  on the screen but the card.
*/
export default function PhoneNav() {
  const path = usePathname();
  if (path.startsWith("/study") || path.startsWith("/quiz")) return null; // focus: studying and quizzes use the whole screen
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-2xl border border-line bg-panel/90 p-1 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)] backdrop-blur">
      <ul className="grid grid-cols-5">
        {NAV.map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={isActive(path, n.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold ${isActive(path, n.href) ? "bg-indigo-soft text-indigo" : "text-ink-soft hover:text-ink"}`}
            >
              <Icon name={n.icon} className="h-6 w-6" />
              {n.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
