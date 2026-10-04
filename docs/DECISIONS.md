# Décisions de conception

Règle appliquée partout : « Est-ce aussi simple à utiliser avec un pouce sur un téléphone ? »
Chaque décision ci-dessous résout une ambiguïté de la SPEC en choisissant l'option la plus simple au pouce.

## Navigation

- **Barre basse masquée sur les écrans immersifs** : profil tatoueur, formulaire projet, conversation, détail d'une demande, ajout au portfolio, connexion, onboarding. Ces écrans ont leur propre CTA fixe en bas (SPEC §12, §15) ; empiler deux barres aurait réduit la zone utile et créé des conflits au pouce. Un bouton retour est toujours en haut à gauche.
- **Desktop** : la barre basse devient une barre en haut (mêmes entrées). Pas d'autre menu.
- **Accueil d'un client connecté** = son espace (SPEC §18 : « Bonjour Thomas 👋 », prochain RDV, demandes, favoris), suivi de la découverte. On n'ajoute pas d'onglet supplémentaire.

## Carte et liste

- **3 crans de bottom sheet** : *peek* (carrousel d'une card à la fois, SPEC §6), *mi-hauteur* et *plein écran* (liste). Le carrousel est la vue par défaut car il garde la carte visible.
- **Dans la liste, un tap sur une card centre la carte** (SPEC §8) et repasse en *peek* ; le bouton « Voir » ouvre le profil. Sur l'accueil et dans les favoris, la card entière ouvre le profil (pas de carte à synchroniser).
- **Plein écran du sheet** : le contenu défile ; on referme en tirant la poignée ou en tirant vers le bas quand la liste est en haut. Bouton « Carte » flottant pour revenir en un tap.
- **Jamais de recherche automatique pendant le déplacement de la carte** : seuls les gestes de l'utilisateur (drag/zoom) font apparaître « Rechercher dans cette zone ».
- **Marqueurs** = pastilles « ★ 4,9 » (note) : l'information la plus utile pour choisir au premier coup d'œil.
- **Fond de carte** : CARTO Positron/Dark Matter en raster (gratuit, sans clé, attribution affichée). Remplaçable par n'importe quel style MapLibre via `NEXT_PUBLIC_MAP_STYLE_URL` (en production : fournisseur avec SLA, ex. MapTiler, Stadia ou tuiles auto-hébergées).
- **Carte chargée intelligemment** : MapLibre n'est importé que sur l'écran Explorer (et la mini-carte du profil quand elle devient visible), après l'affichage des résultats (`requestIdleCallback`).
- **Marqueurs HTML** (≤ 200) : simples et accessibles. Au-delà, passer à une source GeoJSON clusterisée.

## Recherche

- **Une seule barre** « Ville, style ou tatoueur », ouverte en plein écran. Ce que la recherche a compris est affiché en puces (« 📍 Nantes », « Fine Line »).
- **Priorité** : un nom de tatoueur/studio complet est reconnu avant les styles (« Malo Noir » ≠ style « noir »), puis villes et styles (tolérance aux accents, à la casse et aux fautes légères), le reste est cherché dans les noms.
- **Zone de recherche** : zone de carte > ville tapée (rayon ≥ 20 km) > position (rayon des filtres) > toute la France.

## Géolocalisation et confidentialité

- **Pas de demande d'autorisation surprise** : la position n'est demandée qu'au tap sur « Autour de moi » / « Utiliser ma position ». Si l'autorisation a déjà été donnée, l'accueil s'en sert directement.
- **Position arrondie à 2 décimales (~1 km)** dès réception, gardée en mémoire seulement (jamais en localStorage, jamais dans l'URL), arrondie à nouveau côté serveur. Les distances affichées ont donc une précision d'environ ±0,7 km : suffisant pour classer, insuffisant pour localiser quelqu'un.
- **Refus, absence d'API, délai dépassé** : message clair et la recherche par ville reste disponible. Une minuterie de 20 s débloque l'interface si l'invite d'autorisation reste sans réponse.

## Filtres

- Un seul bouton « Filtrer » (avec pastille du nombre de filtres actifs) qui ouvre un sheet plein écran. Le bouton du bas « Afficher N tatoueurs » est recalculé en direct (requête `pageSize=0`).
- Le **prix** filtre le tarif de départ du tatoueur.
- Disponibilité et note : sélection unique (un second tap désélectionne).

## Profil tatoueur

- **Ordre mobile** : grande image → identité (note, avis, Vérifiée) → **portfolio** (premier élément de décision, SPEC §13) → styles, à propos, localisation, prix, disponibilités, avis.
- **Créneaux** du profil : un tap ouvre le formulaire avec la date présélectionnée.
- **Plein écran** : swipe horizontal natif (scroll-snap), swipe vers le bas pour fermer, flèches/Échap au clavier, bouton retour du téléphone = fermer.

## Formulaire projet (8 étapes)

- Une question par écran, « Continuer » dans la zone du pouce, progression « 6 / 8 ».
- Les étapes à choix unique (zone, taille, budget) **avancent automatiquement** au tap : un geste de moins.
- Budget par tranches (pas de saisie libre au clavier).
- « Quand ? » = « Je suis flexible » ou jusqu'à 3 dates parmi celles où le tatoueur a des créneaux.
- Inspirations facultatives (bouton « Passer »), 5 photos max, compressées avant envoi.
- Brouillon conservé dans l'onglet (sessionStorage).
- Pas de compte obligatoire avant la dernière étape : prénom + e-mail demandés seulement à l'envoi.

## Espace tatoueur

- **Calendrier simplifié** : 3 créneaux standards par jour (10:00, 14:00, 17:00), du lundi au samedi, plus les rendez-vous. Un tap sur un créneau libre le bloque, un tap sur un créneau bloqué le débloque.
- **Ajout au portfolio** : la photo part en arrière-plan dès qu'elle est choisie, pendant qu'on sélectionne style et zone ; « Publier » est actif dès que tout est prêt. Le temps écoulé est affiché après publication.
- **Proposer un créneau** : liste des créneaux libres du calendrier sur 3 semaines + durée (1–4 h), 2 taps.

## Images

- Variantes `thumbnail` 200 / `small` 400 / `medium` 800 / `large` 1600 / `original` (≤ 2400) en AVIF et WebP, servies avec `Cache-Control: immutable`.
- Usage → variantes proposées au navigateur via `srcset` + `sizes` : liste = thumbnail/small, profil = small/medium, plein écran = medium/large.
- Images uploadées : normalisées à l'upload (rotation EXIF, 2400 px, métadonnées retirées), variantes générées **à la première demande** puis stockées. L'upload reste ainsi rapide.
- Pas de fondu d'apparition piloté par JavaScript : la couleur dominante sert de placeholder, et l'image s'affiche avant l'hydratation (meilleur LCP).
- **Visuels de démo générés procéduralement** (SVG → sharp), faute de vraies photos sous licence. Ils passent par le même pipeline de variantes.

## Données et état

- **`ArtistRepository`** (`lib/data/repository.ts`) : l'UI et l'API ne dépendent que de cette interface. Le moteur `lib/search/engine.ts` est pur et testé ; une implémentation SQL/PostGIS devra respecter les mêmes tests.
- **Phases 3–5 côté client** (Zustand + localStorage) : le store expose les actions que le futur backend devra fournir (créer une demande, envoyer un message, proposer/accepter un créneau, bloquer un créneau…). Les données de démo sont chargées à la demande, hors du bundle initial.
- **Notifications** : canal in-app (liste + toast) + canal push navigateur (si autorisé, onglet en arrière-plan). Le service worker gère déjà `push` et `notificationclick` pour brancher un envoi serveur (Web Push).

## PWA

- Manifest (standalone, portrait, raccourcis « Autour de moi » et « Messages »), icônes standard + maskable.
- Service worker : pages en réseau d'abord (puis cache, puis `/offline`), assets versionnés en cache d'abord, images et tuiles en stale-while-revalidate (cache plafonné), API en réseau d'abord avec secours hors ligne.
- Invite « Ajouter à l'écran d'accueil » : bannière masquable 30 jours sur l'accueil + entrée dans le profil. Sur iOS (pas d'invite native), instructions pas à pas.

## Performance — mesures et limites connues

Mesuré sur le build de production, dans l'environnement de développement (CPU modeste, `benchmarkIndex` ≈ 1450, rendu WebGL logiciel), Lighthouse 12 mobile, throttling simulé 4G :

| Page | Perf | Accessibilité | Bonnes pratiques | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| Accueil | 85–91 | 100 | 96 | 2,9–3,5 s | 0,05 | 120–280 ms |
| Profil tatoueur | 90–99 | 100 | 100 | 2,0–3,0 s | 0 | 100–230 ms |
| Explorer (carte) | ~62 | 100 | 96 | ~3,1 s | 0 | ~4 s |

JS initial (scripts modules, hors polyfills `noModule`) : accueil **131 kB en brotli / 152 kB en gzip**, profil 130 / 151 kB, espace tatoueur 127 / 148 kB.
Environ 140 kB de ce total correspondent au socle React 19 + Next.js 16.

Limites connues :

- **Écran Carte** : MapLibre GL v6 (~1 Mo non compressé, code partagé dupliqué dans le worker) domine le temps de blocage. La liste s'affiche avant la carte, mais le TBT reste élevé sur CPU lent. Pistes : précharger le chunk MapLibre depuis l'accueil, ou passer à un rendu raster plus léger si les mesures terrain le confirment.
- **LCP de l'accueil** : légèrement au-dessus de 2,5 s en simulation. Le délai de rendu est lié à l'exécution du JS du framework. Pistes : réduire encore les composants clients de l'accueil, et servir les images de démo pré-générées via CDN.
- Les variantes d'images sont générées à la première requête : derrière un CDN, seule la toute première visite paie ce coût.

## Monétisation (Phase 6, non implémentée)

Points d'extension prévus : `Artist.promoted` (mise en avant dans le tri), séparation des actions « demande » et « réservation » dans le store, pour y brancher acompte, paiement ou commission.
