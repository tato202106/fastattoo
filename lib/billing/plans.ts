import { PRO_FREE_MONTHS, PRO_PRICE_ANNUAL, PRO_PRICE_MONTHLY } from "../pro-offer";

/**
 * Forfaits tatoueur (Phase 6 — monétisation).
 * Les prix se règlent dans lib/pro-offer.ts. Montants en centimes ici.
 * Le forfait annuel est mis en avant ; le mensuel sert de point de comparaison.
 */
export type PlanId = "monthly" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  /** Prix facturé à chaque échéance (centimes). */
  amount: number;
  interval: "month" | "year";
  /** Libellé court de la périodicité. */
  per: string;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: { id: "monthly", name: "Mensuel", amount: Math.round(PRO_PRICE_MONTHLY * 100), interval: "month", per: "mois" },
  annual: { id: "annual", name: "Annuel", amount: Math.round(PRO_PRICE_ANNUAL * 100), interval: "year", per: "an" },
};

export const CURRENCY = "eur";

/** Période d'essai à la première souscription (offre de lancement). */
export const TRIAL_MONTHS = PRO_FREE_MONTHS;
export const TRIAL_DAYS = TRIAL_MONTHS * 30;
export const TRIAL_LABEL = TRIAL_MONTHS > 0 ? `${TRIAL_MONTHS} mois offert${TRIAL_MONTHS > 1 ? "s" : ""}` : "";

/** Date du premier prélèvement (fin de l'essai) à partir d'aujourd'hui. */
export function firstChargeDate(todayISO: string): string {
  if (TRIAL_MONTHS <= 0) return todayISO;
  const [y, m, d] = todayISO.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1 + TRIAL_MONTHS, d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Ce que le forfait inclut (fonctionnalités réellement disponibles dans l'app). */
export const PLAN_FEATURES = [
  "Profil visible sur la carte et dans la recherche",
  "Portfolio illimité, photos optimisées automatiquement",
  "Demandes de projet et messagerie avec les clients",
  "Calendrier et propositions de créneaux",
  "Statistiques de ton activité",
] as const;

export function isPlanId(v: unknown): v is PlanId {
  return v === "monthly" || v === "annual";
}

/** 17900 → « 179 € », 1990 → « 19,90 € ». */
export function formatPrice(cents: number): string {
  const euros = cents / 100;
  const text = Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace(".", ",");
  return `${text.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
}

/** Coût d'une année au forfait mensuel. */
export function yearlyCostOfMonthly(): number {
  return PLANS.monthly.amount * 12;
}

/** Économie annuelle du forfait annuel par rapport au mensuel. */
export function annualSavings() {
  const yearly = yearlyCostOfMonthly();
  const saved = yearly - PLANS.annual.amount;
  return {
    yearlyMonthlyCost: yearly,
    saved,
    percent: Math.round((saved / yearly) * 100),
    /** Nombre de mois « offerts » (arrondi à l'inférieur). */
    freeMonths: Math.floor(saved / PLANS.monthly.amount),
    /** Équivalent mensuel du forfait annuel. */
    perMonth: Math.round(PLANS.annual.amount / 12),
  };
}

/** Date de renouvellement à partir d'une date de début (ISO YYYY-MM-DD). */
export function renewalDate(startISO: string, plan: PlanId): string {
  const [y, m, d] = startISO.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  if (plan === "annual") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
