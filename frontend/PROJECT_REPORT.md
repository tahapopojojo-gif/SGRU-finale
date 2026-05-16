# 🇲🇦 Rapport de Projet : UrbanMap Maroc

## 📋 Présentation Générale
**UrbanMap Maroc** est une plateforme avancée de gestion spatiale et de participation citoyenne dédiée à l'urbanisme. Elle crée un pont interactif entre les citoyens, les urbanistes et les autorités locales pour améliorer la planification des villes marocaines (Marrakech, Casablanca, Rabat, etc.), le tout propulsé par l'Intelligence Artificielle.

---

## 👥 Rôles et Responsabilités

### 1. 🛡️ Super Administrateur
Le garant de la sécurité et de l'intégrité de la plateforme.
- **Gestion des Accès** : Valide manuellement les comptes des nouveaux Urbanistes et Administrateurs (statut 'En attente' -> 'Actif').
- **Audit** : Possède une vue d'ensemble sur tous les utilisateurs inscrits.

### 2. 🏗️ Administrateur (Admin)
Le gestionnaire du territoire et de la stratégie.
- **Gestion des Zones** : Dessine les zones officielles (Gueliz, Médina, etc.) sur la carte où les citoyens sont autorisés à s'exprimer.
- **Modération Globale** : Peut voir, modifier ou supprimer toutes les zones et remarques.

### 3. 📐 Urbaniste (Fonctionnalités Étendues)
L'expert métier qui analyse et valide les besoins via un Tableau de Bord analytique complet à 5 dimensions.
- **Analyse Spatiale (Carte)** : Visualise la heatmap des remarques et les polygones des zones.
- **Statistiques Pro** : Accède à des graphiques dynamiques (Recharts) sur la répartition temporelle, la répartition par urgence et par catégorie.
- **Analyse d'Opinions (IA)** : Lit les opinions citoyennes filtrées par l'Intelligence Artificielle et génère des synthèses globales par zone.
- **Annotations Privées** : Consigne des notes professionnelles internes et sécurisées pour chaque zone.
- **Reporting Automatisé** : Génère des rapports PDF complets en un clic.

### 4. 🏘️ Citoyen
L'acteur principal de la participation.
- **Signalement Précis** : Soumet des requêtes via un formulaire intelligent en 5 étapes.
- **Expression Libre** : Peut laisser des opinions détaillées qui seront automatiquement modérées par l'IA.
- **Contrainte de Zone** : Ne peut interagir que dans les zones officielles ouvertes par l'administration.

---

## 🤖 L'Intelligence Artificielle au Service de l'Urbanisme (Nouveau)

La plateforme intègre désormais le modèle **Anthropic Claude Sonnet** pour soulager la charge cognitive des urbanistes :

1. **Modération Intelligente (Pipeline de Soumission)** :
   - Chaque avis libre soumis par un citoyen est instantanément analysé par l'IA.
   - Le texte est qualifié comme "Pertinent" (liés aux équipements, voiries, etc.) ou "Non-pertinent" (politique, insultes, hors-sujet).
   - L'IA filtre automatiquement les déchets de données avant même qu'ils n'atteignent le dashboard de l'urbaniste.
   - Système de "Race Timeout" (fallback sécurisé) assurant que l'expérience utilisateur n'est jamais bloquée par une défaillance réseau.

2. **Synthèse Analytique de Zone (Dashboard)** :
   - L'urbaniste peut générer, d'un simple clic, un résumé textuel analytique de toutes les opinions d'une zone donnée.
   - L'IA synthétise les urgences, dégage des tendances, et produit un rapport contextuel de 3 phrases hautement actionnable.
   - **Stratégie de Fallback** : En cas d'indisponibilité de l'API (ex: blocage CORS/Tracking des navigateurs stricts), un algorithme local de secours génère instantanément une synthèse statistique naturelle (Top catégories, Moyenne d'urgence).

---

## 🚀 Fonctionnalités Clés Implémentées

### 📊 Tableau de Bord Urbaniste (Nouveau)
Un environnement de travail centralisé géré par un contexte global (`UrbanZoneContext`) qui synchronise 5 onglets puissants lorsqu'une zone est sélectionnée :
1. **Carte Analytique** : Vue cartographique avec marqueurs conditionnels et outil de bascule vers une vue Heatmap simulée.
2. **Statistiques Pro** : Tableaux de bord de Business Intelligence propulsés par `Recharts` (Graphiques circulaires, courbes temporelles, KPI).
3. **Opinions Citoyennes** : Interface de lecture en grille responsives pour les requêtes validées, surmontée du module de Synthèse IA.
4. **Annotations Privées** : Espace sécurisé pour la rédaction de notes professionnelles sur le terrain (modèle d'Upsert).
5. **Rapport PDF** : Module de prévisualisation interactif et générateur d'export.

### 📄 Module de Reporting Avancé (jsPDF)
- Génération de rapports PDF de qualité professionnelle (`jspdf` + `jspdf-autotable`).
- Le rapport inclut le design system de l'application, les indicateurs clés, les tableaux statistiques croisés, la synthèse de l'IA, les annotations privées de l'urbaniste et le registre détaillé complet des plaintes de la zone.
- Architecturé avec des Promesses Parallèles (`Promise.all()`) pour une génération ultrarapide sans geler l'interface.

### 📱 UI/UX & Performances (Refonte Récente)
- **Design Responsive "Mobile First"** : Implémentation d'un Hook personnalisé (`useResponsive`) garantissant une adaptabilité totale sur Mobile et Tablette (CSS Grid/Flexbox fluides, cibles tactiles de 48px minimum).
- **Standardisation des Empty States** : Création d'un composant centralisé `EmptyState` pour remplacer les écrans vides de l'administration par des messages scénarisés clairs, incluant des appels à l'action.
- **Optimisation du Rendu** : Intégration avancée de `React.memo`, `useMemo` et `useCallback` dans tous les tableaux de bord analytiques pour éliminer les re-rendus superflus lors du redimensionnement ou du filtrage.
- **Résilience** : Renforcement des boucles de rendu cartographique (filtrage de sécurité des coordonnées Leaflet corrompues via `isValidCoords`).

### 📍 Moteur Cartographique Avancé
- **Système Leaflet.js** : Affichage hybride des clusters, marqueurs et Tooltips.
- **Formulaire à Étapes Géolocalisé** : Fluidité de l'UI pour récolter les informations avec validation stricte (statut du signalement, urgence, profil social de l'émetteur).

---

## 🛠️ Stack Technique
- **Frontend Core** : React 18, Vite.js
- **Design & Layout** : CSS Inline Uniquement (Architecture rigoureuse sans frameworks comme Tailwind).
- **Cartographie** : Leaflet.js & React-Leaflet
- **Data Visualization** : Recharts
- **Génération Documentaire** : jsPDF & jsPDF-AutoTable
- **Intelligence Artificielle** : API Anthropic (Claude-Sonnet)
- **Architecture de Données** : Persistance LocalStorage complexe (Mocking API de niveau production avec hooks d'auto-migration transparente des schémas de données pour gérer la rétrocompatibilité).

---

## 📈 Prochaines Étapes
1. **Migration Backend** : Connecter l'application à une base de données relationnelle (ex: Node.js/Express + PostgreSQL/PostGIS) pour remplacer l'adaptateur LocalStorage.
2. **Webhooks et Notifications** : Informer les citoyens par e-mail/SMS quand leur remarque change de statut ou est intégrée dans un rapport d'urbanisme officiel.
3. **Génération de Modèles 3D** : Connecter les données des zones à un moteur cartographique 3D (Cesium.js ou Mapbox GL) pour une prévisualisation immersive des futurs aménagements.
