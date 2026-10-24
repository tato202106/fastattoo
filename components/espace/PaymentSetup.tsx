import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import type { BillingDiagnostics } from "@/lib/billing/env";
import { formatPrice, PLANS } from "@/lib/billing/plans";
import type { StripeSetupCheck } from "@/lib/billing/stripe";

function Row({ ok, warn, title, children }: { ok: boolean; warn?: boolean; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-3">
      <span className={clsx("mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full", ok ? "bg-success/15 text-success" : warn ? "bg-warning/15 text-warning" : "bg-accent-soft text-accent")}>
        <Icon name={ok ? "check" : "close"} size={14} strokeWidth={3} />
      </span>
      <div className="min-w-0 text-[15px]">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-sm text-muted">{children}</div>}
      </div>
    </li>
  );
}

/** État du paiement en ligne (page /admin) : ce qui est configuré, ce qui manque. Aucune clé affichée. */
export function PaymentSetup({ diag, check }: { diag: BillingDiagnostics; check: StripeSetupCheck | null }) {
  const live = diag.secretKey.ok && check?.keyWorks && diag.database;
  return (
    <section aria-labelledby="paiement-en-ligne" className="rounded-2xl bg-surface p-4 shadow-card">
      <h2 id="paiement-en-ligne" className="flex items-center gap-2 text-lg font-semibold">
        <Icon name="euro" size={20} /> Paiement en ligne
        <span className={clsx("ml-auto rounded-full px-2.5 py-1 text-xs font-bold", live ? "bg-success/15 text-success" : "bg-accent text-accent-fg")}>{live ? "Activé" : "Désactivé"}</span>
      </h2>
      <ul className="mt-2 divide-y divide-border">
        <Row ok={diag.secretKey.ok && Boolean(check?.keyWorks)} title="Clé secrète Stripe">
          {!diag.secretKey.ok ? (
            <>
              {diag.secretKey.problem} Sur Vercel → Settings → Environment Variables, ajoute <code>STRIPE_SECRET_KEY</code> (clé <code>sk_live_…</code> ou clé restreinte <code>rk_live_…</code> de Stripe → Développeurs → Clés API) pour
              l&apos;environnement <strong>Production</strong>, puis <strong>redéploie</strong>.
            </>
          ) : check && !check.keyWorks ? (
            <>
              Stripe refuse la clé ({check.keyError}). Vérifie qu&apos;elle est complète et non révoquée
              {diag.secretKey.restricted && <>, et que la clé restreinte a bien les autorisations ci-dessous</>}.
            </>
          ) : (
            <>
              Trouvée dans <code>{diag.secretKey.variable}</code>, mode <strong>{diag.secretKey.mode === "live" ? "réel (live)" : "test"}</strong>
              {diag.secretKey.mode === "test" && " : les paiements ne sont pas encaissés pour de vrai"}
              {diag.secretKey.restricted && " (clé restreinte)"}.
            </>
          )}
          {diag.secretKey.restricted && (
            <p className="mt-1">
              Autorisations nécessaires sur la clé restreinte : <strong>Checkout Sessions</strong> (écriture), <strong>Subscriptions</strong> (écriture),{" "}
              <strong>Prices</strong> et <strong>Products</strong> (lecture), <strong>Customer portal</strong> (écriture).
            </p>
          )}
        </Row>
        <Row ok={diag.database} title="Base de données (comptes tatoueurs)">
          {diag.database ? "DATABASE_URL configurée." : "DATABASE_URL manquante : les comptes et le paiement obligatoire ne peuvent pas fonctionner."}
        </Row>
        {(["annual", "monthly"] as const).map((plan) => {
          const d = diag.prices[plan];
          const c = check?.plans[plan];
          const p = PLANS[plan];
          const label = `Forfait ${p.name.toLowerCase()} (${formatPrice(p.amount)} / ${p.per})`;
          if (!d.variable && c?.auto) {
            return (
              <Row key={plan} ok={c.found && c.matches !== false} warn={c.matches === false} title={label}>
                Retrouvé automatiquement dans ton compte Stripe{c.detail ? ` : ${c.detail}` : ""}.
              </Row>
            );
          }
          if (!d.variable) {
            return (
              <Row key={plan} ok warn title={label}>
                Aucun prix Stripe à {formatPrice(p.amount)} / {p.per} trouvé dans ton compte : le prix est défini automatiquement à chaque paiement. Pour utiliser ton produit Stripe, ajoute{" "}
                <code>{plan === "annual" ? "STRIPE_PRICE_ANNUAL" : "STRIPE_PRICE_MONTHLY"}</code> (identifiant <code>price_…</code>).
              </Row>
            );
          }
          if (d.problem) return <Row key={plan} ok={false} title={label}>{d.problem}</Row>;
          return (
            <Row key={plan} ok={c ? c.found && c.matches !== false : true} warn={c?.matches === false} title={label}>
              {c?.error ? `Introuvable chez Stripe (${c.error}).` : c?.detail ? `${c.detail}${c.matches === false ? " : ne correspond pas au prix affiché sur le site." : ""}` : `Variable ${d.variable}.`}
            </Row>
          );
        })}
        <Row ok={diag.webhook.ok} warn title="Webhook Stripe (renouvellements, impayés, résiliations)">
          {diag.webhook.ok ? (
            <>Secret trouvé dans <code>{diag.webhook.variable}</code>.</>
          ) : (
            <>
              Facultatif pour encaisser, conseillé pour la suite : Stripe → Développeurs → Webhooks → URL <code>/api/billing/webhook</code> (ou <code>/api/stripe/webhook</code>), puis ajoute{" "}
              <code>STRIPE_WEBHOOK_SECRET</code> (<code>whsec_…</code>).
            </>
          )}
        </Row>
      </ul>
    </section>
  );
}
