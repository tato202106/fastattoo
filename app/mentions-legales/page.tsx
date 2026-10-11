import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { HOSTING, LEGAL, legalValue } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site www.fastattoo.com est édité par {legalValue(LEGAL.publisherName)}, {legalValue(LEGAL.publisherStatus)}.
          <br />
          Adresse : {legalValue(LEGAL.publisherAddress)}
          <br />
          SIRET : {legalValue(LEGAL.siret)}
          <br />
          {LEGAL.vatMention}
          <br />
          Contact : {legalValue(LEGAL.contactEmail)}
        </p>
        <p className="mt-2">Directeur de la publication : {legalValue(LEGAL.publisherName)}.</p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>
          {HOSTING.name}, {HOSTING.address}. Site : <a href={HOSTING.website}>{HOSTING.website}</a>
        </p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          La structure du site, ses textes et son logo appartiennent à l&apos;éditeur. Les photos de tatouages affichées sur les profils restent la
          propriété des tatoueurs, qui ont autorisé leur publication sur Fastattoo. Toute reproduction sans accord est interdite.
        </p>
      </section>
      <section>
        <h2>Profils d&apos;exemple</h2>
        <p>
          Tant que le site est en phase de lancement, certains profils sont des exemples de démonstration, signalés par le badge « Profil exemple ».
          Ils ne correspondent pas à de vrais tatoueurs.
        </p>
      </section>
      <section>
        <h2>Fonds de carte</h2>
        <p>Cartes © OpenStreetMap contributors, © CARTO, © MapTiler.</p>
      </section>
    </LegalPage>
  );
}
