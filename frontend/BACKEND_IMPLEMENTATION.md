# UrbanMap Maroc — Documentation Complète
## Contexte Projet + Implémentation Frontend + Plan Backend Laravel

---

## 1. Contexte & Vision du Projet

**UrbanMap Maroc** est une plateforme web de gestion participative urbaine, développée comme projet de fin d'études (PFE). Elle permet aux citoyens marocains de signaler des problèmes urbains géolocalisés dans leur ville, et aux professionnels de l'urbanisme de les analyser, les cartographier et les intégrer dans des rapports officiels.

### Problématique Résolue
Les collectivités locales manquent d'un outil centralisé pour collecter, prioriser et analyser les remarques citoyennes sur le terrain urbain. UrbanMap comble ce vide en créant un pont numérique entre le citoyen lambda et l'urbaniste professionnel.

### Principe Clé : Isolation Territoriale
Chaque utilisateur (admin, urbaniste, citoyen) est lié à **une ville spécifique** (`user.city` enregistré à l'inscription). Toutes les données affichées (zones, remarques, cartes) sont **filtrées automatiquement** par ville. La carte Leaflet est verrouillée géographiquement : l'utilisateur **ne peut pas sortir de sa ville assignée**.

---

## 2. Architecture Frontend (État Actuel)

### Stack Technique
- **Framework :** React 18 + Vite
- **Routage :** React Router v6
- **Cartographie :** Leaflet.js + react-leaflet + leaflet-draw
- **Persistance (Mock) :** `localStorage` (remplacé par Laravel à terme)
- **Style :** Inline styles uniquement (pas de Tailwind, pas de CSS modules)
- **IA :** `aiService.js` (appels simulés avec GPT/Groq selon la config)
- **PDF :** `jsPDF` via `pdfService.js`

### Arborescence des Fichiers Clés

```
src/
├── App.jsx                         # Routeur principal + providers
├── context/
│   ├── AuthContext.jsx             # user, token, login(), logout()
│   ├── ToastContext.jsx            # Notifications globales
│   └── UrbanZoneContext.jsx        # Zone sélectionnée partagée entre tabs urbaniste
├── pages/
│   ├── Login.jsx                   # Page de connexion
│   ├── Register.jsx                # Page d'inscription (avec sélection ville + rôle)
│   ├── ForgotPassword.jsx          # Réinitialisation mot de passe
│   ├── MapPage.jsx                 # Interface Citoyen (carte + formulaire remarque)
│   ├── AdminDashboard.jsx          # Interface Admin (4 onglets)
│   ├── UrbanisteDashboard.jsx      # Interface Urbaniste (5 onglets)
│   ├── SuperAdminPage.jsx          # Gestion des comptes en attente
│   └── NotFound.jsx                # Page 404
├── components/
│   ├── Navbar.jsx                  # Barre de navigation commune
│   ├── ProtectedRoute.jsx          # Garde les routes par rôle
│   ├── EmptyState.jsx              # Composant état vide réutilisable
│   ├── SkeletonTable.jsx           # Skeleton loader pour tableaux
│   └── dashboard/
│       ├── AdminRemarquesTab.jsx   # Admin : liste et modération des remarques
│       ├── AdminZonesTab.jsx       # Admin : carte + dessin + CRUD zones
│       ├── AdminStatistiquesTab.jsx # Admin : graphiques et KPIs
│       ├── AdminExportTab.jsx      # Admin : export CSV des données
│       ├── UrbanCarteTab.jsx       # Urbaniste : carte des zones + remarques
│       ├── UrbanOpinionsTab.jsx    # Urbaniste : liste des opinions citoyennes
│       ├── UrbanStatistiquesTab.jsx # Urbaniste : statistiques par zone
│       ├── UrbanAnnotationsTab.jsx # Urbaniste : annotations privées par zone
│       └── UrbanRapportTab.jsx     # Urbaniste : génération PDF
├── services/
│   ├── api.js                      # Mock API principale (auth + remarques)
│   ├── adminApi.js                 # Mock API Admin (zones + remarques admin)
│   ├── urbanApi.js                 # Mock API Urbaniste (zones + annotations + IA)
│   ├── aiService.js                # Intégration IA (résumés, validation opinions)
│   ├── pdfService.js               # Génération de rapports PDF (jsPDF)
│   ├── validationService.js        # Validation formulaires (nom zone, annotation, etc.)
│   └── errorHandler.js             # Gestion centralisée des erreurs API
├── utils/
│   └── cityBounds.js               # Config géographique des villes marocaines
└── hooks/
    └── useResponsive.js            # Hook responsive (isMobile)
```

---

## 3. Rôles & Parcours Utilisateurs

### 3.1 `super_admin` → `/super-admin/users`
- Valide ou rejette les comptes `admin` et `urbaniste` en attente (`statut: pending`)
- Peut changer le rôle d'un utilisateur
- N'a pas accès à la carte ni aux données de contenu

### 3.2 `admin` → `/admin/dashboard`
**4 onglets :**

| Onglet | Composant | Fonctionnalité |
|--------|-----------|----------------|
| Remarques | `AdminRemarquesTab` | Voir, filtrer, modérer (valider/rejeter), commenter les remarques citoyennes de sa ville |
| Zones | `AdminZonesTab` | Carte Leaflet avec dessin de polygones. CRUD complet des zones officielles de sa ville |
| Statistiques | `AdminStatistiquesTab` | KPIs (total remarques, urgences, par statut), graphiques par catégorie et par zone |
| Export CSV | `AdminExportTab` | Exporter les remarques de sa ville en fichier CSV |

**Restriction :** La carte admin est verrouillée sur la ville de l'admin. Les zones créées sont automatiquement associées à sa ville.

### 3.3 `urbaniste` → `/urbaniste/dashboard`
**5 onglets :**

| Onglet | Composant | Fonctionnalité |
|--------|-----------|----------------|
| Carte | `UrbanCarteTab` | Carte des zones de sa ville, marqueurs des remarques, filtres, heatmap |
| Opinions | `UrbanOpinionsTab` | Détail des remarques citoyennes validées de sa ville, avec résumés IA |
| Statistiques | `UrbanStatistiquesTab` | Graphiques avancés par zone, catégorie, urgence, profil |
| Annotations | `UrbanAnnotationsTab` | Notes privées par zone (non visibles des citoyens) incluses dans les PDFs |
| Rapport | `UrbanRapportTab` | Génération de rapports PDF professionnels par zone |

**Contexte partagé :** `UrbanZoneContext` permet de sélectionner une zone sur la carte et de filtrer automatiquement tous les autres onglets (opinions, stats, annotations) sur cette zone.

### 3.4 `citoyen` → `/map`
- Carte Leaflet verrouillée sur sa ville (impossible de sortir de la bounding box)
- Peut déposer une remarque géolocalisée (formulaire complet : catégorie, urgence, profil, opinion, photo)
- Voit les zones officielles et les remarques approuvées de sa ville sur la carte
- Pas d'accès aux données internes (annotations urbaniste, commentaires admin)

---

## 4. Système d'Authentification (Frontend Mock)

### AuthContext (`src/context/AuthContext.jsx`)
```javascript
// Données stockées dans localStorage
{
  token: "mock_token_xxx",          // Futur: Bearer token Sanctum
  user: {
    id: "u1",
    nom: "Ahmed Alaoui",
    email: "ahmed@example.com",
    role: "admin",                  // "citoyen" | "admin" | "urbaniste" | "super_admin"
    city: "marrakesh",              // Ville assignée (minuscule, utilisée pour filtrer)
    statut: "active"                // "pending" | "active" | "rejected"
  }
}
```

### ProtectedRoute (`src/components/ProtectedRoute.jsx`)
- Redirige vers `/login` si non connecté
- Redirige vers le dashboard du rôle si le rôle ne correspond pas
- Exemple : un `citoyen` qui accède à `/admin/dashboard` → redirigé vers `/map`

### Inscription (`src/pages/Register.jsx`)
- Champs : `nom`, `email`, `password`, `role`, `city`, `company_name` (si urbaniste/admin)
- Si `role = citoyen` → `statut: active` immédiatement
- Si `role = admin` ou `urbaniste` → `statut: pending` en attente de validation super_admin

---

## 5. Système Cartographique

### Bibliothèque : `src/utils/cityBounds.js`
Contient la configuration géographique pour 10 villes marocaines :
- **Casablanca, Marrakech, Rabat, Fès, Tanger, Agadir, Meknès, Oujda, Kénitra, Tétouan**

Chaque ville a :
```javascript
{
  center: [lat, lng],         // Centre de la carte au chargement
  zoom: 13,                   // Zoom initial
  minZoom: 11,                // Zoom minimum (impossible de voir d'autres villes)
  bounds: [[swLat, swLng], [neLat, neLng]]  // Bounding box stricte
}
```

### Verrouillage des Cartes
Toutes les cartes utilisent :
```jsx
<MapContainer
  center={cityConfig.center}
  zoom={15}
  zoomControl={false}           // Désactive le contrôle par défaut
  maxBounds={cityConfig.bounds}
  maxBoundsViscosity={1.0}      // Hard wall : impossible de sortir
>
  <ZoomControl position="topleft" />  // Un seul contrôle zoom
  <MapController ... />              // Composant qui force les bounds dynamiquement
  ...
</MapContainer>
```

---

## 6. Fonctionnalité : Annotations Privées (Urbaniste)

### Rôle
L'urbaniste peut rédiger des **notes professionnelles confidentielles** pour chaque zone. Ces annotations :
- Ne sont **pas visibles** par les citoyens ni dans l'interface publique
- Sont associées à `zone_id` et `urbaniste_id`
- Sont incluses automatiquement dans les **rapports PDF** générés

### Implémentation Frontend
- **Composant :** `src/components/dashboard/UrbanAnnotationsTab.jsx`
- **API Mock :** `src/services/urbanApi.js` → `getAnnotations(zoneId)`, `saveAnnotation(zoneId, texte)`, `deleteAnnotation(id)`
- **Stockage :** `localStorage` avec clé `annotations_mock_data`
- **Logique upsert :** Une annotation par zone par urbaniste (si elle existe, elle est mise à jour ; sinon créée)
- **Dans le PDF :** `src/services/pdfService.js` → Section "ANNOTATIONS PRIVÉES" incluse si `annotations.length > 0`

### Endpoints Backend à Implémenter
```
GET    /api/zones/{zone_id}/annotations     # Récupérer les annotations d'une zone
POST   /api/annotations                    # Créer/Mettre à jour une annotation
PATCH  /api/annotations/{id}               # Modifier le texte
DELETE /api/annotations/{id}               # Supprimer
GET    /api/urbanistes/{user_id}/annotations  # Toutes les annotations d'un urbaniste
```

---

## 7. Fonctionnalité : Génération de Rapports PDF

### Composant : `src/components/dashboard/UrbanRapportTab.jsx`
### Service : `src/services/pdfService.js`

Le PDF généré par zone contient :
1. En-tête (nom de la zone, ville, date de génération)
2. Statistiques globales (nombre de remarques, urgence moyenne)
3. Répartition par catégorie
4. Liste des remarques validées (avec opinions)
5. Résumé IA de la zone (si disponible)
6. **Annotations privées de l'urbaniste** (si disponibles)

---

## 8. Intégration IA

### Service : `src/services/aiService.js`
- Génère des **résumés automatiques** des remarques par zone (pour l'urbaniste)
- **Valide sémantiquement** les opinions des citoyens avant soumission (pour éviter les contenus hors-sujet)
- Provider configurable : OpenAI GPT ou Groq (Llama/Mixtral)

### Endpoints Backend à Implémenter
```
GET   /api/zones/{zone_id}/summary    # Récupérer le résumé IA existant
POST  /api/zones/{zone_id}/summary    # Générer + sauvegarder un résumé IA
POST  /api/remarques/validate-opinion  # Valider sémantiquement une opinion
```

---

## 9. Services Mock → Migration Backend Laravel

### Correspondance des services à remplacer

| Fichier Mock Actuel | Méthodes principales | Endpoint Laravel cible |
|--------------------|--------------------|------------------------|
| `api.js` | `post('/login')`, `post('/register')`, `get('/user')`, `getRemarks()`, `post('/remarques')` | `/api/auth/*`, `/api/remarques` |
| `adminApi.js` | `getZones()`, `createZone()`, `updateZone()`, `deleteZone()`, `getRemarks()`, `updateRemarkStatus()` | `/api/zones`, `/api/remarques` |
| `urbanApi.js` | `getZonesWithStats()`, `getValidatedRemarks()`, `getAnnotations()`, `saveAnnotation()`, `getZoneAiSummary()` | `/api/zones`, `/api/annotations`, `/api/zones/{id}/summary` |
| `api.js (annotations)` | `saveAnnotation()`, `updateAnnotation()`, `deleteAnnotation()` | `/api/annotations` |

### Stratégie de migration
```javascript
// AVANT (Mock)
const zones = await getZones();

// APRÈS (Laravel)
const response = await axios.get('/api/zones', {
  headers: { Authorization: `Bearer ${token}` },
  params: { city: user.city }
});
const zones = response.data.data;
```

---

## 10. Plan d'Implémentation Backend (Laravel)

### Stack Recommandée
- **Framework :** Laravel 11.x (PHP 8.2+)
- **Base de données :** MySQL 8.0+
- **Authentification :** Laravel Sanctum (tokens Bearer)
- **Fichiers :** Laravel Storage (photos des remarques)
- **IA :** Appels depuis le backend via `Http::withToken()` vers OpenAI/Groq

### 10.1 Modèle de Données

#### Table `users`
| Champ | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `nom` | string | |
| `email` | string, unique | |
| `password` | string, bcrypt | |
| `role` | enum | `super_admin`, `admin`, `urbaniste`, `citoyen` |
| `statut` | enum | `pending` (défaut admin/urbaniste), `active` (défaut citoyen), `rejected` |
| `city` | string, nullable | Ville assignée (minuscule, ex: `marrakesh`) |
| `company_name` | string, nullable | Pour admin/urbaniste |
| `created_at`, `updated_at` | timestamps | |

#### Table `zones`
| Champ | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `nom` | string | |
| `ville` | string | Correspond à `users.city` |
| `couleur` | string | Code hex ex: `#3b82f6` |
| `coordonnees` | json | Array de `[lat, lng]` (polygone Leaflet) |
| `centre_lat` | decimal(10,7) | Calculé automatiquement |
| `centre_lng` | decimal(10,7) | Calculé automatiquement |
| `created_at`, `updated_at` | timestamps | |

#### Table `remarques`
| Champ | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `user_id` | FK → users | Citoyen auteur |
| `zone_id` | FK → zones | Zone concernée |
| `categorie` | string | ex: `Voirie`, `Patrimoine`, `Espaces Verts` |
| `statut` | enum | `en_attente`, `validee`, `rejete`, `planifie`, `urgent` |
| `urgency` | tinyint | 1 à 5 |
| `profile` | string | ex: `Résident`, `Visiteur` |
| `residence_duration` | string | |
| `problems` | json | Tableau de problèmes identifiés |
| `opinion` | text | Description détaillée du citoyen |
| `opinion_ai_validated` | boolean | Défaut: false |
| `opinion_ai_summary` | text, nullable | Résumé IA de l'opinion |
| `commentaire_admin` | text, nullable | Note interne de l'admin |
| `photo_path` | string, nullable | Chemin fichier sur le storage |
| `latitude` | decimal(10,7) | Point de signalement |
| `longitude` | decimal(10,7) | |
| `created_at`, `updated_at` | timestamps | |

#### Table `annotations_urbanistes`
| Champ | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `zone_id` | FK → zones | |
| `urbaniste_id` | FK → users | |
| `texte` | text | Contenu de la note privée |
| `created_at`, `updated_at` | timestamps | |

#### Table `zone_ai_summaries`
| Champ | Type | Notes |
|-------|------|-------|
| `id` | PK | |
| `zone_id` | FK → zones | Unique par zone |
| `summary_text` | text | Résumé généré par l'IA |
| `generated_at` | timestamp | |

### 10.2 Routes API

```
# Auth (public)
POST   /api/register
POST   /api/login
POST   /api/logout              [auth:sanctum]
GET    /api/user                [auth:sanctum]

# Super Admin
GET    /api/users               [auth:sanctum, role:super_admin]
GET    /api/users/pending       [auth:sanctum, role:super_admin]
PATCH  /api/users/{id}         [auth:sanctum, role:super_admin]

# Zones (filtrées par ville via query param ou token)
GET    /api/zones              [auth:sanctum]       ?city=marrakesh
POST   /api/zones              [auth:sanctum, role:admin]
PATCH  /api/zones/{id}        [auth:sanctum, role:admin]
DELETE /api/zones/{id}        [auth:sanctum, role:admin]

# Remarques
GET    /api/remarques          [auth:sanctum]       ?city=&zone_id=&statut=&category=
POST   /api/remarques          [auth:sanctum, role:citoyen]
PATCH  /api/remarques/{id}    [auth:sanctum, role:admin]

# Annotations Privées
GET    /api/zones/{id}/annotations    [auth:sanctum, role:urbaniste|admin]
POST   /api/annotations               [auth:sanctum, role:urbaniste]
PATCH  /api/annotations/{id}         [auth:sanctum, role:urbaniste]
DELETE /api/annotations/{id}         [auth:sanctum, role:urbaniste]

# Résumés IA
GET    /api/zones/{id}/summary       [auth:sanctum, role:urbaniste|admin]
POST   /api/zones/{id}/summary       [auth:sanctum, role:urbaniste]
```

### 10.3 Sécurité & Middlewares

1. **CORS :** Autoriser `http://localhost:5173` (Vite dev server) dans `config/cors.php`
2. **CheckRole Middleware :** Créer `app/Http/Middleware/CheckRole.php` qui vérifie `$request->user()->role`
3. **City Filter :** Sur chaque requête de données, filtrer par `WHERE zones.ville = $request->user()->city`
4. **Form Requests :** Valider les inputs avec des classes dédiées (`StoreRemarqueRequest`, `StoreZoneRequest`)
5. **Rate Limiting :** Limiter `/login` et `/register` à 5 tentatives/minute

### 10.4 Étapes d'Implémentation

1. `composer create-project laravel/laravel urbanmap-backend`
2. Configurer `.env` (DB_CONNECTION, DB_DATABASE, etc.)
3. Installer Sanctum : `composer require laravel/sanctum` + `php artisan sanctum:install`
4. Créer et exécuter les migrations (`php artisan migrate`)
5. Créer les Seeders : super_admin par défaut + zones/remarques de test
6. Développer les Controllers (AuthController, ZoneController, RemarqueController, AnnotationController)
7. Définir les routes dans `routes/api.php`
8. **Connecter le Frontend :** Remplacer les appels `localStorage` dans `src/services/api.js` par des appels `axios` avec le Bearer token Sanctum

---

## 11. Filtrage par Ville — Implémentation Critique

### Frontend (déjà en place)
```javascript
// Dans adminApi.js — filtrage côté client (mock)
const cityZones = fetchedZones.filter(z =>
  z.ville?.toLowerCase().trim() === userCity.toLowerCase().trim()
);

// Dans cityBounds.js — verrouillage carte
const cityConfig = getCityMapConfig(user.city);
// → maxBounds, minZoom, center automatiquement définis
```

### Backend (à implémenter)
```php
// ZoneController.php
public function index(Request $request) {
    $city = $request->user()->city;
    $zones = Zone::where('ville', $city)->get();
    return response()->json(['data' => $zones]);
}

// RemarqueController.php
public function index(Request $request) {
    $city = $request->user()->city;
    $remarques = Remarque::whereHas('zone', fn($q) => $q->where('ville', $city))
                         ->with(['zone', 'user'])
                         ->get();
    return response()->json(['data' => $remarques]);
}
```

> **Important :** Le filtrage côté backend est la sécurité définitive. Le filtrage frontend actuel est uniquement un masquage UI, pas une vraie protection des données.
