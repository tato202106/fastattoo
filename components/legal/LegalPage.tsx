import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatLegalDate, LEGAL } from "@/lib/legal";

/** Mise en page commune des pages légales (lecture confortable sur téléphone). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-safe pb-nav lg:pt-10 lg:pb-16">
      <Link href="/" className="tap -ml-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted lg:hidden">
        <Icon name="back" size={18} /> Accueil
      </Link>
      <h1 className="mt-1 font-display text-[30px] leading-tight font-bold lg:mt-0">{title}</h1>
      <p className="mt-1 text-sm text-muted">Dernière mise à jour : {formatLegalDate(LEGAL.updatedAt)}</p>
      <div className="mt-6 space-y-6 text-[15px] leading-relaxed [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </main>
  );
}
