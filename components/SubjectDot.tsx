/* A small coloured dot with a subject's or deck's colour */
export default function SubjectDot({ colour, className = "h-2.5 w-2.5" }: { colour?: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: colour ?? "var(--color-line)" }} />;
}
