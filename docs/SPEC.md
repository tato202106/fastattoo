# Fastattoo — Cahier des charges

Projet : marketplace mobile-first pour tatoueurs.

## 1. Vision du produit

Créer une plateforme de mise en relation entre clients et tatoueurs, pensée avant tout pour le mobile.

Le trafic principal venant du mobile, il ne faut surtout pas concevoir d'abord une version desktop puis la réduire pour téléphone.

- Le mobile est la version principale du produit.
- Le desktop sera une adaptation secondaire.

L'expérience doit être aussi fluide qu'une application mobile moderne, même si le produit est développé comme un site web.

## 2. Objectif principal

Le parcours principal doit être extrêmement rapide :

> Je veux un tatoueur → je vois ceux autour de moi → je regarde leurs tatouages → je choisis → je contacte/réserve.

L'utilisateur doit pouvoir effectuer ce parcours avec une seule main.

Limiter au maximum :

- les formulaires longs
- les menus complexes
- les pages inutiles
- les clics
- les informations secondaires

## 3. Mobile = priorité absolue

Toutes les décisions UX doivent être prises en pensant : iPhone / Android / écran 375–430 px de large.

Tester particulièrement :

- iPhone SE
- iPhone standard
- grands iPhone
- Android standard

Le design doit être responsive, mais le breakpoint mobile doit être considéré comme la référence.

## 4. Navigation mobile

Utiliser une navigation basse fixe.

```text
┌─────────────────────────────────┐
│                                 │
│           CONTENU               │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Accueil │ Carte │ Favoris │ Msg │
│    ⌂    │  ●    │    ♡    │  💬 │
└─────────────────────────────────┘
```

Pour un **Client** :

- Accueil
- Explorer / Carte
- Favoris
- Messages
- Profil

Pour un **Tatoueur** :

- Dashboard
- Demandes
- Calendrier
- Messages
- Profil

La navigation doit rester accessible avec le pouce.

## 5. Homepage mobile

La homepage doit être beaucoup plus directe que la version desktop.

En haut :

- Logo
- Profil / connexion

Puis :

- **Trouve ton tatoueur.**
- Sous-titre : *Les meilleurs artistes autour de toi.*
- Grande barre de recherche : *Ville, style ou tatoueur*
- Bouton : **Autour de moi**

Puis : **Explorer les styles** — cartes horizontales scrollables :

- Fine Line
- Blackwork
- Réalisme
- Japonais
- Old School
- Floral

Puis : **Tatoueurs autour de toi** — afficher immédiatement quelques profils.

CTA : **Voir la carte**

## 6. Carte mobile = élément central

La carte doit avoir une véritable expérience mobile.

```text
┌─────────────────────────┐
│ ← Rechercher            │
│ [ Fine Line       ]     │
│                         │
│       ●       ●         │
│                         │
│   ●          ●          │
│                         │
│          ●              │
│                         │
│                         │
│ [Rechercher ici]        │
├─────────────────────────┤
│ Léa Ink                 │
│ ⭐ 4.9 · 2.4 km         │
│ Fine Line · Floral      │
│                         │
│ [Voir le profil]        │
└─────────────────────────┘
```

La carte prend quasiment tout l'écran. Les résultats apparaissent dans un bottom sheet.

## 7. Bottom sheet

Le bottom sheet est essentiel. L'utilisateur peut :

- faire glisser vers le haut
- faire glisser vers le bas
- consulter les résultats
- revenir à la carte

```text
      CARTE
       ●
   ●       ●

────────────────────
24 tatoueurs autour
────────────────────

Léa Ink
⭐ 4.9 · 2.4 km

Fine Line · Floral

[Voir]
```

Lorsqu'on sélectionne un marker → le bottom sheet affiche automatiquement le tatoueur correspondant.

## 8. Carte + liste synchronisées

Les deux interfaces doivent toujours être synchronisées.

- Tap sur un marker → ouvrir la card correspondante.
- Tap sur une card → centrer la carte sur le tatoueur.
- Swipe entre les cards → déplacer automatiquement la carte vers le tatoueur.
- Déplacement de la carte → afficher : **Rechercher dans cette zone**.

Ne pas actualiser constamment les résultats pendant que l'utilisateur déplace la carte.

## 9. Géolocalisation mobile

Sur mobile, proposer rapidement : **Utiliser ma position**.

Après accord :

- récupérer la position
- centrer la carte
- rechercher les tatoueurs autour

Afficher : **Tatoueurs près de toi** — exemple : *24 tatoueurs à moins de 10 km*.

La position exacte du client ne doit jamais être visible publiquement.

## 10. Filtres mobile

Ne pas afficher 10 filtres simultanément. Créer un bouton **Filtrer** qui ouvre une interface plein écran ou un bottom sheet.

Filtres :

- **Style** — sélection multiple.
- **Distance** — slider : 5 km → 100 km.
- **Prix** — minimum / maximum.
- **Disponibilité** — Aujourd'hui / Cette semaine / Ce mois-ci.
- **Note** — 4+ / 4.5+ / 4.8+.

En bas : **Afficher 24 tatoueurs**.

## 11. Recherche mobile

Créer une recherche intelligente. L'utilisateur peut taper :

- `Fine Line Nantes`
- `Tatoueur blackwork`
- `Léa Ink`

Les résultats doivent comprendre automatiquement :

- ville
- style
- tatoueur
- catégorie

## 12. Profil tatoueur mobile

Le profil doit être conçu comme une page Instagram/Pinterest premium.

En haut : grande image.

Puis :

```text
Léa Ink
Tatoueuse · Nantes
⭐ 4.9 · 87 avis
✓ Vérifiée
```

CTA fixe en bas :

```text
┌─────────────────────────────┐
│ Demander un projet          │
└─────────────────────────────┘
```

Le CTA doit rester accessible pendant le scroll.

## 13. Portfolio mobile

Le portfolio doit prendre énormément de place. Utiliser une galerie :

- masonry
- grille 2 colonnes
- images grandes
- chargement progressif

Le portfolio doit être la première chose qui permet au client de décider : *« J'aime son style. »*

Au clic sur une image → plein écran. Swipe horizontal entre les tatouages.

## 14. Informations du tatoueur

Après le portfolio :

- **Styles** — Fine Line, Floral, Minimaliste
- **À propos** — courte présentation.
- **Localisation** — mini-carte.
- **Prix** — À partir de 120 €.
- **Disponibilités** — prochains créneaux.
- **Avis** — commentaires clients.

## 15. CTA toujours accessible

Sur mobile, le bouton principal doit être facilement accessible. En bas de l'écran : **Demander un projet** ou **Prendre rendez-vous**.

Éviter que l'utilisateur doive remonter en haut de la page pour contacter le tatoueur.

## 16. Parcours Client mobile

Le parcours doit être très court.

```text
Accueil
 ↓
Recherche
 ↓
Carte
 ↓
Tatoueur
 ↓
Portfolio
 ↓
Demander un projet
 ↓
Formulaire
 ↓
Message
 ↓
Rendez-vous
```

## 17. Formulaire projet mobile

Utiliser plusieurs petites étapes plutôt qu'un énorme formulaire.

1. **Quel tatouage veux-tu ?** — champ libre.
2. **Quel style ?** — sélection visuelle.
3. **Où ?** — bras / dos / jambe / etc.
4. **Quelle taille ?** — petit / moyen / grand.
5. **Quel budget ?**
6. **Quand ?** — dates préférées.
7. **Ajoute tes inspirations** — photos.
8. **Envoyer**

Afficher une barre de progression : `6 / 8`.

## 18. Espace Client mobile

Dashboard très simple.

Accueil :

- Bonjour Thomas 👋
- Ton prochain rendez-vous

Puis :

- Tes demandes
- Tes favoris
- Tatoueurs recommandés

## 19. Espace Tatoueur mobile

Le tatoueur doit pouvoir gérer son activité depuis son téléphone.

Dashboard :

```text
Bonjour Léa 👋

Aujourd'hui
2 rendez-vous

Nouvelles demandes
4

Messages
3

Prochain rendez-vous
14:00 · Thomas
```

## 20. Dashboard Tatoueur mobile

Créer des raccourcis :

```text
┌──────────────┬──────────────┐
│ Demandes     │ Calendrier   │
│      4       │              │
├──────────────┼──────────────┤
│ Portfolio    │ Messages     │
│              │      3       │
└──────────────┴──────────────┘
```

Le tatoueur doit pouvoir gérer son activité rapidement entre deux rendez-vous.

## 21. Ajouter une création au portfolio

Le mobile doit permettre : **+ Ajouter un tatouage**

Puis :

1. Prendre une photo
2. Choisir une photo
3. Ajouter le style
4. Ajouter la zone du corps
5. Publier

Le processus doit prendre moins d'une minute.

## 22. Demandes Tatoueur

Sur mobile :

```text
Nouvelles demandes

Thomas
Fine Line
Avant-bras

Budget : 200–300 €

[Voir]
```

Puis :

- Accepter
- Répondre
- Proposer un créneau

## 23. Messagerie mobile

Créer une interface proche d'une messagerie moderne.

Support :

- texte
- photos
- références
- prix
- proposition de rendez-vous

Le client et le tatoueur doivent pouvoir discuter naturellement.

## 24. Calendrier Tatoueur mobile

Le calendrier doit être simplifié.

Vue par défaut : **Aujourd'hui**. Puis : **Cette semaine**.

```text
JEUDI 16

10:00
Disponible

14:00
Thomas
Fine Line

17:00
Disponible
```

Le tatoueur peut bloquer un créneau en quelques secondes.

## 25. Notifications mobile

Prévoir des notifications in-app. Exemples :

- Léa a répondu à votre demande.
- Votre rendez-vous est confirmé.
- Nouveau message de Thomas.
- Votre rendez-vous est demain à 14h.

Préparer l'architecture pour les push notifications natives plus tard.

## 26. Installation mobile

Le site doit être pensé comme une PWA. Permettre éventuellement : **Ajouter à l'écran d'accueil**.

L'expérience doit se rapprocher d'une application.

## 27. Performance mobile

Priorité absolue. Le site doit être rapide même avec une connexion moyenne.

Prévoir :

- images WebP/AVIF
- lazy loading
- thumbnails
- compression automatique
- cache
- pagination
- skeleton loaders
- chargement progressif
- carte chargée intelligemment

Ne jamais charger immédiatement toutes les images de tous les tatoueurs.

## 28. Images

Les images sont fondamentales pour ce produit. Chaque image du portfolio doit avoir plusieurs tailles :

```text
thumbnail
small
medium
large
original
```

Charger uniquement la résolution nécessaire :

- Sur la liste → thumbnail.
- Sur le profil → medium.
- En plein écran → large.

## 29. Desktop

Le desktop existe mais n'est pas la priorité. Il doit reprendre la même logique.

- **Recherche desktop** — liste à gauche, carte à droite.
- **Profil desktop** — portfolio large, informations à côté.
- **Dashboard tatoueur** — interface plus complète.

Mais ne jamais sacrifier l'expérience mobile pour le desktop.

## 30. Priorité de développement

Développer dans cet ordre :

**Phase 1 — Mobile Core**

- navigation mobile
- homepage
- recherche
- géolocalisation
- carte
- markers
- bottom sheet
- filtres
- liste

**Phase 2 — Découverte**

- profil tatoueur
- portfolio
- styles
- avis
- localisation
- disponibilités

**Phase 3 — Client**

- inscription
- profil
- favoris
- projets
- demandes
- messages

**Phase 4 — Tatoueur**

- onboarding
- profil professionnel
- portfolio
- calendrier
- demandes
- messages
- statistiques

**Phase 5 — Réservation**

- proposition de créneau
- confirmation
- notifications
- avis

**Phase 6 — Monétisation**

- abonnement tatoueur
- mise en avant
- paiement
- commission

## 31. Règle de conception principale

Pour chaque écran, poser cette question :

> « Est-ce que cette fonctionnalité est aussi simple à utiliser avec un pouce sur un téléphone ? »

Si la réponse est non → simplifier l'interface.

Le produit doit être pensé comme une application mobile de découverte et de réservation de tatoueurs, même si la première version est un site web.

## 32. Résumé du produit

Le produit repose sur 4 piliers :

- 📍 **Carte** — Trouver les tatoueurs autour de soi.
- 🎨 **Portfolio** — Voir immédiatement leur travail et leur style.
- 💬 **Communication** — Échanger avec le tatoueur.
- 📅 **Réservation** — Trouver un créneau et réserver.

Le client vient pour trouver le bon tatoueur. Le tatoueur vient pour se faire découvrir et obtenir de nouveaux clients.

Le mobile doit être la priorité absolue dans le design, les performances et les interactions.
