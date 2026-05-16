# Cahier des Charges — Suivi des Tâches Frontend

## Système Web de Gestion des Remarques Urbanistiques — UrbanMap

> **Projet de Fin d'Études (PFE)**
> **Stack :** React 18 + Vite + Tailwind CSS + Leaflet.js
> **Année universitaire :** 2025–2026

---

## 📋 Vue d'ensemble

| Tier | Nom | Durée |
|------|-----|-------|
| Tier 1 | Foundation Design System | 3 jours |
| Tier 2 | Pages Authentification | 2 jours |
| Tier 3 | Page Carte Interactive | 3 jours |
| Tier 4 | Dashboard Admin | 4 jours |
| Tier 5 | Dashboard Urbaniste | 3 jours |
| Tier 6 | Super Admin | 2 jours |
| Tier 7 | Mobile & Responsive | 2 jours |
| **Total** | | **~19 jours** |

---

## Tier 1 — Foundation Design System

### T1.1 Design Tokens & Global CSS

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Étendre `tailwind.config.js` — palette primary `#0f3460`, accent `#e94560`, neutral slate | ⬜ À faire |
| 2 | Ajouter shades 50→900 pour chaque couleur custom | ⬜ À faire |
| 3 | Configurer `fontFamily` Inter via Google Fonts | ⬜ À faire |
| 4 | Définir `borderRadius` et `boxShadow` custom (card, elevated) | ⬜ À faire |
| 5 | CSS variables globales — `--sidebar-width: 240px`, `--navbar-height: 64px` | ⬜ À faire |
| 6 | Scrollbar styles custom (thin, neutral) | ⬜ À faire |
| 7 | Classes utilitaires `.badge-*` — success, warning, danger, info | ⬜ À faire |
| 8 | Classes `.btn-primary`, `.btn-secondary`, `.btn-ghost` | ⬜ À faire |
| 9 | Animations custom — `fadeIn`, `slideIn`, `pulse` | ⬜ À faire |

---

### T1.2 Composants UI de Base

| # | Composant | Description | Statut |
|---|-----------|-------------|--------|
| 1 | `Button.jsx` | Variantes primary / secondary / ghost / danger + sizes sm/md/lg | ⬜ À faire |
| 2 | `Badge.jsx` | Variantes statut en_attente / validee / rejetee + catégories | ⬜ À faire |
| 3 | `Input.jsx` | Input avec label, error state, icône optionnelle | ⬜ À faire |
| 4 | `Select.jsx` | Select custom stylisé cohérent | ⬜ À faire |
| 5 | `Modal.jsx` | Modal accessible avec overlay, header, footer | ⬜ À faire |
| 6 | `Card.jsx` | Container avec variantes default / elevated / bordered | ⬜ À faire |
| 7 | `Spinner.jsx` | Loading spinner animé | ⬜ À faire |
| 8 | `Avatar.jsx` | Avatar avec initiales et couleur générée | ⬜ À faire |
| 9 | `Tooltip.jsx` | Tooltip simple au hover | ⬜ À faire |
| 10 | `index.js` | Exports centralisés dans `/src/components/ui/` | ⬜ À faire |

---

### T1.3 Layout Shell

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Créer `DashboardLayout.jsx` — sidebar fixe + main content scrollable | ⬜ À faire |
| 2 | Créer `Sidebar.jsx` — navigation verticale avec logo, liens par rôle, user info en bas | ⬜ À faire |
| 3 | Refactoriser `Navbar.jsx` — supprimer inline styles, convertir en Tailwind | ⬜ À faire |
| 4 | Navigation active state dans sidebar (highlight lien courant) | ⬜ À faire |
| 5 | Sidebar collapsible sur desktop avec bouton toggle | ⬜ À faire |
| 6 | Mobile — sidebar devient drawer avec overlay | ⬜ À faire |
| 7 | Créer `PageHeader.jsx` — titre + sous-titre + actions CTA à droite | ⬜ À faire |

---

## Tier 2 — Pages Authentification

### T2.1 Page Login

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Supprimer tous les `style={{}}` inline existants | ⬜ À faire |
| 2 | Layout deux colonnes — gauche branding, droite formulaire | ⬜ À faire |
| 3 | Panneau gauche — logo, tagline, illustration SVG ville | ⬜ À faire |
| 4 | Panneau droit — formulaire centré avec shadow card | ⬜ À faire |
| 5 | Champs Email et Mot de passe avec icônes | ⬜ À faire |
| 6 | Toggle show/hide password | ⬜ À faire |
| 7 | Bouton submit avec état loading (spinner inline) | ⬜ À faire |
| 8 | Message d'erreur stylisé (alert rouge avec icône) | ⬜ À faire |
| 9 | Responsive — une colonne sur mobile | ⬜ À faire |

---

### T2.2 Page Register

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Layout identique à Login (deux colonnes) | ⬜ À faire |
| 2 | Champs — Nom, Email, Mot de passe, Confirmation | ⬜ À faire |
| 3 | Validation temps réel — password match indicator | ⬜ À faire |
| 4 | Force du mot de passe — barre colorée indicateur | ⬜ À faire |
| 5 | Bouton submit avec état loading | ⬜ À faire |
| 6 | Message succès après inscription | ⬜ À faire |

---

### T2.3 Page Forgot Password

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Layout card centré une colonne | ⬜ À faire |
| 2 | Champ email avec instruction claire | ⬜ À faire |
| 3 | État "email envoyé" avec icône success | ⬜ À faire |
| 4 | Lien retour vers Login | ⬜ À faire |

---

## Tier 3 — Page Carte Interactive (Citoyen)

### T3.1 Refonte Navbar Carte

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Supprimer tous les `style={{}}` inline de `Navbar.jsx` | ⬜ À faire |
| 2 | Convertir en Tailwind classes uniquement | ⬜ À faire |
| 3 | Remplacer emojis par icônes Heroicons / Lucide | ⬜ À faire |
| 4 | Améliorer searchbar — border, focus ring, icône loupe | ⬜ À faire |
| 5 | Filtres catégorie — pills cliquables avec couleur active | ⬜ À faire |
| 6 | Bouton Dashboard et Logout avec styles propres | ⬜ À faire |

---

### T3.2 Panel Soumission Remarque

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte complète du panel slide-in droit | ⬜ À faire |
| 2 | Header panel avec titre et bouton fermer | ⬜ À faire |
| 3 | Sélecteur catégorie — grid d'icônes colorées cliquables | ⬜ À faire |
| 4 | Champ description avec compteur caractères | ⬜ À faire |
| 5 | Upload photo — drag & drop zone avec preview | ⬜ À faire |
| 6 | Coordonnées affichées en read-only stylisé | ⬜ À faire |
| 7 | Bouton soumettre avec état loading et succès | ⬜ À faire |
| 8 | Animation d'ouverture/fermeture du panel | ⬜ À faire |

---

### T3.3 Popup Détail Remarque

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte popup Leaflet avec styles custom | ⬜ À faire |
| 2 | Badge statut coloré (en_attente / validee / rejetee) | ⬜ À faire |
| 3 | Icône catégorie + nom catégorie | ⬜ À faire |
| 4 | Photo thumbnail si disponible | ⬜ À faire |
| 5 | Date formatée et nom auteur | ⬜ À faire |
| 6 | Commentaire admin affiché si présent | ⬜ À faire |

---

### T3.4 Légende & Contrôles Carte

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte légende bas-gauche — card propre avec couleurs catégories | ⬜ À faire |
| 2 | Contrôle heatmap toggle (on/off) | ⬜ À faire |
| 3 | Compteur remarques visibles sur la carte | ⬜ À faire |
| 4 | Bouton "Ma position" avec géolocalisation | ⬜ À faire |

---

## Tier 4 — Dashboard Admin

### T4.1 Layout Dashboard Admin

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Appliquer `DashboardLayout.jsx` à `AdminDashboard.jsx` | ⬜ À faire |
| 2 | Sidebar avec liens — Remarques, Zones, Statistiques, Export, Utilisateurs | ⬜ À faire |
| 3 | Supprimer système de tabs existant, remplacer par routes sidebar | ⬜ À faire |
| 4 | Header page avec titre dynamique selon section active | ⬜ À faire |

---

### T4.2 Stats Cards Admin

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `StatsCards.jsx` — 4 cards en grid responsive | ⬜ À faire |
| 2 | Card total remarques avec icône et tendance | ⬜ À faire |
| 3 | Card remarques en attente avec badge warning | ⬜ À faire |
| 4 | Card remarques validées avec badge success | ⬜ À faire |
| 5 | Card remarques rejetées avec badge danger | ⬜ À faire |
| 6 | Animation count-up au chargement des chiffres | ⬜ À faire |

---

### T4.3 Table Remarques Admin

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `RemarquesTable.jsx` — supprimer inline styles | ⬜ À faire |
| 2 | Header table avec filtres — statut, catégorie, zone, date | ⬜ À faire |
| 3 | Colonne statut avec badge coloré | ⬜ À faire |
| 4 | Colonne catégorie avec icône | ⬜ À faire |
| 5 | Colonne actions — boutons Voir / Valider / Rejeter | ⬜ À faire |
| 6 | Pagination stylisée en bas de table | ⬜ À faire |
| 7 | État vide stylisé avec illustration | ⬜ À faire |
| 8 | Skeleton loader pendant chargement | ⬜ À faire |

---

### T4.4 Modal Validation Remarque

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `ValidationPanel.jsx` en modal centré | ⬜ À faire |
| 2 | Afficher détails complets de la remarque dans la modal | ⬜ À faire |
| 3 | Champ commentaire admin avec textarea stylisé | ⬜ À faire |
| 4 | Boutons Valider (vert) et Rejeter (rouge) avec confirmation | ⬜ À faire |
| 5 | État loading pendant soumission | ⬜ À faire |
| 6 | Toast succès/erreur après action | ⬜ À faire |

---

### T4.5 Gestion Zones Admin

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `AdminZonesTab.jsx` — layout deux colonnes (liste + carte) | ⬜ À faire |
| 2 | Liste zones avec card par zone | ⬜ À faire |
| 3 | Bouton créer zone avec modal formulaire | ⬜ À faire |
| 4 | Mini-carte Leaflet pour visualiser zone sélectionnée | ⬜ À faire |
| 5 | Actions éditer / supprimer par zone | ⬜ À faire |

---

### T4.6 Export Admin

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `AdminExportTab.jsx` — layout card propre | ⬜ À faire |
| 2 | Filtres de sélection avant export (période, catégorie, statut) | ⬜ À faire |
| 3 | Bouton Export CSV avec icône download | ⬜ À faire |
| 4 | Bouton Export PDF avec icône download | ⬜ À faire |
| 5 | Preview du nombre de lignes qui seront exportées | ⬜ À faire |
| 6 | État loading pendant génération fichier | ⬜ À faire |

---

### T4.7 Statistiques Admin

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `AdminStatistiquesTab.jsx` | ⬜ À faire |
| 2 | Graphique donut — répartition par catégorie (Recharts) | ⬜ À faire |
| 3 | Graphique barres — remarques par zone | ⬜ À faire |
| 4 | Graphique ligne — évolution temporelle des soumissions | ⬜ À faire |
| 5 | Chaque graphique dans sa propre Card avec titre | ⬜ À faire |
| 6 | Skeleton loaders pendant chargement des graphiques | ⬜ À faire |

---

## Tier 5 — Dashboard Urbaniste

### T5.1 Layout Dashboard Urbaniste

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Appliquer `DashboardLayout.jsx` à `UrbanisteDashboard.jsx` | ⬜ À faire |
| 2 | Sidebar avec liens — Carte, Annotations, Statistiques, Rapport, Opinions | ⬜ À faire |
| 3 | Header page avec exports rapides en CTA | ⬜ À faire |

---

### T5.2 Onglet Carte Urbaniste

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `UrbanCarteTab.jsx` — layout carte pleine hauteur | ⬜ À faire |
| 2 | Panneau filtres latéral gauche (catégorie, zone, période, statut) | ⬜ À faire |
| 3 | Toggle heatmap avec slider intensité | ⬜ À faire |
| 4 | Légende claire des couleurs catégories | ⬜ À faire |
| 5 | Compteur remarques filtrées affiché au-dessus carte | ⬜ À faire |

---

### T5.3 Onglet Statistiques Urbaniste

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `UrbanStatistiquesTab.jsx` | ⬜ À faire |
| 2 | KPI cards en haut — total, validées, zones actives | ⬜ À faire |
| 3 | Graphique barres horizontales — top catégories demandées | ⬜ À faire |
| 4 | Graphique ligne — tendance mensuelle | ⬜ À faire |
| 5 | Tableau top zones prioritaires avec score | ⬜ À faire |

---

### T5.4 Onglet Rapport Urbaniste

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `UrbanRapportTab.jsx` — layout éditorial propre | ⬜ À faire |
| 2 | Sélection période pour le rapport | ⬜ À faire |
| 3 | Preview rapport avant export | ⬜ À faire |
| 4 | Bouton export PDF stylisé | ⬜ À faire |

---

### T5.5 Onglet Annotations Urbaniste

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Refonte `UrbanAnnotationsTab.jsx` | ⬜ À faire |
| 2 | Liste annotations avec card par annotation | ⬜ À faire |
| 3 | Formulaire ajout annotation stylisé | ⬜ À faire |
| 4 | Actions éditer / supprimer annotation | ⬜ À faire |

---

## Tier 6 — Super Admin

### T6.1 Page Super Admin

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Appliquer `DashboardLayout.jsx` à `SuperAdminPage.jsx` | ⬜ À faire |
| 2 | Refonte `UserManagement.jsx` — table utilisateurs | ⬜ À faire |
| 3 | Colonne rôle avec badge coloré par rôle | ⬜ À faire |
| 4 | Actions par utilisateur — changer rôle, désactiver, supprimer | ⬜ À faire |
| 5 | Modal confirmation pour actions destructives | ⬜ À faire |
| 6 | Filtres — par rôle, par statut, recherche par nom/email | ⬜ À faire |
| 7 | Bouton créer utilisateur avec modal formulaire | ⬜ À faire |

---

## Tier 7 — Mobile & Responsive

### T7.1 Responsive Global

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Tester et corriger toutes les pages sur mobile 375px | ⬜ À faire |
| 2 | Sidebar → drawer mobile avec hamburger menu | ⬜ À faire |
| 3 | Tables → scroll horizontal sur mobile | ⬜ À faire |
| 4 | Stats cards → une colonne sur mobile | ⬜ À faire |
| 5 | Graphiques → hauteur adaptée sur mobile | ⬜ À faire |
| 6 | Panel carte → bottom sheet sur mobile | ⬜ À faire |
| 7 | Navbar carte → compact sur mobile | ⬜ À faire |

---

## Légende des statuts

| Icône | Signification |
|-------|---------------|
| ⬜ À faire | Tâche non commencée |
| 🟡 En cours | Tâche en cours de développement |
| ✅ Terminé | Tâche complétée et testée |
| 🔴 Bloqué | Tâche bloquée par dépendance |

---

*Document préparé dans le cadre du Projet de Fin d'Études — 2025/2026*
