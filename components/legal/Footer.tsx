import Link from "next/link";

const LINKS = [
  { href: "/devenir-tatoueur", label: "Tatoueurs : rejoins Fastattoo" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgv", label: "CGV" },
];

/** Pied de page avec les liens légaux. */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-border pt-6 text-sm text-muted">
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-11 items-center hover:text-fg">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2">© {new Date().getFullYear()} Fastattoo</p>
    </footer>
  );
}
