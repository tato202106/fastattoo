import type { Metadata } from "next";
import { AdminLogin, AdminPanel } from "@/components/espace/AdminPanel";
import { adminConfigured, isAdmin } from "@/lib/accounts/admin-session";
import { PaymentSetup } from "@/components/espace/PaymentSetup";
import { listAccounts } from "@/lib/accounts/db";
import { billingDiagnostics } from "@/lib/billing/env";
import { checkStripeSetup } from "@/lib/billing/stripe";

export const metadata: Metadata = { title: "Validation des profils", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Validation des profils tatoueurs (accès par ADMIN_PASSWORD). */
export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-10">
        <h1 className="pt-6 font-display text-[28px] font-bold">Validation des profils</h1>
        <p className="mt-2 text-muted">
          Pour activer cette page, ajoute sur Vercel la variable <code>ADMIN_PASSWORD</code> (au moins 8 caractères), puis redéploie.
        </p>
      </main>
    );
  }
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-md px-4 pt-safe pb-nav lg:pt-10">
        <AdminLogin />
      </main>
    );
  }
  let accounts: Awaited<ReturnType<typeof listAccounts>> = [];
  let error: string | null = null;
  try {
    accounts = await listAccounts();
  } catch (e) {
    error = (e as Error).message;
  }
  const diag = billingDiagnostics();
  const check = diag.secretKey.ok ? await checkStripeSetup().catch(() => null) : null;
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pt-safe pb-nav lg:pt-10">
      <div className="pt-4">
        <PaymentSetup diag={diag} check={check} />
      </div>
      <AdminPanel initial={accounts} error={error} />
    </main>
  );
}
