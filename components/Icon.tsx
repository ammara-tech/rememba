/* Small line icons (24 × 24, drawn with the current text colour). Decorative unless a label is given. */
const paths = {
  cards: "M8 4h11a1 1 0 0 1 1 1v12M5 7h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm3 5h5m-5 3h3",
  play: "M7 5.5v13a.5.5 0 0 0 .8.4l9.6-6.5a.5.5 0 0 0 0-.8L7.8 5.1a.5.5 0 0 0-.8.4Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H3",
  quiz: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  flame: "M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.4-2.3-5.6-3.6-7.6-.4 1.6-1.3 2.8-2.4 3.3.3-3.2-1-6-3.7-7.5.2 3.1-1.6 5.2-3 7.2A7.2 7.2 0 0 0 5.5 14.8C5.5 18.4 8.1 21 12 21Z",
  plus: "M12 5v14M5 12h14",
  check: "m5 12.5 4.5 4.5L19 7.5",
  pencil: "M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4",
  trash: "M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  close: "M6 6l12 12M18 6 6 18",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  cloudOff: "M3 3l18 18M8 7.5A6 6 0 0 1 18 9a4.5 4.5 0 0 1 2 8.3M16 18H7a4 4 0 0 1-1.6-7.7",
  cloud: "M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4",
  upload: "M12 16V4m0 0-4 4m4-4 4 4M5 20h14",
  back: "M15 18l-6-6 6-6",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  logout: "M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l4-4-4-4M14 12H4",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  google: "",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, className = "h-5 w-5", label }: { name: IconName; className?: string; label?: string }) {
  if (name === "google") {
    return (
      <svg viewBox="0 0 24 24" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={paths[name]} />
    </svg>
  );
}
