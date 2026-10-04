import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="Fastattoo, accueil">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-fg" />
        <path d="M10 22.5 18.5 9.5l3.5 2.2-8.5 13z" className="fill-bg" />
        <circle cx="22" cy="21.5" r="3" className="fill-accent" />
      </svg>
      <span className="font-display text-[22px] leading-none font-bold tracking-tight">fastattoo</span>
    </Link>
  );
}
