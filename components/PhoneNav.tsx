"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { NAV, isActive } from "@/components/Header";

/* The bar at the bottom on phones, where a thumb can reach it */
export default function PhoneNav() {
  const path = usePathname();
  if (path.startsWith("/study") || path.startsWith("/quiz")) return null; // studying and quizzes use the whole phone
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="grid grid-cols-5">
        {NAV.map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={isActive(path, n.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive(path, n.href) ? "text-indigo" : "text-ink-soft"}`}
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
