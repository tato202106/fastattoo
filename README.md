# Fastattoo

Marketplace **mobile-first** qui met en relation des clients et des tatoueurs.

> Je veux un tatoueur → je vois ceux autour de moi → je regarde leurs tatouages → je choisis → je contacte/réserve.

Le mobile (375–430 px) est la version de référence ; le desktop en est une adaptation.
Cahier des charges : [`docs/SPEC.md`](docs/SPEC.md) · décisions de conception : [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Lancer le projet

Prérequis : Node.js ≥ 20.9.

```bash
npm install          # copie aussi le worker MapLibre dans public/vendor (postinstall)
npm run dev          # http://localhost:3000
```

Production :

```bash
npm run build && npm run start
```

### Comptes de démo

Il n'y a pas encore de backend utilisateur : la connexion (`/connexion`) ne demande qu'un prénom.

- **Client** : « Thomas » — demandes en cours, proposition de créneau à accepter, rendez-vous passé à noter.
- **Tatoueur·se** : connecte au compte de démo **Léa Ink** (Nantes) — 4 nouvelles demandes, 2 rendez-vous aujourd'hui, messages.

Profil → « Passer en mode tatoueur·se / client » pour changer de côté ; « Réinitialiser la démo » remet les données à zéro.

## Déploiement (Vercel)

Le projet se déploie sans configuration : Vercel détecte Next.js, `npm install` lance le `postinstall`
(copie du worker MapLibre) puis `next build`.

- Chaque push sur une branche crée un **déploiement de preview** ; la **production** suit la branche
  par défaut (`main`) — fusionner la branche de travail dans `main` pour mettre à jour le site principal.
- Les photos uploadées sont écrites dans le dossier temporaire de la fonction (non persistant) :
  brancher Vercel Blob / S3 via l'interface `FileStorage` avant une vraie mise en production.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` / `npm run start` | Build et serveur de production |
| `npm run lint` | ESLint (config Next + TypeScript) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` (TypeScript strict) |
| `npm test` | Tests unitaires Vitest (`tests/unit`) |
| `npm run test:e2e` | Tests Playwright sur iPhone SE 375, iPhone 15 393, iPhone Pro Max 430, Pixel 7 412, Desktop 1280 |
| `npm run icons` | Régénère les icônes PWA depuis le logo SVG |
| `node scripts/screenshots.mjs [url] --sizes=375,430` | Captures d'écran des écrans clés (`FAKE_TILES=1` hors réseau) |
| `node scripts/bundle-size.mjs [url]` | Poids du JS initial par page (gzip et brotli) |

Les tests e2e démarrent `npm run start` sur le port 3100 (faire `npm run build` avant), ou utilisent `PLAYWRIGHT_BASE_URL`.
`CHROMIUM_PATH` permet d'indiquer un Chromium déjà installé.

## Variables d'environnement

Voir [`.env.example`](.env.example).

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_MAP_STYLE_URL` | *(vide)* | Style MapLibre (URL JSON). Vide = fond clair CARTO Positron (raster gratuit, attribution OSM/CARTO affichée) |
| `UPLOAD_DIR` | `.data/uploads` | Dossier du stockage disque des images uploadées |

## Structure

```text
app/                    Routes (App Router)
  page.tsx              Accueil
  explorer/             Carte + bottom sheet (cœur du produit)
  tatoueurs/[slug]/     Profil tatoueur, /demande = formulaire 8 étapes
  messages/             Liste et fil de discussion
  favoris/ profil/ connexion/ notifications/ offline/
  pro/                  Espace tatoueur : dashboard, demandes, calendrier, portfolio, onboarding
  api/artists/          search, suggest, cards, [slug]
  api/uploads/          Upload d'images (normalisation sharp)
  media/                Variantes d'images (art de démo, avatars, uploads)
  manifest.ts           Manifest PWA
components/
  ui/                   Primitives (Button, Sheet, Picture, Icon, Chip…)
  layout/               Navigation basse / desktop, runtime (toasts, SW)
  explore/              Carte MapLibre, bottom sheet, carrousel, filtres, recherche
  artist/               Cards, portfolio masonry, plein écran, avis, mini-carte
  request/ chat/ client/ pro/ account/ pwa/ home/
lib/                    Logique métier pure et testable
  data/                 Interface ArtistRepository + implémentation mémoire + données de démo
  search/               parse.ts (recherche intelligente), engine.ts, filtres ↔ URL
  storage/              Interface FileStorage + stockage disque local
  notifications/        Canaux de notification (in-app, push navigateur)
  store/                État client (Zustand) des Phases 3–5 + données de démo
  art/                  Générateur procédural des visuels de démo
  images.ts geo.ts calendar.ts dates.ts masonry.ts
public/sw.js            Service worker
tests/unit, tests/e2e   Vitest, Playwright
```

## Ce qui est réel, ce qui est simulé

| Élément | Statut |
| --- | --- |
| Recherche, filtres, géolocalisation, carte, pagination | Réel (API + moteur testé), sur données de démo |
| Tatoueurs, portfolios, avis, créneaux publics | **Démo** : 30 tatoueurs générés (8 villes), visuels de tatouage **générés procéduralement** (pas de vraies photos) |
| Pipeline d'images (5 tailles, AVIF/WebP, cache immuable) | Réel, y compris pour les photos uploadées |
| Upload de photos (portfolio, inspirations, messages) | Réel, stockage disque local ; **non authentifié** |
| Connexion / inscription | **Simulée** : pas de mot de passe, session sur l'appareil |
| Demandes, messagerie, rendez-vous, calendrier, favoris, avis laissés, notifications | **Simulés côté client** (localStorage) : un seul appareil, pas de temps réel entre deux utilisateurs |
| Statistiques tatoueur | « Vues du profil » = valeur de démo ; demandes et taux de réponse calculés |
| Notifications push | Architecture prête (canaux + `push` dans le SW) ; pas d'envoi serveur |
| Monétisation (Phase 6) | Non implémentée — point d'extension `Artist.promoted` |

## Qualité

- `npm run lint`, `npm run typecheck`, `npm test` (33 tests) : OK.
- `npm run test:e2e` : 89 tests OK sur les 5 viewports (1 test mobile ignoré sur desktop).
- Lighthouse mobile (4G simulée), build de prod : voir `docs/DECISIONS.md` § Performance pour les chiffres et les limites connues.
