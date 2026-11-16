/**
 * Guides pour les futurs tatoués (pages /guides, référencement Google).
 * Contenu éditorial : chaque guide cite ses sources et renvoie vers la carte.
 */

export interface GuideSection {
  title: string;
  paragraphs?: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /** Meta description (≈ 150 caractères). */
  description: string;
  /** Texte court pour la liste des guides. */
  excerpt: string;
  updated: string; // YYYY-MM-DD
  intro: string;
  sections: GuideSection[];
  cta: { text: string; href: string; label: string };
  sources: { label: string; url: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "prix-tatouage",
    title: "Combien coûte un tatouage en France ?",
    description: "Prix d'un tatouage en France : tarif horaire, flash, journée complète et ce qui fait varier le prix. Les repères à connaître avant de demander un devis.",
    excerpt: "Tarif horaire, flash, journée : les repères de prix et ce qui fait varier le devis.",
    updated: "2026-11-16",
    intro:
      "Il n'y a pas de prix unique : chaque tatoueur fixe ses tarifs selon son expérience, son style et le temps passé. Voici les repères qui reviennent le plus souvent en France, pour savoir à quoi t'attendre avant de demander un devis.",
    sections: [
      {
        title: "Les repères de prix",
        list: [
          "Flash (motif déjà dessiné par le tatoueur) : environ 80 € à 250 € la pièce, selon la taille et l'emplacement.",
          "Grande pièce sur plusieurs séances (manchette, dos) : souvent facturée à l'heure, environ 80 € à 150 € de l'heure.",
          "Journée complète : environ 500 € à 1 200 €.",
        ],
        paragraphs: ["Ces chiffres sont des moyennes indicatives : seul le devis de ton tatoueur fait foi."],
      },
      {
        title: "Ce qui fait varier le prix",
        list: [
          "La taille et le niveau de détail : un portrait réaliste demande bien plus de temps qu'un petit motif au trait.",
          "L'emplacement : certaines zones (côtes, mains, cou) sont plus longues et plus délicates à tatouer.",
          "La couleur : remplir de grandes surfaces prend du temps.",
          "Le tatoueur : son expérience, sa réputation et sa ville.",
          "Le dessin : une création sur mesure demande du temps de préparation.",
        ],
      },
      {
        title: "L'acompte",
        paragraphs: [
          "Beaucoup de tatoueurs demandent un acompte pour bloquer ton rendez-vous et commencer le dessin. Il est en général déduit du prix final. Demande toujours les conditions (annulation, report) avant de payer.",
        ],
      },
      {
        title: "Ne choisis pas seulement sur le prix",
        paragraphs: [
          "Un tatouage, c'est pour la vie. L'Institut national de la consommation conseille de choisir son tatoueur avec soin, quitte à payer un peu plus pour un tatoueur reconnu, plutôt que de viser le prix le plus bas. Regarde son portfolio et les avis de ses clients.",
        ],
      },
    ],
    cta: { text: "Compare les portfolios et les avis des tatoueurs près de chez toi.", href: "/explorer", label: "Voir les tatoueurs sur la carte" },
    sources: [
      { label: "Superindep, « Devenir tatoueur auto-entrepreneur : le guide complet » (juin 2026)", url: "https://creation.superindep.fr/guides-pratiques/metiers/tatoueur-microentrepreneur/" },
      { label: "Institut national de la consommation, « Tatouages : quelles précautions prendre ? »", url: "https://www.inc-conso.fr/node/11137" },
    ],
  },
  {
    slug: "soins-tatouage",
    title: "Comment soigner son tatouage les premiers jours",
    description: "Soins d'un tatouage : les gestes des premiers jours, le soleil, les bains et quand consulter. Suis toujours en priorité les consignes de ton tatoueur.",
    excerpt: "Les gestes des premiers jours, le soleil, les bains et quand consulter un médecin.",
    updated: "2026-11-16",
    intro:
      "Les soins après le tatouage jouent beaucoup sur la qualité de la cicatrisation et sur le rendu final. Ton tatoueur doit te donner ses consignes par écrit : c'est une obligation en France. Suis-les en priorité. Voici les principes généraux.",
    sections: [
      {
        title: "Les premiers jours",
        list: [
          "Garde le pansement posé par ton tatoueur le temps qu'il t'indique.",
          "Lave-toi les mains avant de toucher ton tatouage.",
          "Nettoie doucement la zone avec un savon adapté (antiseptique ou doux, selon les consignes), puis sèche en tamponnant.",
          "Applique une fine couche de la crème conseillée : ni trop, ni trop peu.",
          "Évite les compresses et les tissus pelucheux qui collent à la peau.",
        ],
      },
      {
        title: "Pendant la cicatrisation",
        list: [
          "C'est normal que la peau pèle ou forme de petites croûtes après quelques jours : ne gratte pas et ne les arrache pas.",
          "Évite les bains pendant la cicatrisation : préfère la douche.",
          "Continue les soins une dizaine à une quinzaine de jours, ou tant que ton tatoueur le conseille.",
        ],
      },
      {
        title: "Le soleil",
        paragraphs: [
          "Le soleil peut faire pâlir les encres : évite de l'exposer pendant les premiers mois, puis protège ton tatouage avec une crème solaire à vie.",
        ],
      },
      {
        title: "Quand consulter",
        paragraphs: [
          "Pour toute question, contacte d'abord ton tatoueur. Si la zone devient de plus en plus rouge, chaude ou douloureuse, si elle suinte ou si tu as de la fièvre, consulte un médecin. Une réaction après un tatouage peut aussi être signalée sur signalement-sante.gouv.fr.",
        ],
      },
      {
        title: "Avant même le tatouage",
        paragraphs: [
          "Vérifie l'hygiène du studio : salle dédiée, matériel stérile à usage unique, gants. Un tatoueur doit avoir suivi une formation et déclaré son activité à l'Agence régionale de santé. Le jour J, dors bien, mange équilibré et évite l'alcool.",
        ],
      },
    ],
    cta: { text: "Trouve un tatoueur près de chez toi et pose-lui tes questions.", href: "/explorer", label: "Voir les tatoueurs sur la carte" },
    sources: [
      { label: "ARS Hauts-de-France, « Conseils et soins du tatouage » (annexes)", url: "https://www.hauts-de-france.ars.sante.fr/media/121725/download" },
      { label: "Justice.fr, « Tatouage : règles »", url: "https://www.justice.fr/fiche/tatouage-regles" },
      { label: "Institut national de la consommation, « Tatouages : quelles précautions prendre ? »", url: "https://www.inc-conso.fr/node/11137" },
      { label: "Service-public.fr, recommandations du Haut Conseil de la santé publique", url: "https://www.service-public.fr/particuliers/actualites/A14616" },
    ],
  },
  {
    slug: "zones-tatouage-douleur",
    title: "Tatouage : les zones qui font le moins (et le plus) mal",
    description: "Quelles zones font le moins mal pour un tatouage, lesquelles sont les plus sensibles, et nos conseils pour mieux vivre ta séance.",
    excerpt: "Les zones les plus douces, les plus sensibles, et comment mieux vivre ta séance.",
    updated: "2026-11-16",
    intro:
      "La douleur dépend de chacun, mais certaines zones reviennent toujours dans les plus supportables ou les plus sensibles. Si c'est ton premier tatouage, ça peut aider à choisir l'emplacement.",
    sections: [
      {
        title: "Les zones les plus supportables",
        list: ["L'avant-bras", "Le haut du bras (biceps) et l'épaule", "Le mollet", "L'extérieur de la cuisse"],
        paragraphs: ["Ce sont souvent les zones conseillées pour un premier tatouage."],
      },
      {
        title: "Les zones les plus sensibles",
        list: ["Les côtes", "L'intérieur du coude et l'arrière du genou", "L'aine", "Les tétons"],
      },
      {
        title: "Pour mieux vivre ta séance",
        list: [
          "Dors bien la veille et mange avant de venir.",
          "Pas d'alcool avant la séance.",
          "Prévois de quoi te distraire : musique, discussion avec ton tatoueur.",
          "Reste détendu·e et respire : le calme aide vraiment.",
          "N'hésite pas à demander une pause.",
        ],
      },
    ],
    cta: { text: "Parle de ton projet et de l'emplacement avec un tatoueur près de chez toi.", href: "/explorer", label: "Voir les tatoueurs sur la carte" },
    sources: [
      { label: "inkppl, « Est-ce que ça fait mal de se faire tatouer ? Tableau de douleur du tatouage »", url: "https://inkppl.com/fr/magazine/knowledge/est-ce-que-ca-fait-mal-de-se-faire-tatouer-tableau-de-douleur-du-tatouage" },
      { label: "Institut national de la consommation, « Tatouages : quelles précautions prendre ? »", url: "https://www.inc-conso.fr/node/11137" },
    ],
  },
  {
    slug: "styles-tatouage",
    title: "Fine line, blackwork, réalisme… quel style de tatouage choisir ?",
    description: "Les principaux styles de tatouage expliqués simplement : fine line, blackwork, réalisme, japonais, old school, floral, minimaliste, géométrique, aquarelle, dotwork.",
    excerpt: "Les 10 grands styles expliqués simplement, pour trouver celui qui te ressemble.",
    updated: "2026-11-16",
    intro:
      "Chaque tatoueur a ses styles de prédilection. Connaître les grands styles t'aide à décrire ton projet et à trouver l'artiste qui le réalisera le mieux.",
    sections: [
      { title: "Fine Line", paragraphs: ["Des traits très fins et délicats, souvent pour des motifs discrets : écritures, petites fleurs, lignes."] },
      { title: "Blackwork", paragraphs: ["Des aplats de noir et des motifs graphiques, très contrastés."] },
      { title: "Réalisme", paragraphs: ["Portraits, animaux, scènes : des ombrages travaillés pour un rendu proche de la photo. Demande du temps et un tatoueur spécialisé."] },
      { title: "Japonais", paragraphs: ["Vagues, carpes koï, dragons, fleurs de cerisier : la tradition japonaise, souvent sur de grandes surfaces."] },
      { title: "Old School", paragraphs: ["Contours épais et couleurs franches : hirondelles, ancres, roses, le style traditionnel américain."] },
      { title: "Floral", paragraphs: ["Fleurs et compositions végétales, du trait fin aux pièces très colorées."] },
      { title: "Minimaliste", paragraphs: ["De petits motifs épurés : idéal pour un premier tatouage."] },
      { title: "Géométrique", paragraphs: ["Formes, lignes et symétries précises."] },
      { title: "Aquarelle", paragraphs: ["Des couleurs diluées et des éclaboussures, comme une peinture."] },
      { title: "Dotwork", paragraphs: ["Des ombrages faits de milliers de points, souvent pour des mandalas."] },
      {
        title: "Comment choisir ?",
        list: [
          "Enregistre des images qui te plaisent et regarde ce qu'elles ont en commun.",
          "Choisis un tatoueur dont le portfolio montre déjà ce style.",
          "Décris ton idée, la zone et la taille : il saura te conseiller.",
        ],
      },
    ],
    cta: { text: "Filtre les tatoueurs par style sur la carte.", href: "/explorer", label: "Explorer les styles" },
    sources: [{ label: "Fastattoo, styles proposés par les tatoueurs inscrits", url: "https://www.fastattoo.com/explorer" }],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
