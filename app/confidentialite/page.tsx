import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL, legalValue } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  const contact = legalValue(LEGAL.contactEmail);
  return (
    <LegalPage title="Politique de confidentialité">
      <section>
        <p>
          Cette page explique quelles données Fastattoo collecte, pourquoi, et comment exercer tes droits. Le responsable du traitement est{" "}
          {legalValue(LEGAL.publisherName)} ({contact}).
        </p>
      </section>
      <section>
        <h2>Données collectées</h2>
        <ul>
          <li>
            <strong>Inscription tatoueur</strong> : nom ou nom d&apos;artiste, studio, adresse, ville, e-mail, téléphone, Instagram, styles, prix
            minimum, message, ainsi que les photos de tatouages transmises ensuite pour le profil.
          </li>
          <li>
            <strong>Position</strong> : uniquement si tu l&apos;autorises, pour afficher les tatoueurs proches. Elle sert à la recherche et n&apos;est
            pas enregistrée.
          </li>
          <li>
            <strong>Données enregistrées sur ton appareil</strong> : favoris, demandes et préférences sont stockés dans ton navigateur (stockage local),
            pas sur nos serveurs. Le site n&apos;utilise ni cookie publicitaire ni outil de mesure d&apos;audience.
          </li>
        </ul>
      </section>
      <section>
        <h2>Pourquoi</h2>
        <ul>
          <li>Créer et afficher le profil des tatoueurs inscrits, et les recontacter (base légale : consentement donné dans le formulaire).</li>
          <li>Gérer l&apos;abonnement tatoueur et sa facturation (base légale : exécution du contrat et obligations comptables).</li>
          <li>Permettre aux visiteurs de trouver un tatoueur près de chez eux.</li>
        </ul>
      </section>
      <section>
        <h2>Durée de conservation</h2>
        <ul>
          <li>Inscription non suivie d&apos;un profil : 12 mois après le dernier échange, puis suppression.</li>
          <li>Profil tatoueur : tant que le compte est actif, puis suppression dans les 3 mois suivant sa fermeture.</li>
          <li>Factures : 10 ans, comme l&apos;exige la loi.</li>
        </ul>
      </section>
      <section>
        <h2>Prestataires</h2>
        <p>Les données sont traitées par des prestataires techniques, uniquement pour faire fonctionner le service :</p>
        <ul>
          <li>Vercel (hébergement du site, États-Unis)</li>
          <li>Neon (base de données, serveurs en Union européenne)</li>
          <li>Resend (envoi des e-mails, États-Unis)</li>
          <li>MapTiler et CARTO (fonds de carte)</li>
        </ul>
        <p className="mt-2">
          Les transferts hors de l&apos;Union européenne sont encadrés par les garanties prévues par le RGPD (clauses contractuelles types ou Data
          Privacy Framework). Aucune donnée n&apos;est vendue.
        </p>
      </section>
      <section>
        <h2>Tes droits</h2>
        <p>
          Tu peux à tout moment demander l&apos;accès à tes données, leur correction, leur suppression, retirer ton consentement ou t&apos;opposer à leur
          utilisation, en écrivant à {contact}. Réponse sous un mois. Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la CNIL (
          <a href="https://www.cnil.fr">cnil.fr</a>).
        </p>
      </section>
      <p>
        Voir aussi les <Link href="/mentions-legales">mentions légales</Link>.
      </p>
    </LegalPage>
  );
}
