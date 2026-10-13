import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL, legalValue } from "@/lib/legal";
import { PRO_FREE_MONTHS, PRO_PRICE_MONTHLY } from "@/lib/pro-offer";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function TermsPage() {
  const contact = legalValue(LEGAL.contactEmail);
  return (
    <LegalPage title="Conditions générales de vente">
      <section>
        <h2>1. Objet</h2>
        <p>
          Ces conditions régissent l&apos;abonnement proposé aux tatoueurs et tatoueuses professionnels (« l&apos;Abonné ») par{" "}
          {legalValue(LEGAL.publisherName)} (« Fastattoo »), SIRET {legalValue(LEGAL.siret)}, pour être présents sur www.fastattoo.com.
        </p>
      </section>
      <section>
        <h2>2. Service</h2>
        <p>
          L&apos;abonnement comprend un profil public (présentation, portfolio, styles, prix, adresse du studio), l&apos;affichage sur la carte et dans la
          recherche, la réception des demandes de projets, la messagerie et l&apos;agenda. Fastattoo ne garantit pas un nombre de demandes ou de
          clients. Fastattoo n&apos;intervient pas dans la relation entre l&apos;Abonné et ses clients : prix, rendez-vous, réalisation du tatouage et
          paiement du tatouage relèvent de la seule responsabilité de l&apos;Abonné.
        </p>
      </section>
      <section>
        <h2>3. Prix et offre de lancement</h2>
        <p>
          L&apos;abonnement coûte {PRO_PRICE_MONTHLY} € par mois ({LEGAL.vatMention}). {PRO_FREE_MONTHS > 1 ? `Les ${PRO_FREE_MONTHS} premiers mois sont offerts` : "Le premier mois est offert"} aux
          premiers inscrits : aucun paiement n&apos;est demandé pendant cette période, et l&apos;Abonné est prévenu par e-mail avant la fin de la période gratuite.
          Il ne devient payant que si l&apos;Abonné confirme vouloir continuer. Fastattoo peut modifier ses prix en prévenant l&apos;Abonné au moins 30
          jours à l&apos;avance ; l&apos;Abonné peut alors résilier sans frais.
        </p>
      </section>
      <section>
        <h2>4. Paiement</h2>
        <p>L&apos;abonnement est payable mensuellement, d&apos;avance. Une facture est envoyée par e-mail à chaque paiement.</p>
      </section>
      <section>
        <h2>5. Durée et résiliation</h2>
        <p>
          L&apos;abonnement est sans engagement. L&apos;Abonné peut le résilier à tout moment par e-mail à {contact} ; la résiliation prend effet à la
          fin du mois en cours, déjà payé. Fastattoo peut suspendre ou fermer un profil en cas de contenu illicite, de photos dont l&apos;Abonné
          n&apos;est pas l&apos;auteur, ou de manquement grave à ces conditions.
        </p>
      </section>
      <section>
        <h2>6. Contenus de l&apos;Abonné</h2>
        <p>
          L&apos;Abonné garantit être l&apos;auteur des photos publiées ou disposer des droits nécessaires, et avoir l&apos;accord de ses clients pour
          les montrer. Il autorise Fastattoo à les afficher sur le site pendant la durée de l&apos;abonnement. Il peut demander leur retrait à tout
          moment.
        </p>
      </section>
      <section>
        <h2>7. Données personnelles</h2>
        <p>
          Voir la <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </section>
      <section>
        <h2>8. Litiges</h2>
        <p>
          Ces conditions sont soumises au droit français. En cas de désaccord, les parties cherchent d&apos;abord une solution amiable en écrivant à{" "}
          {contact}. À défaut, les tribunaux compétents sont ceux du ressort du siège de l&apos;éditeur.
        </p>
      </section>
    </LegalPage>
  );
}
