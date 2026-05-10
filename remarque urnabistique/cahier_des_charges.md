# Cahier des Charges
## Système Web de Gestion des Remarques Urbanistiques

---

> **Projet de Fin d'Études (PFE)**
> **Framework :** Laravel (Backend API) + Node.js (Frontend)
> **Outil cartographique :** Leaflet.js
> **Année universitaire :** 2025–2026

---

## 1. Contexte et Problématique

Dans le cadre du développement urbain, les services de l'État et les collectivités territoriales ont besoin de **collecter des informations terrain** avant de lancer tout projet d'aménagement (lotissement, construction d'équipements publics, etc.).

Actuellement, cette collecte se fait de manière **informelle et non structurée**, ce qui entraîne :

- Un manque d'information sur les besoins réels des habitants
- Des décisions d'aménagement mal adaptées aux attentes de la population
- Une absence d'outil numérique participatif pour les citoyens

---

## 2. Objectifs du Projet

Le projet vise à concevoir et implanter un **système web participatif** permettant :

- Aux **citoyens** de signaler leurs besoins et propositions sur une carte interactive
- Aux **services de l'État** de collecter et analyser ces données avant toute réalisation de projet
- Aux **urbanistes** de visualiser les zones prioritaires et les types d'équipements demandés

---

## 3. Périmètre du Projet

Le système sera focalisé sur une **ville X** (à définir avec l'encadrant).
Il n'utilisera pas de plan cadastral officiel, mais s'appuiera sur **Leaflet.js** pour afficher et interagir avec la carte.

---

## 4. Acteurs du Système

| Acteur | Rôle |
|---|---|
| **Citoyen** | S'inscrit, se connecte, sélectionne une zone sur la carte et soumet une remarque ou proposition |
| **Administrateur** | Gère les utilisateurs, valide ou rejette les remarques, exporte les données |
| **Urbaniste / Service de l'État** | Consulte la carte, analyse les remarques, prend des décisions d'aménagement |

---

## 5. Besoins Fonctionnels

### 5.1 Module Authentification
- Inscription et connexion des citoyens
- Gestion des rôles (citoyen, admin, urbaniste)
- Récupération de mot de passe

### 5.2 Module Carte Interactive (Leaflet.js)
- Affichage de la carte centrée sur la ville cible
- Sélection d'une zone ou d'un point précis sur la carte
- Dessin de la zone concernée par la remarque (polygone, marker)
- Affichage des remarques existantes sous forme de marqueurs colorés

### 5.3 Module Soumission de Remarques
- Formulaire de saisie lié à la position sélectionnée sur la carte
- Champs : catégorie (hôpital, école, parc, route…), description, photo (optionnel)
- Statut de la remarque : En attente / Validée / Rejetée

### 5.4 Module Administration
- Tableau de bord avec statistiques (nombre de remarques, par catégorie, par zone)
- Liste filtrée des remarques (statut, date, catégorie, zone)
- Validation ou rejet d'une remarque avec commentaire
- Export des données en CSV ou PDF

### 5.5 Module Analyse & Visualisation
- Carte thermique (heatmap) des zones les plus demandées
- Graphiques : types d'équipements les plus demandés, répartition par zone
- Vue d'ensemble pour les décideurs urbanistiques

---

## 6. Besoins Non Fonctionnels

| Critère | Description |
|---|---|
| **Performance** | Chargement de la carte < 3 secondes |
| **Sécurité** | Authentification sécurisée, protection des données utilisateurs |
| **Responsive** | Interface adaptée mobile et desktop |
| **Scalabilité** | Architecture permettant d'étendre à d'autres villes |
| **Maintenabilité** | Code structuré, documenté, versionné sur GitHub |

---

## 7. Architecture Technique

```
Citoyen / Navigateur
        ↓
  Node.js (Frontend — React/Vue + Leaflet.js)
        ↓  Requêtes HTTP (REST API)
  Laravel (Backend — API + Auth + Business Logic)
        ↓
   Base de données MySQL
```

### Stack Technologique

| Composant | Technologie |
|---|---|
| Backend API | Laravel (PHP) |
| Frontend | Node.js + React ou Vue.js |
| Cartographie | Leaflet.js |
| Base de données | MySQL |
| Authentification | Laravel Sanctum |
| Temps réel (optionnel) | Socket.io |
| Hébergement | Serveur local ou VPS |

---

## 8. Modèle de Données (ERD simplifié)

```
users
 ├── id, nom, email, mot_de_passe, role, created_at

remarques
 ├── id, user_id (FK), categorie_id (FK), zone_id (FK)
 ├── description, photo, latitude, longitude
 ├── statut (en_attente | validee | rejetee)
 ├── commentaire_admin, created_at

categories
 ├── id, nom (hôpital, école, parc, route, autre)

zones
 ├── id, nom, coordonnees_geojson

```

---

## 9. Cas d'Utilisation Principaux

### UC1 — Soumettre une remarque (Citoyen)
1. Le citoyen se connecte
2. Il consulte la carte de la ville
3. Il clique sur une zone ou dessine un périmètre
4. Il remplit le formulaire (catégorie + description)
5. Il soumet la remarque
6. Le système enregistre la remarque avec statut "En attente"

### UC2 — Valider une remarque (Admin)
1. L'admin se connecte au tableau de bord
2. Il consulte la liste des remarques en attente
3. Il analyse la remarque et peut ajouter un commentaire
4. Il valide ou rejette la remarque
5. Le statut est mis à jour sur la carte

### UC3 — Analyser les données (Urbaniste)
1. L'urbaniste se connecte
2. Il consulte la carte avec les remarques validées
3. Il applique des filtres (catégorie, zone, période)
4. Il visualise la heatmap et les statistiques
5. Il exporte un rapport

---

## 10. Planning Prévisionnel

| Phase | Tâches | Durée estimée |
|---|---|---|
| **Phase 1** | Conception (UML, ERD, maquettes, architecture) | 2 semaines |
| **Phase 2** | Développement Backend (Laravel API, Auth, DB) | 3 semaines |
| **Phase 3** | Développement Frontend (Carte, Formulaires, UI) | 3 semaines |
| **Phase 4** | Dashboard Admin + Statistiques + Heatmap | 2 semaines |
| **Phase 5** | Tests, corrections, déploiement | 1 semaine |
| **Phase 6** | Rédaction du rapport PFE + préparation soutenance | 1 semaine |

---

## 11. Livrables

- [ ] Cahier des charges (ce document)
- [ ] Diagrammes UML (Use Case, Classe, Séquence)
- [ ] Schéma ERD de la base de données
- [ ] Maquettes / Wireframes (Figma ou papier)
- [ ] Code source complet (GitHub)
- [ ] Application web fonctionnelle (démo)
- [ ] Rapport PFE rédigé
- [ ] Présentation pour la soutenance

---

## 12. Conclusion

Ce projet répond à un **besoin réel** des services urbanistiques : disposer d'un outil numérique participatif pour collecter l'avis des citoyens **avant** la réalisation de tout projet d'aménagement. En combinant une carte interactive Leaflet.js avec un backend Laravel robuste, le système permettra une **prise de décision plus éclairée** et une **meilleure adéquation** entre les projets urbains et les attentes des habitants.

---

*Document préparé dans le cadre du Projet de Fin d'Études — 2025/2026*
