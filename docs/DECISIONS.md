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

## Monétisation (Phase 6) — abonnement tatoueur

- **Prix** (réglables dans `lib/pro-offer.ts`) : annuel **179 €/an** (mis en avant, présélectionné) et mensuel **19 €/mois** (le prix déjà affiché sur le site). L'annuel revient à 14,92 €/mois, soit 49 € d'économie (−21 %).
- **Pas d'essai gratuit** : le paiement est immédiat, quel que soit le forfait (l'ancienne « semaine offerte » est supprimée). L'annuel est mis en avant avec l'argument **« 1 mois offert »** (`PRO_ANNUAL_PERK`) : un argument commercial, sans changement de facturation (179 € pour 12 mois, renouvellement dans 12 mois). Il reste vrai tant que l'annuel coûte moins que 11 mois au mensuel (179 € < 209 €), ce que vérifie un test.
- **Paiement à l'inscription (réel)** : `/devenir-tatoueur/inscription` → formulaire (enregistré dans Neon) → **choix du forfait** → **Stripe Checkout** → `/devenir-tatoueur/inscription/confirmation`. Le paiement est **vérifié côté serveur**, puis enregistré sur l'inscription (`artist_signups.plan`, `subscription_status`, `stripe_subscription_id`…). Sans `STRIPE_SECRET_KEY`, l'inscription est enregistrée sans paiement et le message l'indique honnêtement (aucun faux paiement).
- **Abonnés au mensuel → slides pour passer à l'annuel** :
  - après le paiement (page de confirmation) et sur **`/mon-abonnement`** (abonnement relié au navigateur par un cookie httpOnly posé après paiement vérifié) : slides + « Passer à l'annuel — 179 € ». Stripe modifie l'abonnement existant avec prorata, sans double abonnement ;
  - dans l'espace pro de démo (`/pro`) : sheet de slides à l'ouverture du dashboard (au plus une fois par semaine, « Plus tard » repousse de 7 jours) + carte de slides permanente.
- **Slides** : swipe horizontal, points de navigation, défilement automatique toutes les 4,5 s, mis en pause au toucher et désactivé si l'utilisateur réduit les animations. Uniquement des faits calculés (prix, économies).
- **Espace pro `/pro`** : verrouillé tant qu'il n'y a pas d'abonnement (redirection vers `/pro/abonnement`, sauf l'onboarding). Comme il n'y a pas encore de vrais comptes, une nouvelle souscription y reste **en démonstration**, sans encaissement. Le passage à l'annuel y devient réel si le navigateur est relié à un vrai abonnement.
- **Aucune donnée de carte dans l'application** : saisie uniquement sur Stripe Checkout (carte, Apple Pay, Google Pay).
- **Limites avant production** :
  - Pas encore de comptes tatoueurs : `/mon-abonnement` ne fonctionne que sur l'appareil qui a payé.
  - **Webhook Stripe** `/api/billing/webhook` (signature vérifiée avec `STRIPE_WEBHOOK_SECRET`, logique pure dans `lib/billing/webhook.ts`) : `customer.subscription.*` et `invoice.paid` / `invoice.payment_failed` mettent à jour `artist_signups` (`subscription_status`, `plan`, `cancel_at_period_end`, `current_period_end`). Erreur Neon → réponse 500 pour que Stripe renvoie l'événement.
  - **Portail client Stripe** : bouton « Gérer mon abonnement » sur `/mon-abonnement` (`/api/billing/portal`) pour changer de carte, voir les factures ou résilier. Le portail doit être activé une fois dans Stripe (Paramètres → Facturation → Portail client), en mode test et en mode live.
- Reste de la Phase 6 : la mise en avant « Parrain » existe déjà (lib/referral.ts) ; la commission sur réservation n'est pas implémentée.

## Comptes tatoueurs (espace réel)

- **Connexion par e-mail + mot de passe** (choix du propriétaire). Mot de passe haché en **scrypt** (`lib/auth/password.ts`, sans dépendance), 8 caractères minimum. Session = jeton aléatoire dans un cookie httpOnly `ft_account` (30 jours), seule son empreinte SHA-256 est en base (`artist_sessions`).
- **Compte créé à l'inscription** (`/devenir-tatoueur/inscription`, champ mot de passe) et connecté tout de suite. Après le paiement Stripe, l'abonnement est rattaché au compte et le tatoueur arrive sur **`/espace-tatoueur?bienvenue=1`**.
- **Espace tatoueur** `/espace-tatoueur` : statut du profil, profil modifiable (nom, studio, adresse géocodée via la Géoplateforme IGN, styles, prix, présentation, Instagram), abonnement (récapitulatif, passage à l'annuel, portail Stripe) ou activation s'il n'y en a pas.
- **Publication après validation** : brouillon → « Envoyer pour validation » (e-mail à `SIGNUP_NOTIFY_EMAIL`) → validation sur **`/admin`** (mot de passe `ADMIN_PASSWORD`, cookie signé 12 h) → copie dans la table `artists` (id `acc-<id>`, slug `nom-ville-<id>`), visible en une minute (cache du dépôt). Un profil publié modifié est mis à jour sur le site directement. « Retirer du site » supprime la ligne `artists` et repasse le compte en brouillon.
- **Pas encore de photos** dans cette version : avatar aux initiales et couverture générée dans le premier style. L'upload du portfolio demandera un stockage persistant (ex. Vercel Blob) : le disque de Vercel n'est pas conservé.
- **Mot de passe oublié** : lien à usage unique valable 1 h (empreinte en base, `password_resets`), envoyé par Resend. Un tatoueur inscrit avant la création des comptes reçoit un compte pré-rempli depuis `artist_signups` en demandant ce lien. Réponse identique que l'e-mail existe ou non.
- Les tables `artist_accounts`, `artist_sessions` et `password_resets` sont créées automatiquement au premier usage.
- `DEMO_PROFILES` (`lib/showcase.ts`) reste à `true` tant que les profils de démo sont affichés : les vrais profils portent alors aussi le badge « Profil exemple ». Le passer à `false` une fois les profils de démo retirés.


## Paiement obligatoire des tatoueurs

- **À la fin de chaque inscription**, le formulaire crée le compte (connecté) puis ouvre la page de paiement dédiée **`/devenir-tatoueur/paiement`** (« Étape 2 / 2 »). Le bouton du formulaire s'appelle « Continuer vers le paiement ».
- **Accès bloqué tant que l'abonnement n'est pas actif** : `proxy.ts` (le middleware de Next 16) renvoie un tatoueur connecté sans abonnement valide vers la page de paiement, **quelle que soit la page demandée**. Seules restent ouvertes la page de paiement, la confirmation Stripe, la connexion et le mot de passe oublié. La page de paiement propose aussi de se déconnecter, pour continuer à naviguer en simple visiteur.
- **Statuts qui donnent accès** (`lib/billing/access.ts`, testé) : `active`, `trialing` (abonnements créés pendant l'ancienne offre d'essai, aujourd'hui supprimée) et `past_due`. Ce dernier correspond à un renouvellement échoué que Stripe relance : quelques jours de grâce, avec un message pour mettre la carte à jour. `unpaid` ou `incomplete` mènent à « Mettre à jour mon moyen de paiement » (portail Stripe) plutôt qu'à un second abonnement. `canceled`, ou aucun abonnement, mènent à un nouveau paiement.
- **Visiteurs non concernés** : le proxy n'interroge la base que si le cookie de compte est présent. Une base indisponible ne bloque pas le site (on journalise et on laisse passer). Sans `STRIPE_SECRET_KEY` ou `DATABASE_URL`, il n'y a aucun blocage.
- **Pas de double paiement** : le paiement est refusé si le compte est déjà abonné. Avant de créer un paiement, Stripe est interrogé (`metadata.account_id`) pour retrouver un abonnement déjà payé mais pas encore rattaché (navigateur fermé avant la confirmation). Le webhook rattache aussi l'abonnement au compte grâce à `account_id`.
- **Mise en avant de l'annuel** : grande carte sombre présélectionnée avec halo animé, badge « Le plus avantageux » et « 🎁 1 mois offert », prix en grand, « soit 14,92 € par mois » et l'économie (49 €, −21 %). Le mensuel est une option secondaire compacte, et le choisir affiche un rappel de l'économie de l'annuel.
- **Bouton de paiement** (`PayButton`), sobre, inspiré des pages de paiement Stripe : logo Fastattoo (carré blanc) + « Fastattoo Pro · S'abonner » à gauche, montant et périodicité à droite, dégradé léger et ombre douce. Au tap : léger enfoncement, onde discrète depuis le point touché, petite vibration. Pendant l'ouverture de Stripe : indicateur de chargement, « Redirection sécurisée… » et fine barre de progression en bas du bouton. Sous le bouton : « Sécurisé par Stripe · résiliable à tout moment » et les moyens de paiement acceptés (CB, Visa, Mastercard, Apple Pay, Google Pay). Animations réduites si l'utilisateur l'a demandé au système.

- **Configuration Stripe tolérante et diagnostiquée** (`lib/billing/env.ts`, testé) :
  - la clé secrète est lue sous les noms courants (`STRIPE_SECRET_KEY`, `STRIPE_API_KEY`, `STRIPE_SECRET`…) ; une clé publique `pk_…` est refusée avec un message explicite ;
  - les forfaits acceptent un identifiant de prix (`price_…`) ou de produit (`prod_…`, avec les montants de `lib/pro-offer.ts`) ;
  - la page `/admin` affiche l'état du paiement en ligne (Activé / Désactivé) et vérifie en direct auprès de Stripe que la clé fonctionne et que les prix correspondent aux montants du site. Aucune clé n'est jamais affichée.
  - **clé restreinte acceptée** (`rk_live_…`), et toute variable dont le nom contient « STRIPE » et la valeur a le format d'une clé est retrouvée (clé live préférée). Autorisations nécessaires : Checkout Sessions et Subscriptions (écriture), Prices et Products (lecture), Customer portal (écriture) ;
  - **prix retrouvés automatiquement** : sans variable `STRIPE_PRICE_…`, le site cherche dans le compte Stripe un prix actif récurrent en euros au même montant et à la même périodicité (19 €/mois, 179 €/an) et l'utilise ; à défaut, le prix est défini à la volée ;
  - **webhook** : accepté aussi sur `/api/stripe/webhook`, `/api/webhooks/stripe` et `/api/webhook`, et `checkout.session.completed` rattache l'abonnement au compte même si le tatoueur ferme la page avant la confirmation.
- **Paywall toujours affiché après l'inscription** : la page de paiement montre toujours les forfaits et le bouton « S'abonner », même si la clé Stripe n'est pas détectée (le bouton affiche alors une erreur « paiement momentanément indisponible » au lieu de masquer la page). Rendu : `docs/rendus/11-paywall-inscription-375.png`.
