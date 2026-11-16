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
- **Pas d'essai gratuit** : le paiement est immédiat, quel que soit le forfait (l'ancienne « semaine offerte » est supprimée). L'annuel est mis en avant avec l'économie réelle, **« 49 € d'économie »** (`PRO_ANNUAL_PERK`, calculée à partir des prix : 12 × 19 € − 179 €), et « plus de 2 mois offerts » sur la page tatoueur. L'ancien « 1 mois offert » sous-estimait l'avantage. Aucun changement de facturation (179 € pour 12 mois, renouvellement dans 12 mois).
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
- **Seul l'espace tatoueur exige l'abonnement** : à l'ouverture du site, tout le monde (visiteur, client, tatoueur abonné ou non) arrive sur l'accueil, et tout le site public reste accessible. Le tatoueur remplit son inscription, puis tombe sur le paywall (`/devenir-tatoueur/paiement`) pour accéder à son espace. `proxy.ts` (le middleware de Next 16) ne s'applique qu'à `/espace-tatoueur/…` : un tatoueur connecté sans abonnement valide y est renvoyé vers le paywall (connexion et mot de passe oublié restent ouverts). Le paywall propose « Accueil », « Continuer vers l'accueil » et « Déconnexion ».
- **Statuts qui donnent accès** (`lib/billing/access.ts`, testé) : `active`, `trialing` (abonnements créés pendant l'ancienne offre d'essai, aujourd'hui supprimée) et `past_due`. Ce dernier correspond à un renouvellement échoué que Stripe relance : quelques jours de grâce, avec un message pour mettre la carte à jour. `unpaid` ou `incomplete` mènent à « Mettre à jour mon moyen de paiement » (portail Stripe) plutôt qu'à un second abonnement. `canceled`, ou aucun abonnement, mènent à un nouveau paiement.
- **Visiteurs non concernés** : le proxy n'interroge la base que si le cookie de compte est présent. Une base indisponible ne bloque pas le site (on journalise et on laisse passer). Sans `STRIPE_SECRET_KEY` ou `DATABASE_URL`, il n'y a aucun blocage.
- **Pas de double paiement** : le paiement est refusé si le compte est déjà abonné. Avant de créer un paiement, Stripe est interrogé (`metadata.account_id`) pour retrouver un abonnement déjà payé mais pas encore rattaché (navigateur fermé avant la confirmation). Le webhook rattache aussi l'abonnement au compte grâce à `account_id`.
- **Mise en avant de l'annuel** : grande carte sombre présélectionnée avec halo animé, badge « Le plus avantageux » et « 🎁 49 € d'économie », prix en grand, « soit 14,92 € par mois » et l'économie (49 €, −21 %). Le mensuel est une option secondaire compacte, et le choisir affiche un rappel de l'économie de l'annuel.
- **Bouton de paiement** (`PayButton`), sobre, inspiré des pages de paiement Stripe : logo Fastattoo (carré blanc) + « Fastattoo Pro · S'abonner » à gauche, montant et périodicité à droite, dégradé léger et ombre douce. Au tap : léger enfoncement, onde discrète depuis le point touché, petite vibration. Pendant l'ouverture de Stripe : indicateur de chargement, « Redirection sécurisée… » et fine barre de progression en bas du bouton. Sous le bouton : « Sécurisé par Stripe · résiliable à tout moment » et les moyens de paiement acceptés (CB, Visa, Mastercard, Apple Pay, Google Pay). Animations réduites si l'utilisateur l'a demandé au système.

- **Configuration Stripe tolérante et diagnostiquée** (`lib/billing/env.ts`, testé) :
  - la clé secrète est lue sous les noms courants (`STRIPE_SECRET_KEY`, `STRIPE_API_KEY`, `STRIPE_SECRET`…) ; une clé publique `pk_…` est refusée avec un message explicite ;
  - les forfaits acceptent un identifiant de prix (`price_…`) ou de produit (`prod_…`, avec les montants de `lib/pro-offer.ts`) ;
  - la page `/admin` affiche l'état du paiement en ligne (Activé / Désactivé) et vérifie en direct auprès de Stripe que la clé fonctionne et que les prix correspondent aux montants du site. Aucune clé n'est jamais affichée.
  - **clé restreinte acceptée** (`rk_live_…`), et toute variable dont le nom contient « STRIPE » et la valeur a le format d'une clé est retrouvée (clé live préférée). Autorisations nécessaires : Checkout Sessions et Subscriptions (écriture), Prices et Products (lecture), Customer portal (écriture) ;
  - **prix retrouvés automatiquement** : sans variable `STRIPE_PRICE_…`, le site cherche dans le compte Stripe un prix actif récurrent en euros au même montant et à la même périodicité (19 €/mois, 179 €/an) et l'utilise ; à défaut, le prix est défini à la volée ;
  - **webhook** : accepté aussi sur `/api/stripe/webhook`, `/api/webhooks/stripe` et `/api/webhook`, et `checkout.session.completed` rattache l'abonnement au compte même si le tatoueur ferme la page avant la confirmation.
- **Paywall toujours affiché après l'inscription** : la page de paiement montre toujours les forfaits et le bouton « S'abonner », même si la clé Stripe n'est pas détectée (le bouton affiche alors une erreur « paiement momentanément indisponible » au lieu de masquer la page). Rendu : `docs/rendus/11-paywall-inscription-375.png`.
- **Prix inconnu de Stripe** (« No such price », typiquement un `price_…` du mode test avec une clé live) : le paiement réessaie automatiquement avec le prix retrouvé dans le compte, sinon avec un prix défini à la volée au bon montant. Le paiement n'est donc jamais bloqué par une variable `STRIPE_PRICE_…` erronée, et `/admin` signale la variable à corriger.

## Profil en ligne dès l'abonnement, photos au fur et à mesure

- **Plus de validation manuelle** : dès que l'abonnement est actif (paiement confirmé, webhook ou retour de Stripe), le profil est publié automatiquement. Il apparaît sur la carte et dans la recherche, **même sans photo ni présentation**. Seule la localisation est indispensable : l'adresse de l'inscription est géocodée (Géoplateforme IGN, avec repli sur les grandes villes connues du site). Sans ville localisable, l'espace tatoueur demande l'adresse, et le profil est publié dès qu'elle est enregistrée. Les comptes déjà abonnés sont publiés à leur prochaine visite de l'espace tatoueur.
- **Fin d'abonnement** (`canceled`, `unpaid`, `incomplete_expired`, `paused`) : le profil quitte la carte. Les photos restent dans le compte, et le profil revient en ligne au prochain paiement.
- **Modération** : dans `/admin`, « Retirer du site » passe le profil en `hidden`. Il n'est alors plus republié automatiquement, jusqu'à ce que l'équipe le remette en ligne.
- **Photos du portfolio** (« Mes photos » dans l'espace tatoueur, `/api/compte/photos`) :
  - ajout de plusieurs photos à la fois, avec un style et une zone, la plus récente en premier ; suppression possible ;
  - les photos lourdes sont réduites dans le navigateur avant l'envoi (2000 px) ; maximum 60 photos ;
  - elles sont gardées dans `account_photos` et copiées dans `portfolio_items` quand le profil est en ligne.
- **Stockage des images en production** : sur Vercel, le disque est éphémère. Les originaux sont donc stockés dans Neon (table `media_files`, `bytea`), et les variantes, régénérées à la demande, sont servies avec un cache HTTP immuable.
- **Vrais tatoueurs ≠ profils d'exemple** :
  - le badge « Profil exemple » et son avertissement ne concernent plus que les profils de démonstration (`isDemoArtist`) ;
  - un tatoueur inscrit sans avis affiche « Nouveau » (carte, fiches, profil) au lieu d'une note de 0 ;
  - sans prix renseigné, « sur devis » ;
  - un portfolio vide affiche un message d'attente.
- L'onglet **Profil** mène un tatoueur connecté à son espace (`/espace-tatoueur`).

## Demandes de projets et messagerie (vrais tatoueurs)

- **Les demandes aux vrais tatoueurs (`acc-…`) passent par le serveur** : enregistrées dans Neon (`project_requests`, `request_messages`, tables créées au premier usage), e-mail au tatoueur et e-mail de confirmation au client (Resend, `lib/email.ts`). Les profils d'exemple gardent la demande locale (le profil précise qu'elle n'est transmise à personne).
- **Le client n'a pas de compte** : il suit la conversation par un **lien privé** `/demande/<jeton>` (jeton aléatoire de 256 bits), reçu par e-mail et gardé dans « Messages » sur son appareil. Son e-mail n'est jamais montré au tatoueur ; son téléphone seulement s'il le donne.
- **Le tatoueur répond depuis son espace** (`/espace-tatoueur/demandes`) : message, proposition de rendez-vous (date + heure), ou clôture polie. Chaque message déclenche un e-mail à l'autre personne avec le lien de la conversation. Le client peut accepter le rendez-vous proposé (statut « Rendez-vous confirmé »).
- **Expéditeur des e-mails** : `SIGNUP_NOTIFY_FROM` doit utiliser un domaine vérifié chez Resend, sinon Resend n'envoie qu'à l'adresse du compte Resend.

## Agenda du tatoueur (espace réel)

- **`/espace-tatoueur/agenda`** (lien « Mon agenda » dans l'espace tatoueur, réservé aux abonnés comme le reste de l'espace) : le vrai agenda, enregistré dans Neon (table `agenda_entries`, `/api/compte/agenda`). Le calendrier à 3 créneaux de `/pro/calendrier` reste la maquette de démonstration.
- **Horaires libres** : un rendez-vous a une date, une heure de début au quart d'heure près et une durée (15 min à 12 h, jusqu'à minuit). On y saisit le client (nom obligatoire ; téléphone, e-mail, projet, notes facultatifs) et si l'acompte est versé.
- **Indisponibilités** : des jours entiers, d'une date à une autre (congés, convention…), avec un motif facultatif.
- **Conflits** : un chevauchement ou un rendez-vous posé sur un jour indisponible déclenche un avertissement, sans bloquer l'enregistrement. Le tatoueur décide.
- **Vues** : « Jour » (barre des 7 jours de la semaine) et « Semaine », navigation de semaine en semaine.
- **Fuseau** : jours et heures stockés en texte (heure locale du studio). « Aujourd'hui » et « demain » sont calculés dans le fuseau Europe/Paris, identique à Bruxelles.
- **Rappel e-mail la veille** : un cron Vercel (`vercel.json`, chaque jour à 16 h UTC, soit 17 h ou 18 h à Paris) appelle `/api/agenda/rappels`, protégé par `CRON_SECRET`. Un e-mail part via Resend à chaque client qui a rendez-vous le lendemain et dont l'e-mail est renseigné. La réponse du client arrive chez le tatoueur (`reply-to`). Un rappel n'est envoyé qu'une fois par rendez-vous (`reminder_sent_at`), et à nouveau si la date, l'heure ou l'e-mail change. Seuls les tatoueurs abonnés en profitent.

## Classement par la qualité, jamais par le prix

- **Le prix n'entre jamais dans le classement** : un tatoueur ne gagne aucune place en cassant ses prix. Ordre des résultats (`lib/search/engine.ts`, règles dans `lib/search/quality.ts`, testées) : pertinence du texte tapé → note basse confirmée en dernier → parrains actifs → **score d'avis** → distance (seulement entre tatoueurs de qualité équivalente, la zone limitant déjà aux tatoueurs proches).
- **Score d'avis** : moyenne bayésienne (référence 4,5★, poids 20 avis). Un 5★ sur 2 avis ne passe pas devant un 4,8★ sur 60 avis ; un nouveau tatoueur (0 avis) part de 4,5 : ni enterré ni favorisé.
- **Note basse confirmée** (au moins 5 avis et moyenne sous 3,5★) : le profil passe après tous les autres, même parrain. Dans `/admin`, ces profils sont signalés « ⚠️ Note basse » et listés en premier (« à surveiller »).
- **Carte** : les épingles affichent la note (« ★ 4,8 »), « Nouveau » sans avis, et le style pour un profil d'exemple. Plus jamais le prix.
- **Filtres** : « Note des clients » en premier ; le prix devient « Budget », en dernier, facultatif.
- La mise en avant de l'accueil (`featured`) suit les mêmes règles.

## Tatoueurs qui arrêtent leur activité

- **Suivi d'activité** : chaque visite de l'espace tatoueur (ou de l'agenda) met à jour `artist_accounts.last_active_at` (au plus une fois par heure). Les comptes existants partent de leur dernière connexion connue (`artist_sessions`).
- **Contrôle quotidien** (cron Vercel `/api/compte/inactivite`, 9 h UTC, `CRON_SECRET`) — règles dans `lib/accounts/inactivity.ts`, testées :
  - profil en ligne, abonné, sans visite depuis **45 jours** → e-mail « Tu tatoues toujours ? » avec trois choix : « Je tatoue toujours » (un clic), mettre son profil en pause, ou résilier son abonnement ;
  - toujours rien **15 jours** après → profil **mis en pause** (hors de la carte), e-mail au tatoueur et récapitulatif à l'équipe (`SIGNUP_NOTIFY_EMAIL`).
- **L'abonnement n'est jamais résilié à la place du tatoueur** : c'est son choix, les e-mails et l'espace lui rappellent comment le faire (portail Stripe).
- **Lien « Je tatoue toujours »** : `/toujours-actif?t=…`, jeton signé (HMAC, `ACTIVITY_LINK_SECRET` ou à défaut `CRON_SECRET`), valable 30 jours, sans mot de passe. La confirmation passe par un bouton (POST) pour que l'aperçu automatique des liens par les messageries ne compte pas comme une réponse.
- **Pause** (statut `paused`) : choisie par le tatoueur (« Mettre mon profil en pause » dans son espace) ou décidée faute d'activité. Le profil quitte la carte, photos et avis sont gardés. Une pause faute d'activité se lève dès que le tatoueur revient dans son espace ; une pause qu'il a choisie, seulement avec « Remettre mon profil en ligne ».

## Avis des vrais clients

- **Seuls de vrais clients notent** : un avis est lié à un rendez-vous de l'agenda du tatoueur (un seul avis par rendez-vous, `account_reviews.agenda_entry_id` unique). Pas de compte client : le client reçoit un **lien personnel signé** (HMAC, `ACTIVITY_LINK_SECRET` ou `CRON_SECRET`), valable 60 jours. Un tatoueur ne peut ni se noter lui-même ni être noté par un inconnu. Règles dans `lib/reviews.ts`, testées.
- **Demande d'avis** : cron Vercel quotidien `/api/avis/demandes` (17 h UTC). Pour chaque rendez-vous des 7 derniers jours (jusqu'à hier, heure de Paris) avec l'e-mail du client, chez un tatoueur en ligne et abonné, un e-mail « Comment s'est passé ton tatouage avec … ? » part une seule fois (`agenda_entries.review_request_sent_at`).
- **Page `/avis?t=…`** : note de 1 à 5 étoiles (obligatoire), commentaire facultatif (1 000 caractères), nom affiché pré-rempli « Prénom N. » (jamais le nom complet). Le tatoueur reçoit un e-mail à chaque nouvel avis.
- **Affichage** : les avis non retirés sont copiés dans la table `reviews` du site (id `acc-rev-<id>`) et la moyenne dans `artists.rating` / `review_count`, à chaque avis, réponse ou modération, et à la publication du profil. La fiche, l'épingle de la carte (« ★ 4,8 ») et le classement par qualité les utilisent aussitôt (cache du dépôt : une minute).
- **Réponse du tatoueur** : « Mes avis » dans l'espace tatoueur, une réponse publique par avis (600 caractères), modifiable ou supprimable, affichée sous l'avis (`reviews.reply`, colonne ajoutée automatiquement).
- **Modération** : dans `/admin`, « Avis clients » liste les plus récents ; « Retirer du site » masque un avis insultant ou faux et recalcule la note (l'avis reste en base, réversible).
- Le bouton « Laisser un avis » de l'espace client de démonstration reste une maquette locale.

## Référencement et statistiques

- **Adresse canonique de l'accueil** : `/` (le `canonical: "./"` du layout se résolvait en `/index` sur l'accueil, ce qui pouvait gêner son référencement). Les autres pages gardent la règle du layout.
- **Statistiques de visite** : Vercel Web Analytics (`@vercel/analytics`, composant `<Analytics />` dans le layout, sans cookie). À activer une fois dans le tableau de bord Vercel (onglet Analytics).
- **Guides pour les futurs tatoués** (`/guides`, contenu dans `lib/guides.ts`) : prix d'un tatouage, soins des premiers jours, zones et douleur, styles. Chaque guide cite ses sources (ARS, INC, justice.fr, service-public.fr…), rappelle de suivre les consignes du tatoueur, renvoie vers la carte et figure dans le sitemap. Liens depuis l'accueil (« Bien préparer ton tatouage »).

## Kit de partage des tatoueurs

- **But** : que chaque tatoueur ramène ses clients et ses abonnés sur son profil (visites, avis, référencement). Page `/espace-tatoueur/kit`, accessible par le bouton « Partager mon profil » de l'espace dès que le profil est en ligne.
- **Contenu** : lien du profil (partage natif ou copie) ; **visuel de story** 1080 × 1920 généré à la demande (`/api/compte/kit/story`, `next/og`) avec la première photo du portfolio, le nom, le studio, la note et un QR code ; **affiche A4** à imprimer pour le studio (impression du navigateur, seule l'affiche sort) et QR code seul en SVG (`/api/compte/kit/qr`) ; textes prêts à copier (bio, légende de story, réponse à un client, demande d'avis).
- **QR code** : générateur maison sans dépendance (`lib/qr.ts`, mode octets, correction M, versions 1 à 10), vérifié avec un vrai lecteur et testé.
- **Mesure** : chaque support a son lien avec `utm_source` (`qr`, `story`, `bio`, `lien`, voir `lib/share-kit.ts`) pour voir dans Vercel Analytics ce qui ramène des visites. La fiche garde son adresse canonique, donc pas de doublon pour Google.
