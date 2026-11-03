import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Agenda } from "@/components/espace/Agenda";
import { currentAccount } from "@/lib/accounts/session";
import { dateInTimeZone } from "@/lib/agenda";

export const metadata: Metadata = { title: "Mon agenda", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const account = await currentAccount();
  if (!account) redirect("/espace-tatoueur/connexion");
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-6">
      <Agenda today={dateInTimeZone(new Date())} />
    </main>
  );
}
