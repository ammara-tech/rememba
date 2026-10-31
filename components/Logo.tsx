/* Rememba's logo: two index cards, the front one with a red top line */
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="9" y="4" width="20" height="15" rx="3" fill="#3b4cca" transform="rotate(8 19 11.5)" />
      <rect x="3" y="11" width="22" height="16" rx="3" fill="#fffdf7" stroke="#1b1e33" strokeWidth="1.5" />
      <path d="M3.8 15.5h20.4" stroke="#e05a5a" strokeWidth="1.6" />
      <path d="M7 20h11M7 23.5h7" stroke="#9db4d6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
