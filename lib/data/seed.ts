/**
 * Données de démo (Phases 1–2). Générées de façon déterministe : mêmes
 * tatoueurs, mêmes portfolios, mêmes avis à chaque démarrage. Les créneaux
 * sont calculés à partir de la date du jour pour que les filtres de
 * disponibilité restent pertinents.
 */
import { artSpec } from "../art/generate";
import { CITIES } from "../cities";
import { addDays, todayISO } from "../dates";
import { createRng, hashString } from "../random";
import { BODY_ZONES, styleLabel } from "../styles";
import { slugify } from "../text";
import type { Artist, BodyZone, ImageAsset, PortfolioItem, Review, Slot, StyleSlug } from "../types";

interface ArtistSeed {
  name: string;
  title: "Tatoueuse" | "Tatoueur";
  city: string;
  studio: string;
  street: string;
  styles: StyleSlug[];
  priceFrom: number;
  bio: string;
}

const SEEDS: ArtistSeed[] = [
  { name: "Léa Ink", title: "Tatoueuse", city: "nantes", studio: "Atelier Lin", street: "rue Kervégan", styles: ["fine-line", "floral", "minimaliste"], priceFrom: 120, bio: "Je dessine des pièces fines et végétales, pensées pour vieillir joliment sur la peau. Chaque projet est unique, on le construit ensemble." },
  { name: "Malo Noir", title: "Tatoueur", city: "nantes", studio: "Encre de l'Erdre", street: "quai de Versailles", styles: ["blackwork", "geometrique"], priceFrom: 150, bio: "Blackwork dense et géométrie sacrée. J'aime les grandes pièces qui épousent l'anatomie." },
  { name: "Inès Petal", title: "Tatoueuse", city: "nantes", studio: "Maison Pivoine", street: "rue de la Paix", styles: ["floral", "aquarelle"], priceFrom: 110, bio: "Fleurs, couleurs douces et effets aquarelle. Spécialisée dans les recouvrements délicats." },
  { name: "Hugo Kaze", title: "Tatoueur", city: "nantes", studio: "Kaze Tattoo", street: "rue du Château", styles: ["japonais", "old-school"], priceFrom: 180, bio: "Formé à Osaka, je travaille le japonais traditionnel : vagues, koï, pivoines." },
  { name: "Clara Dot", title: "Tatoueuse", city: "paris", studio: "Point Final", street: "rue Oberkampf", styles: ["dotwork", "blackwork", "geometrique"], priceFrom: 140, bio: "Dotwork et mandalas, tout en patience. Mes pièces sont faites pour être regardées de près." },
  { name: "Yanis Real", title: "Tatoueur", city: "paris", studio: "Studio Lumen", street: "rue de Charonne", styles: ["realisme"], priceFrom: 220, bio: "Portraits et réalisme noir et gris. J'aime capturer un regard, une émotion." },
  { name: "Sofia Line", title: "Tatoueuse", city: "paris", studio: "Fine Studio", street: "rue des Martyrs", styles: ["fine-line", "minimaliste"], priceFrom: 90, bio: "Petites pièces fines, lettrages délicats et symboles minimalistes." },
  { name: "Max Traditional", title: "Tatoueur", city: "paris", studio: "Anchor & Rose", street: "rue Saint-Maur", styles: ["old-school"], priceFrom: 100, bio: "Old school pur jus : contours épais, couleurs franches, flashs à dispo." },
  { name: "Jeanne Botanica", title: "Tatoueuse", city: "paris", studio: "Herbier", street: "rue de Belleville", styles: ["floral", "fine-line"], priceFrom: 130, bio: "Herbiers sur peau : chaque plante est dessinée d'après nature." },
  { name: "Lucas Irezumi", title: "Tatoueur", city: "lyon", studio: "Nami Studio", street: "rue Mercière", styles: ["japonais"], priceFrom: 200, bio: "Grandes pièces japonaises, manchettes et dos. Sur rendez-vous uniquement." },
  { name: "Emma Aqua", title: "Tatoueuse", city: "lyon", studio: "Pigments", street: "montée de la Grande-Côte", styles: ["aquarelle", "floral"], priceFrom: 120, bio: "Aquarelle et couleurs vibrantes, j'adore les projets libres." },
  { name: "Théo Geo", title: "Tatoueur", city: "lyon", studio: "Axiome", street: "rue de la République", styles: ["geometrique", "blackwork", "dotwork"], priceFrom: 140, bio: "Géométrie précise, lignes parfaites, symétries calculées au millimètre." },
  { name: "Nina Mini", title: "Tatoueuse", city: "lyon", studio: "Petit Format", street: "rue Sainte-Catherine", styles: ["minimaliste", "fine-line"], priceFrom: 70, bio: "Mini tattoos du quotidien : symboles, dates, initiales. Rapide et soigné." },
  { name: "Gabriel Shade", title: "Tatoueur", city: "bordeaux", studio: "Clair-Obscur", street: "cours Victor Hugo", styles: ["realisme", "blackwork"], priceFrom: 210, bio: "Réalisme et clair-obscur. J'aime les projets ambitieux, en plusieurs séances." },
  { name: "Lina Flora", title: "Tatoueuse", city: "bordeaux", studio: "Les Jardins", street: "rue Notre-Dame", styles: ["floral", "fine-line", "aquarelle"], priceFrom: 110, bio: "Bouquets, branches et touches de couleur pastel." },
  { name: "Adam Sailor", title: "Tatoueur", city: "bordeaux", studio: "Port de la Lune Tattoo", street: "quai des Chartrons", styles: ["old-school", "japonais"], priceFrom: 100, bio: "Hirondelles, ancres et cœurs : la tradition marine revisitée." },
  { name: "Chloé Mandala", title: "Tatoueuse", city: "marseille", studio: "Soleil Noir", street: "cours Julien", styles: ["dotwork", "blackwork"], priceFrom: 130, bio: "Mandalas et ornements en dotwork, inspirés de la Méditerranée." },
  { name: "Rayan Ink", title: "Tatoueur", city: "marseille", studio: "Calanques Ink", street: "rue de la Loge", styles: ["realisme", "fine-line"], priceFrom: 160, bio: "Micro-réalisme et fine line : les détails comptent." },
  { name: "Manon Wave", title: "Tatoueuse", city: "marseille", studio: "Vague", street: "rue Sainte", styles: ["japonais", "aquarelle"], priceFrom: 150, bio: "Vagues, poissons et couleurs de mer. Japonais moderne." },
  { name: "Louis Black", title: "Tatoueur", city: "lille", studio: "Brique Noire", street: "rue de la Monnaie", styles: ["blackwork", "old-school"], priceFrom: 120, bio: "Blackwork brut et old school sombre. Projets custom uniquement." },
  { name: "Zoé Fine", title: "Tatoueuse", city: "lille", studio: "Ligne Claire", street: "rue Esquermoise", styles: ["fine-line", "minimaliste", "floral"], priceFrom: 90, bio: "Fine line douce, idéale pour un premier tatouage. Je prends le temps d'expliquer." },
  { name: "Nathan Real", title: "Tatoueur", city: "lille", studio: "Atelier Vérité", street: "rue de Béthune", styles: ["realisme"], priceFrom: 200, bio: "Réalisme animalier et portraits. Noir et gris, parfois une touche de couleur." },
  { name: "Alice Geo", title: "Tatoueuse", city: "rennes", studio: "Polygone", street: "rue Saint-Michel", styles: ["geometrique", "fine-line"], priceFrom: 110, bio: "Géométrie fine et compositions minimalistes." },
  { name: "Tom Old", title: "Tatoueur", city: "rennes", studio: "Le Vieux Port", street: "place des Lices", styles: ["old-school"], priceFrom: 90, bio: "Old school et néo-trad. Walk-in le samedi." },
  { name: "Juliette Aquarelle", title: "Tatoueuse", city: "rennes", studio: "Lavis", street: "rue de Saint-Malo", styles: ["aquarelle", "floral"], priceFrom: 120, bio: "Taches de couleur et traits fins, comme un carnet de croquis." },
  { name: "Paul Dot", title: "Tatoueur", city: "toulouse", studio: "Pointillé", street: "rue des Filatiers", styles: ["dotwork", "geometrique"], priceFrom: 120, bio: "Dotwork géométrique, du petit symbole à la manchette complète." },
  { name: "Camille Rose", title: "Tatoueuse", city: "toulouse", studio: "Rose Brique", street: "rue Pargaminières", styles: ["floral", "fine-line"], priceFrom: 100, bio: "Roses, pivoines et lignes fines. Dessins sur mesure." },
  { name: "Enzo Koi", title: "Tatoueur", city: "toulouse", studio: "Koi Garden", street: "rue du Taur", styles: ["japonais", "realisme"], priceFrom: 190, bio: "Japonais et réalisme : je mélange les deux pour des pièces fortes." },
  { name: "Sarah Minimal", title: "Tatoueuse", city: "nantes", studio: "Blanc Studio", street: "rue Crébillon", styles: ["minimaliste", "geometrique"], priceFrom: 80, bio: "Épuré, précis, discret. Le moins, mais le mieux." },
  { name: "Victor Old", title: "Tatoueur", city: "nantes", studio: "Le Navire", street: "boulevard Guist'hau", styles: ["old-school", "blackwork"], priceFrom: 110, bio: "Old school et blackwork, flashs maison toutes les semaines." },
];

const REVIEW_AUTHORS = ["Thomas", "Camille", "Julie", "Hugo", "Sarah", "Lucas", "Manon", "Antoine", "Chloé", "Mehdi", "Pauline", "Nicolas", "Laura", "Yasmine", "Romain", "Élise"];
const REVIEW_TEXTS = [
  "Super expérience, très à l'écoute et le résultat est encore plus beau que ce que j'imaginais.",
  "Travail d'une précision incroyable. Le studio est propre et l'ambiance très détendue.",
  "Premier tatouage et je ne pouvais pas rêver mieux. Merci pour la patience !",
  "Dessin sur mesure parfait, quelques retouches proposées sans soucis. Je reviendrai.",
  "Cicatrisation nickel, les conseils de soin étaient clairs. Ultra pro.",
  "Le trait est d'une finesse folle. Tout le monde me demande qui l'a fait.",
  "Très bon accueil, ponctuel et rassurant. Le prix annoncé a été respecté.",
  "Une vraie artiste, elle a su sublimer mon idée de départ.",
  "Rapide, efficace, et le rendu est magnifique. Je recommande à 100 %.",
  "Séance un peu longue mais le résultat en vaut largement la peine.",
];

function artImage(style: StyleSlug, seed: number, alt: string): ImageAsset {
  const spec = artSpec(style, seed);
  return {
    id: `${style}-${seed}`,
    base: `/media/art/${style}/${seed}`,
    width: spec.width,
    height: spec.height,
    color: spec.background,
    alt,
  };
}

function avatarImage(artistSeed: number, name: string): ImageAsset {
  return {
    id: `avatar-${artistSeed}`,
    base: `/media/avatar/${artistSeed}/${encodeURIComponent(initials(name))}`,
    width: 400,
    height: 400,
    color: "#2d2a32",
    alt: name,
  };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Prochains créneaux libres sur 30 jours. Stable pour un jour donné. */
export function generateSlots(artistId: string, today = todayISO(), busyness = 0.5): Slot[] {
  const slots: Slot[] = [];
  const offDay = hashString(artistId) % 7;
  for (let d = 0; d < 30; d++) {
    const date = addDays(today, d);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (weekday === 0 || weekday === offDay) continue;
    const rng = createRng(hashString(`${artistId}:${date}`));
    for (const time of ["10:00", "14:00", "17:00"]) {
      // Plus on avance dans le mois, plus il y a de place.
      if (rng.next() > busyness + d * 0.012) continue;
      slots.push({ date, time });
    }
  }
  return slots;
}

function buildArtist(seed: ArtistSeed, index: number): Artist {
  const rng = createRng(1000 + index * 97);
  const city = CITIES.find((c) => c.slug === seed.city)!;
  const id = `a${String(index + 1).padStart(3, "0")}`;
  const slug = slugify(seed.name);

  // Position du studio : autour du centre-ville (≈ 0,3 à 4 km).
  const dist = rng.range(0.3, 4) / 111;
  const angle = rng.range(0, Math.PI * 2);
  const lat = city.lat + dist * Math.sin(angle);
  const lng = city.lng + (dist * Math.cos(angle)) / Math.cos((city.lat * Math.PI) / 180);

  const portfolioCount = rng.int(10, 16);
  const portfolio: PortfolioItem[] = [];
  for (let i = 0; i < portfolioCount; i++) {
    const style = i < seed.styles.length ? seed.styles[i]! : rng.pick(seed.styles);
    const zone: BodyZone = rng.pick(BODY_ZONES).slug;
    const img = artImage(style, (index + 1) * 100 + i, `Tatouage ${styleLabel(style)} par ${seed.name}`);
    portfolio.push({ ...img, style, zone });
  }

  const reviewCount = rng.int(12, 160);
  const rating = Math.round(rng.range(4.3, 5) * 10) / 10;
  const reviews: Review[] = [];
  const today = todayISO();
  for (let r = 0; r < Math.min(8, reviewCount); r++) {
    const stars = rng.chance(0.82) ? 5 : 4;
    reviews.push({
      id: `${id}-r${r}`,
      author: rng.pick(REVIEW_AUTHORS),
      rating: stars,
      date: addDays(today, -rng.int(3 + r * 12, 12 + r * 20)),
      text: rng.pick(REVIEW_TEXTS),
      style: rng.pick(seed.styles),
    });
  }

  return {
    id,
    slug,
    name: seed.name,
    title: seed.title,
    city: city.name,
    citySlug: city.slug,
    studio: seed.studio,
    address: `${rng.int(2, 48)} ${seed.street}, ${city.name}`,
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    rating,
    reviewCount,
    verified: index % 4 !== 3,
    styles: seed.styles,
    priceFrom: seed.priceFrom,
    hourlyRate: seed.priceFrom + 20 + rng.int(0, 6) * 10,
    bio: seed.bio,
    avatar: avatarImage(index + 1, seed.name),
    cover: portfolio[0]!,
    portfolio,
    reviews,
    nextSlots: generateSlots(id, today, rng.range(0.15, 0.6)),
    instagram: slug.replace(/-/g, "."),
  };
}

let cache: { day: string; artists: Artist[] } | null = null;

/** Tous les tatoueurs de démo (recalculés une fois par jour pour les créneaux). */
export function getSeedArtists(): Artist[] {
  const day = todayISO();
  if (!cache || cache.day !== day) {
    cache = { day, artists: SEEDS.map(buildArtist) };
  }
  return cache.artists;
}

/** Identifiant du compte tatoueur de démo (Léa Ink). */
export const DEMO_ARTIST_ID = "a001";
