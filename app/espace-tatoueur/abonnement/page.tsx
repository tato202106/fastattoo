import { redirect } from "next/navigation";
import { PAYMENT_PATH } from "@/lib/billing/access";

/** Ancienne adresse : la page de paiement est désormais /devenir-tatoueur/paiement. */
export default function ArtistSubscribePage() {
  redirect(PAYMENT_PATH);
}
