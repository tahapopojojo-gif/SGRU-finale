# UrbanMap Maroc — Full Project Documentation

> **Purpose:** A civic-tech platform for Moroccan cities (initially Marrakesh) where citizens report urban problems (roads, lighting, waste, water, parks, transport) and authorities manage them via a dashboard.
>
> **Stack:** Laravel 12 (backend API) + React 19 / Vite (frontend SPA) + SQLite (dev) + Leaflet (maps) + SMTP/Gmail (email).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend (Laravel)](#2-backend-laravel)
   - [Directory Structure](#21-directory-structure)
   - [Database Schema (Migrations)](#22-database-schema-migrations)
   - [Models](#23-models)
   - [API Routes](#24-api-routes)
   - [Controllers](#25-controllers)
   - [Form Requests (Validation)](#26-form-requests-validation)
   - [Mailables & Email Templates](#27-mailables--email-templates)
   - [Seeders](#28-seeders)
   - [Middleware](#29-middleware)
   - [Configuration](#210-configuration)
3. [Frontend (React)](#3-frontend-react)
   - [Directory Structure](#31-directory-structure)
   - [App Entry & Routing](#32-app-entry--routing)
   - [Pages](#33-pages)
   - [Services / API Layer](#34-services--api-layer)
   - [Context Providers](#35-context-providers)
   - [Components](#36-components)
   - [Key UI Patterns](#37-key-ui-patterns)
4. [Key Features Implemented](#4-key-features-implemented)
   - [Citizen Map (CitizenMapPage)](#41-citizen-map-citizenmappage)
   - [Professional Map (MapPage)](#42-professional-map-mappage)
   - [Admin Dashboard](#43-admin-dashboard)
   - [Urbaniste Dashboard](#44-urbaniste-dashboard)
   - [Super Admin Page](#45-super-admin-page)
   - [Email System](#46-email-system)
   - [Onboarding Tour](#47-onboarding-tour)
5. [Roles & Permissions](#5-roles--permissions)
6. [Running the App](#6-running-the-app)
7. [Diagrams & Reports (Data Flow)](#7-diagrams--reports-data-flow)
8. [Known Quirks & Conventions](#8-known-quirks--conventions)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vite + React 19)     port 5173                   │
│  src/pages/CitizenMapPage.jsx                               │
│  src/pages/MapPage.jsx                                      │
│  src/pages/AdminDashboard.jsx                               │
│  ...                                                        │
├─────────────────────────────────────────────────────────────┤
│  axios ──► http://localhost:8000/api                        │
├─────────────────────────────────────────────────────────────┤
│  Backend (Laravel 12 API)        port 8000                  │
│  routes/api.php                                             │
│  Controllers, Models, Mailables                             │
├─────────────────────────────────────────────────────────────┤
│  SQLite database (database/database.sqlite)                 │
│  Queue: database driver (jobs table)                        │
│  Mail: SMTP via Gmail (queue)                               │
└─────────────────────────────────────────────────────────────┘
```

- **Auth:** Laravel Sanctum (token-based). Token stored in `localStorage`, attached automatically by `axiosInstance.js`.
- **Queue:** `QUEUE_CONNECTION=database`. Emails are queued into the `jobs` table. A `php artisan queue:work` process must be running for emails to actually send.
- **Mail:** Gmail SMTP with app password. Sender: `yahyaprogrammation@gmail.com`.

---

## 2. Backend (Laravel)

### 2.1 Directory Structure

```
urbanmap-backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   ├── RemarqueController.php
│   │   │   ├── ZoneController.php
│   │   │   ├── UserController.php
│   │   │   ├── DashboardController.php
│   │   │   ├── AnnotationController.php
│   │   │   └── ZoneSummaryController.php
│   │   ├── Middleware/
│   │   │   └── CheckRole.php
│   │   └── Requests/
│   │       ├── LoginRequest.php
│   │       ├── RegisterRequest.php
│   │       ├── StoreRemarqueRequest.php
│   │       ├── UpdateRemarqueRequest.php
│   │       ├── StoreZoneRequest.php
│   │       ├── StoreAnnotationRequest.php
│   │       └── UpdateAnnotationRequest.php
│   ├── Mail/
│   │   ├── RemarqueConfirmationMailable.php
│   │   ├── ZoneCreatedMailable.php
│   │   ├── GroupEmailMailable.php
│   │   ├── AccountStatusChangedMailable.php
│   │   └── IssueResolvedMailable.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Remarque.php
│   │   ├── Zone.php
│   │   ├── AnnotationUrbaniste.php
│   │   ├── ZoneAiSummary.php
│   │   └── Category.php
│   └── Providers/
│       └── AppServiceProvider.php
├── bootstrap/
│   └── app.php              ← Middleware aliases (role) + exception config
├── config/
│   ├── mail.php
│   ├── queue.php
│   └── auth.php
├── database/
│   ├── migrations/           ← 15 migration files
│   └── seeders/
│       ├── DatabaseSeeder.php
│       ├── RealisticSeedDataSeeder.php
│       └── UnassignedReportsSeeder.php (if exists)
├── resources/views/emails/
│   ├── remarque_confirmation.blade.php
│   ├── zone_created.blade.php
│   ├── group_email.blade.php
│   ├── account_status_changed.blade.php
│   └── issue_resolved.blade.php
├── routes/
│   ├── api.php
│   └── web.php
├── storage/logs/laravel.log  ← Error logs (check for 500s)
├── .env                      ← DB, MAIL, QUEUE configuration
└── composer.json
```

### 2.2 Database Schema (Migrations)

**Table: `users`**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| nom | string | |
| email | string unique | |
| password | string | Hashed |
| role | enum('super_admin','admin','urbaniste','citoyen') | Default 'citoyen' |
| statut | enum('pending','active','rejected') | Default 'active' |
| company_name | string nullable | For admin/urbaniste |
| city | string nullable | |
| timestamps | | |

**Table: `remarques`** (the core "report" entity)
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| user_id | bigint FK→users | |
| zone_id | bigint FK→zones (nullable after migration) | |
| categorie | string | e.g. "route", "eclairage", "dechets", "eau", "parc", "transport" |
| statut | enum('en_attente','en_cours','resolu','rejete') | Default 'en_cours' (auto-validated on submission) |
| building_type | string nullable | Synced with categorie |
| reasons | json | e.g. ["Signalement citoyen"] |
| problems | json | e.g. ["Route ou trottoir"] |
| urgency | tinyint (1-5) | |
| profile | string **nullable** (was NOT NULL, made nullable) | e.g. "conducteur", "pieton", "resident", "commercant", "passant" |
| residence_duration | string **nullable** (was NOT NULL, made nullable) | e.g. "depuis toujours", "plus d'un an", "quelques mois", "quelques jours" |
| opinion | text | User's free-text description |
| opinion_ai_validated | boolean | Default false |
| opinion_ai_summary | text nullable | AI-generated summary |
| commentaire_admin | text nullable | Admin's internal note |
| photo_path | string nullable | Uploaded photo |
| latitude | decimal(10,7) | |
| longitude | decimal(10,7) | |
| duration | string nullable (added later) | e.g. "days", "months", "weeks" |
| timestamps | | |

**Table: `zones`**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| nom | string | e.g. "Guéliz", "Médina", "Syba (Hay Salam)" |
| ville | string | e.g. "Marrakesh" |
| couleur | string | Hex color |
| coordonnees_geojson | json | Array of [lat, lng] coordinate pairs |
| centre_lat | decimal(10,7) | |
| centre_lng | decimal(10,7) | |
| notes | text nullable (added later) | |
| timestamps | | |

**Table: `annotation_urbanistes`**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| zone_id | bigint FK→zones | |
| urbaniste_id | bigint FK→users | |
| texte | text | The annotation content |
| priorite | string | 'urgente', 'surveiller', or 'informatif' (default) |
| timestamps | | |

**Table: `zone_ai_summaries`**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| zone_id | bigint FK→zones | Unique per zone |
| summary_text | text | AI-generated analysis |
| generated_at | timestamp | |

**Other tables:** `categories`, `personal_access_tokens` (Sanctum), `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `sessions`, `password_reset_tokens`.

### 2.3 Models

**`User`** — `HasApiTokens`, `HasFactory`, `Notifiable`
- `$fillable`: nom, email, password, role, statut, company_name, city
- `$hidden`: password, remember_token
- `$casts`: password → 'hashed'
- Relations: `remarques()` (HasMany), `annotations()` (HasMany, as 'urbaniste_id')

**`Remarque`** — `Model`
- `$fillable`: user_id, zone_id, categorie, statut, building_type, reasons, problems, urgency, duration, profile, residence_duration, opinion, opinion_ai_validated, opinion_ai_summary, commentaire_admin, photo_path, latitude, longitude
- `$casts`: reasons→array, problems→array, urgency→integer, opinion_ai_validated→boolean, latitude→float, longitude→float
- Relations: `user()` (BelongsTo), `zone()` (BelongsTo)

**`Zone`** — `Model`
- `$fillable`: nom, ville, couleur, coordonnees_geojson, centre_lat, centre_lng, notes
- `$casts`: coordonnees_geojson→array, centre_lat→float, centre_lng→float
- Relations: `remarques()` (HasMany)

**`AnnotationUrbaniste`** — `Model`
- `$fillable`: zone_id, urbaniste_id, texte, priorite
- Relations: `zone()` (BelongsTo), `urbaniste()` (BelongsTo)

**`ZoneAiSummary`** — `Model` (no timestamps)
- `$fillable`: zone_id, summary_text, generated_at
- `$casts`: generated_at→datetime

### 2.4 API Routes

**Public (no auth):**
| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| POST | `/register` | AuthController@register | |
| POST | `/login` | AuthController@login | |
| GET | `/zones` | ZoneController@index | |
| GET | `/remarques` | RemarqueController@index | Public read |

**Authenticated (auth:sanctum):**
| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| POST | `/logout` | AuthController@logout | |
| GET | `/me` or `/user` | AuthController@me | |
| PUT | `/profile` | AuthController@updateProfile | |
| GET | `/my-remarks` | RemarqueController@myRemarks | |
| POST | `/remarques` | RemarqueController@store | Create a report |

**Admin/SuperAdmin (role:admin,super_admin):**
| Method | Path | Handler |
|--------|------|---------|
| POST | `/zones` | ZoneController@store |
| PATCH | `/zones/{zone}` | ZoneController@update |
| DELETE | `/zones/{zone}` | ZoneController@destroy |
| PATCH | `/remarques/{remarque}` | RemarqueController@update |
| GET | `/dashboard/stats` | DashboardController@stats |
| GET | `/users` | UserController@index |
| POST | `/users/send-group-email` | UserController@sendGroupEmail |

**SuperAdmin only (role:super_admin):**
| GET | `/users/pending` | UserController@pending |
| PATCH | `/users/{user}` | UserController@update |

**Urbaniste/Admin (role:urbaniste,admin):**
| GET/POST/PATCH/DELETE | `/annotations` | AnnotationController |
| GET/POST | `/zones/{zone}/summary` | ZoneSummaryController |

### 2.5 Controllers

**`AuthController`**
- `register()` — Creates user, returns token. Admin/urbaniste registrations get `statut=pending`.
- `login()` — Validates credentials, checks statut (rejects pending/rejected), returns token.
- `logout()` — Deletes current access token.
- `me()` — Returns authenticated user.
- `updateProfile()` — Updates nom, optionally password.

**`RemarqueController`**
- `index()` — Lists all remarks with user+zone, supports `?statut=`, `?zone_id=`, `?categorie=` filters.
- `myRemarks()` — Lists current user's remarks.
- `store()` — Creates remark from StoreRemarqueRequest. Syncs `categorie`/`building_type`. Handles photo upload. Queues confirmation email. Wrapped in try/catch for validation (422) and general errors (500).
- `update()` — Updates remark statut/commentaire_admin via UpdateRemarqueRequest.

**`ZoneController`**
- `index()` — Lists zones, optional `?ville=` filter.
- `store()` — Creates zone, optionally associates remark_ids. Notifies all active super_admin/admin/urbaniste users via ZoneCreatedMailable (queued). Resolves all `en_cours` remarks within the zone polygon (statut → `resolu`) and notifies citizens via IssueResolvedMailable.
- `update()` — Updates zone.
- `destroy()` — Deletes zone.

**`UserController`**
- `index()` — Lists all users.
- `pending()` — Lists users with statut=pending.
- `update()` — Updates user statut (only), company_name, city. Role is immutable. Sends `AccountStatusChangedMailable` for ANY statut change (pending→active, active→rejected, etc.).
- `sendGroupEmail()` — Sends group email to citizens/urbanistes/admins/all/users-by-zone.

**`DashboardController`**
- `stats()` — Returns total_remarques, total_zones, total_users, pending_users, remarques_par_statut, remarques_par_zone, remarques_par_categorie.

**`AnnotationController`**
- `byZone()`, `byUrbaniste()`, `store()`, `update()`, `destroy()` — CRUD for urbanist annotations.

**`ZoneSummaryController`**
- `show()` — Gets AI summary for a zone.
- `generate()` — Creates/updates AI summary.

### 2.6 Form Requests (Validation)

| Request | Rules |
|---------|-------|
| `LoginRequest` | email (required, email), password (required, string) |
| `RegisterRequest` | nom, email (unique:users), password (min:6), role (in:[super_admin,admin,urbaniste,citoyen]), company_name (nullable), city (nullable) |
| **`StoreRemarqueRequest`** | zone_id (nullable,exists:zones,id), categorie (required), statut (nullable,in:[en_attente,en_cours,resolu,rejete]), building_type (nullable), reasons (required,array), problems (required,array), urgency (required,1-5), duration (nullable), profile (nullable — defaults to 'citoyen'), residence_duration (nullable — defaults to 'non_renseigne'), opinion (required), photo (nullable,image,max:5120KB), latitude (required,numeric), longitude (required,numeric) |
| `UpdateRemarqueRequest` | statut (sometimes,in:[en_attente,en_cours,resolu,rejete]), commentaire_admin (nullable,string) |
| `StoreZoneRequest` | nom (required), ville (required), couleur (required), coordonnees_geojson (required,array), centre_lat (required,numeric), centre_lng (required,numeric), notes (nullable), remark_ids (sometimes,array,each:integer,exists) |
| `StoreAnnotationRequest` | zone_id (required,exists), urbaniste_id (required,exists), texte (required), priorite (nullable,in:[urgente,surveiller,informatif]) |
| `UpdateAnnotationRequest` | texte (required), priorite (nullable,in:[urgente,surveiller,informatif]) |

### 2.7 Mailables & Email Templates

**`RemarqueConfirmationMailable`**
- Sent to: `auth()->user()->email`
- Subject: `"UrbanMap — Votre signalement a ete recu"`
- Template: `emails/remarque_confirmation.blade.php`
- Fields shown: reference (#id), categorie, urgency (French label), zone name, lat/lng, created_at

**`ZoneCreatedMailable`**
- Sent to: All active super_admin, admin, urbaniste users
- Subject: `"UrbanMap — Nouvelle zone creee : {zone->nom}"`
- Template: `emails/zone_created.blade.php`
- Fields shown: zone nom, ville, couleur

**`GroupEmailMailable`**
- Sent to: All users in a selected group
- Subject: Custom (from admin form)
- Template: `emails/group_email.blade.php`
- Shows: recipient name + custom message

**`AccountStatusChangedMailable`**
- Sent to: The user whose status changed
- Subject: Varies by new statut — `"Votre compte a ete active"`, `"Votre compte a ete desactive"`, or `"Le statut de votre compte a change"`
- Template: `emails/account_status_changed.blade.php`
- Shows: user name, role, old statut, new statut
- Triggered for ANY statut change via `UserController@update()` (pending→active, active→rejected, rejected→active, etc.)

**`IssueResolvedMailable`**
- Sent to: The citizen whose remark was resolved
- Subject: `"UrbanMap — Votre signalement a ete resolu"`
- Template: `emails/issue_resolved.blade.php`
- Shows: user name, remark reference (#id), categorie, zone name
- Triggered when `ZoneController@store()` finds `en_cours` remarks within the new zone polygon and resolves them

All emails are **queued** (Mail::to()->queue(...)), not sent synchronously. Requires `php artisan queue:work` running.

### 2.8 Seeders

**`DatabaseSeeder`** creates:
- 4 users: super_admin (`superadmin@urbanmap.ma` / `super123`), admin (`mohammed.benali@urbanmap.ma` / `admin123`), urbaniste (`urbaniste@urbanmap.ma` / `urban123`), citoyen (`citoyen@urbanmap.ma` / `citoyen123`)
- 3 categories: Voirie, Patrimoine, Espaces Verts
- 3 zones with realistic 8-12 vertex polygon coordinates:
  - **Guéliz** (#C1440E, 8 vertices)
  - **Médina** (#1A5276, 12 vertices)
  - **Syba (Hay Salam)** (#52BE80, 9 vertices)
- Calls `UnassignedReportsSeeder` (if exists)

**`RealisticSeedDataSeeder`** creates 40 realistic citizen reports across the 3 zones with varied categories, urgency levels, profiles, durations, and realistic French descriptions. All have `statut=en_cours` and `opinion_ai_validated=true` so they appear on the citizen map.

### 2.9 Middleware

**`CheckRole`** — accepts variadic role strings, returns 403 if user's role not in the list. Registered as alias `role` in `bootstrap/app.php`:
```php
$middleware->alias(['role' => CheckRole::class]);
```

### 2.10 Configuration

`.env` key values:
- `DB_CONNECTION=sqlite` (default Laravel, file at `database/database.sqlite`)
- `QUEUE_CONNECTION=database`
- `MAIL_MAILER=smtp`
- `MAIL_HOST=smtp.gmail.com`
- `MAIL_PORT=587`
- `MAIL_USERNAME=yahyaprogrammation@gmail.com`
- `MAIL_PASSWORD="bkbe fyji hymq zlib"` (Gmail app password, must be quoted)
- `MAIL_ENCRYPTION=tls`
- `MAIL_FROM_ADDRESS=yahyaprogrammation@gmail.com`
- `MAIL_FROM_NAME="UrbanMap Marrakesh"`

---

## 3. Frontend (React)

### 3.1 Directory Structure

```
frontend/
├── src/
│   ├── App.jsx                        ← Router + providers
│   ├── pages/
│   │   ├── CitizenMapPage.jsx         ← Citizen interactive map (1910 lines)
│   │   ├── MapPage.jsx                ← Professional map (1900 lines)
│   │   ├── AdminDashboard.jsx
│   │   ├── UrbanisteDashboard.jsx
│   │   ├── SuperAdminPage.jsx
│   │   ├── AccountPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── NotFound.jsx
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminUsersTab.jsx
│   │   ├── dashboard/
│   │   │   ├── AdminExportTab.jsx
│   │   │   ├── AdminRemarquesTab.jsx
│   │   │   ├── AdminStatistiquesTab.jsx
│   │   │   ├── AdminZonesTab.jsx      ← Zone management (1057 lines)
│   │   │   ├── AnnotationPanel.jsx
│   │   │   ├── HeatmapPanel.jsx
│   │   │   ├── RemarquesTable.jsx
│   │   │   ├── StatsCards.jsx
│   │   │   ├── UDComponents.jsx
│   │   │   ├── UrbanAnnotationsTab.jsx
│   │   │   ├── UrbanCarteTab.jsx
│   │   │   ├── UrbanOpinionsTab.jsx
│   │   │   ├── UrbanRapportTab.jsx
│   │   │   ├── UrbanStatistiquesTab.jsx
│   │   │   ├── UserManagement.jsx
│   │   │   ├── ValidationPanel.jsx
│   │   │   └── ZoneManagement.jsx
│   │   ├── layout/
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── PageHeader.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── ui/
│   │   │   ├── Avatar.jsx, Badge.jsx, Button.jsx, Card.jsx
│   │   │   ├── Input.jsx, Modal.jsx, Select.jsx, Spinner.jsx, Tooltip.jsx
│   │   │   └── index.js
│   │   ├── EmptyState.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── SkeletonCard.jsx, SkeletonChart.jsx
│   │   ├── SkeletonLoader.jsx, SkeletonTable.jsx
│   │   └── Toast.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── ToastContext.jsx
│   └── services/
│       ├── adminApi.js
│       ├── aiService.js
│       ├── api.js                    ← Main API client (login, register, remarks)
│       ├── axiosInstance.js          ← Axios instance with token interceptor
│       ├── errorHandler.js
│       ├── exportService.js
│       ├── pdfService.js
│       ├── urbanApi.js               ← Urbanist-specific API calls
│       └── validationService.js
├── package.json
└── vite.config.js
```

### 3.2 App Entry & Routing

**`App.jsx`** wraps everything in:
```jsx
<ToastProvider>
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
</ToastProvider>
```

Routes:
| Path | Component | Access |
|------|-----------|--------|
| `/` | HomePage | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/registre` | Register | Public (alias) |
| `/forgot-password` | ForgotPassword | Public |
| `/map` | DynamicMapRoute → CitizenMapPage (citizen) or redirect | Auth required |
| `/account` | AccountPage | Auth required |
| `/admin/dashboard` | AdminDashboard | admin |
| `/urbaniste/dashboard` | UrbanisteDashboard | urbaniste, admin |
| `/super-admin/users` | SuperAdminPage | super_admin |
| `*` | NotFound | Public |

**`DynamicMapRoute`** checks user role: citizens see `CitizenMapPage`, professionals redirect to their dashboard.

### 3.3 Pages

**`CitizenMapPage.jsx`** (~1815 lines) — The main citizen-facing map. Features:
- Leaflet map with OpenStreetMap and satellite tile layers
- City center fallback coordinates for 7 Moroccan cities
- `MapController` — view centering, bounds enforcement, fly-to animation
- `MapAutoZoom` — auto-zooms to user's city, listens for custom DOM events (`fly-to`, `map-zoom-in`, `map-zoom-out`)
- `UserLocationMarker` — blue circle marker
- `InteractionManager` — marker placement + polygon drawing via leaflet-draw
- `FeedbackForm` — 2-step citizen report form (problem type + urgency/duration/opinion/photo)
- `ProfessionalView` — alternate panel for admin/urbaniste (technical data + internal notes)
- `Legend` — shows category colors for citizens, status colors for professionals
- Polygon zones fetched from API, rendered as colored polygons
- Parcels (remarks) rendered as colored `CircleMarker`s (no heatmap)
- Floating "+ Signaler un problème" button (fixed, bottom-center)
- Driver.js onboarding tour (6 steps, triggered once via localStorage)
- Live counter (signalements + zones count)

**`MapPage.jsx`** (~1746 lines) — Professional/legacy map. Similar to CitizenMapPage but:
- Uses `@turf/turf` for polygon overlap detection
- 5-step FeedbackForm (building_type, reasons/opinion, urgency, problems, profile)
- `HeatmapLayer` and `ZoneHeatmapLayer` via `leaflet.heat`
- `InteractionManager` with overlap warnings
- `LayersControl` from react-leaflet
- Filters: shows validated + own remarks for citizens
- Building types: park, school, residential, commercial, hospital, sports, mosque, other

**`UrbanisteDashboard.jsx`** (~527 lines)
- Tabs: Carte Analytique, Statistiques Pro, Opinions Citoyennes, Annotations Privees, Rapport PDF
- `UrbanZoneProvider` context
- `CityBadge`, `ActiveZoneBanner`
- AI synthesis modal (`generateAiSynthesize()`) — generates textual analysis based on remarks data
- Export PDF button
- Keyboard navigation for tabs

### 3.4 Services / API Layer

**`axiosInstance.js`** — Axios instance with `baseURL: http://localhost:8000/api`, auto-attaches `Authorization: Bearer <token>` from localStorage, handles 401 by clearing auth and redirecting to `/login`.

**`api.js`** — Main API client: `register`, `login`, `logout`, `getCurrentUser`, `getRemarks`, `createRemark` (multipart/form-data), `updateProfile`, `getMyRemarks`.

**`urbanApi.js`** — Urbanist-specific: `getZonesWithStats`, `getValidatedRemarks`, `getUrbanStatsByZone` (comprehensive stats computation: category breakdown, urgency distribution, temporal data, duration analysis, profile breakdown, affected groups from `reasons`).

**`adminApi.js`** — Admin-specific: zone CRUD, remark management, dashboard stats (`getDashboardStats`), user management (`getAllUsers`, `getPendingUsers`, `updateUser`), group email, CSV export.

**`exportService.js`** — Export utilities: CSV export with BOM for Excel, Excel export via `xlsx` library, cross-tabulation matrix (Category × Zone), urgency breakdown sheet, zone summary statistics. Uses `normalizeRemarkRow()` to flatten remarks into export rows with computed fields (`category` label, `zone_name`, `profile`, `reasons`, `duration` label, photo URL).

**`pdfService.js`** — PDF generation for zone reports and remark receipts. Uses `jspdf` + `jspdf-autotable`. Statut labels are dynamically read from `remarque.statut` via `STATUT_LABELS` map.

### 3.5 Context Providers

**`AuthContext.jsx`** — Manages user/token state. On mount, loads from localStorage then revalidates via `getCurrentUser()`. Provides `login`, `logout`, `isAuthenticated`. Shows "Loading UrbanMap..." while initializing.

**`ToastContext.jsx`** — Simple toast notification system. `addToast(message, type, duration)` with auto-dismiss via setTimeout.

### 3.6 Components

**UI components** (`components/ui/`): Avatar, Badge, Button, Card, Input, Modal, Select, Spinner, Tooltip.

**Layout components** (`components/layout/`): DashboardLayout (sidebar + header + content), PageHeader, Sidebar.

**Feature components** (`components/dashboard/`):
- **AdminZonesTab.jsx** — Zone management with Leaflet map, polygon drawing, heatmap, KPI cards, zone list with filters, duplicate detection, edit/delete modals.
- **AdminRemarquesTab.jsx** — Remark table with status management.
- **AdminStatistiquesTab.jsx** — Dashboard stats/charts.
- **UrbanOpinionsTab.jsx** — Opinion browsing with category grouping, urgency/duration badges, expandable cards.
- **UrbanStatistiquesTab.jsx** — Comprehensive statistics with Recharts charts, KPI cards, temporal selector, zone comparison table.
- **UrbanAnnotationsTab.jsx** — Private annotation management.
- **UrbanCarteTab.jsx** — Map tab for urbaniste.

**`ProtectedRoute.jsx`** — Checks auth, redirects to login if no token; optionally checks roles. `getRoleDashboard(user.role)` maps roles to their dashboard route.

**`ErrorBoundary.jsx`** — Class component, catches rendering errors, shows friendly UI with error ID, stack trace (dev), retry/go-home buttons.

### 3.7 Key UI Patterns

- **Styling:** Inline `styles` objects (not CSS modules or styled-components). Dark theme with **warm dark backgrounds**: page `#060403`, card `#1e293b`, Navbar `rgba(8,6,3,0.96)`, accent `#C1440E` (terracotta/orange), text `#F2EDE6`, borders `#334155`. The global `body` bg is `#060403` with a subtle hexagon SVG pattern at 3% opacity.
- **Design system:** Components/ui/ folder has reusable primitives, but most pages use inline styles.
- **Icon library:** `lucide-react` and `react-icons`.
- **Charts:** `recharts` (BarChart, AreaChart, PieChart).
- **Maps:** `react-leaflet` v5 with `leaflet` v1.9, `leaflet-draw` for polygon editing, `leaflet.heat` for heatmap.
- **PDF export:** `jspdf` + `jspdf-autotable` + `html2canvas`.
- **Excel export:** `xlsx` library.
- **Skeletons:** Custom `SkeletonCard`, `SkeletonChart`, `SkeletonTable`, `SkeletonLoader`.
- **Tour:** `driver.js` v1.4.0 (named export `{ driver }`, API: constructor with `steps` array, `.drive()` method). Persistence via `localStorage.setItem('urbanmap_tour_done', 'true')` across 3 callbacks: `onReset`, `onDestroyed`, and last-step `popover.onClose`.

---

## 4. Key Features Implemented

### 4.1 Citizen Map (CitizenMapPage)

**Purpose:** Allow citizens to view urban reports on a map and submit new ones.

**Key behaviors:**
- Fetches all remarks from `GET /remarques` (public endpoint, no statut filter — filtering is done client-side)
- Fetches zones from `GET /zones`
- Renders remarks as **colored CircleMarkers** (radius 5), color determined by `CATEGORY_COLORS` map (supports French aliases: route→#8B4513, eclairage→#FFD700, dechets→#2E8B57, eau→#1E90FF, parc→#228B22, transport→#6A5ACD)
- Renders zones as **Polygon** outlines with `fillOpacity: 0.04`, color from zone data
- Zone click → popup with reassuring message (not marker creation)
- **"+ Signaler un problème"** button (fixed bottom-center) → clicking it enters marker placement mode
- Citizen clicks map → marker placed → 2-step form appears:
  1. Choose problem type (buttons for Route, Éclairage, Déchets, Eau, Parcs/Jardins, Transports)
  2. Urgency (1-5 slider), Duration (dropdown: days/weeks/months), opinion text (max 300 chars, optional AI analysis), photo upload (optional)
- Submit → `POST /remarques` as multipart/form-data → confirmation email queued
- **Geolocation button** (top left, `#locate-btn`): blue Google-Maps-style dot marker at user's location, popup "📍 Vous êtes ici"
- **Live counter** (`#live-counter`): "XX signalements dans YY zones officielles"
- **Layer toggle**: Plan / Satellite

**Tracking submitted reports — Account Page (`/account`):**
- Citizens can view all their submitted reports in the **AccountPage** (`/account` route)
- Reports are fetched via `GET /api/my-remarks` (auth required) — returns the user's own remarks with `zone` relation, ordered by latest
- Each report card displays:
  - **Category** (Route, Éclairage, etc.) with relevant icon/photo thumbnail
  - **Statut badge** — dynamic badge reflecting `report.statut`: 🟡 En attente, 🔵 En cours, 🟢 Résolu, 🔴 Rejeté
  - **Zone name** — `report.zone?.nom || 'Non spécifiée'`
  - **Submission date** — formatted in French locale
  - **Urgency indicator** — 1–5 dot visualization
- **Note:** Each report card displays a dynamic badge mapped from `report.statut`: `en_attente` → 🟡 En attente, `en_cours` → 🔵 En cours, `resolu` → 🟢 Résolu, `rejete` → 🔴 Rejeté.

**Onboarding Tour (Driver.js):**
- Guarded by `localStorage.getItem('urbanmap_tour_done')`
- 6 steps:
  1. `#map-container` → "Carte de Marrakesh"
  2. `#locate-btn` → "🧭 Me localiser"
  3. `#add-report-btn` → "Signaler un problème"
  4. `#urbanmap-wrapper` → "Catégories"
  5. `#live-counter` → "En direct"
  6. `#add-report-btn` → "Vous êtes prêt !"
- Restart via "?" button (clears localStorage + reloads)

### 4.2 Professional Map (MapPage)

**Purpose:** Full-featured map for admin/urbanist users with analytics tools.

**Additional features vs CitizenMap:**
- Heatmap layer (urgency-weighted)
- Polygon overlap detection via Turf.js
- 5-step wizard form (profile, reasons, opinion, urgency, problems)
- Building type selection (park, school, residential, etc.)
- Professional view panel with internal notes and admin comments
- `LayersControl` for base layer switching

### 4.3 Admin Dashboard

**Components:** AdminZonesTab, AdminRemarquesTab, AdminStatistiquesTab, AdminExportTab, AdminUsersTab, UserManagement, ZoneManagement.

**Zone Management (AdminZonesTab):**
- Interactive Leaflet map with zone polygons
- `ZoneDrawManager` — draw new zones via `L.Draw.Polygon` with `showArea: true`, color `#C1440E`, `fillOpacity: 0.04`, `weight: 2.5`
- Overlap detection when drawing
- Reverse geocode → suggest zone name
- KPI cards: Signalements, Zones critiques, Zones total, Non assignés
- Coverage percentage bar
- Urgency filter bar (Low/Medium/High)
- Zone list with sorting/filtering, duplicate name detection
- Edit/Delete modals
- Toast notification showing `notified_admins` count

### 4.4 Urbaniste Dashboard

**Components:** UrbanCarteTab, UrbanStatistiquesTab, UrbanOpinionsTab, UrbanAnnotationsTab, UrbanRapportTab.

**AI Synthesis:** `generateAiSynthesize()` function creates a data-driven textual analysis based on remarks (avg urgency, dominant category, chronic percentage, profile breakdown, recommended action).

### 4.5 Super Admin Page

**Route:** `/super-admin/users` — Role: `super_admin`

**Features:**
- **Platform overview KPIs** — 4 metric cards: total users, pending users (with pulse dot), total reports, total zones — fetched via `getDashboardStats()`
- **Role breakdown chart** — Bar chart (Recharts) with counts per role (Citoyens, Admins, Urbanistes, Super Admins)
- **User management table** — Lists all users with columns: Nom, Email, Département/Ville, Rôle (colored badge), Statut (colored pill: green/orange/red), Actions
- **Pending tab** — Shows users awaiting approval with Activer/Refuser buttons
- **All users tab** — Shows all users with a statut dropdown (Actif / En attente / Désactivé). When the dropdown value differs from the current statut, **Sauvegarder** + **Annuler** buttons appear. Clicking Sauvegarder shows a confirmation dialog (`window.confirm` in French) before sending the PATCH. After saving, the page refreshes. **Role cannot be changed** — admin stays admin, urbaniste stays urbaniste, citoyen stays citoyen.
- **Styling:** Dark theme with `#060403` page bg, `#1e293b` card bg, `#334155` borders, `#C1440E` accent, `#F2EDE6` text

### 4.6 Email System

**Three email types with trigger flows:**

#### 4.6.1 Remarque Confirmation (`RemarqueConfirmationMailable`)

| Aspect | Detail |
|--------|--------|
| **Trigger** | `POST /api/remarques` — `RemarqueController@store()` |
| **Code** | `app/Http/Controllers/Api/RemarqueController.php:67` |
| **Line** | `Mail::to($user->email)->queue(new RemarqueConfirmationMailable($remarque, $user));` |
| **Recipient** | The authenticated citizen who submitted the report (`auth()->user()->email`) |
| **Subject** | `"UrbanMap — Votre signalement a été reçu"` |
| **Template** | `resources/views/emails/remarque_confirmation.blade.php` |
| **Variables** | `$user->nom`, `$remarque->id`, `$remarque->categorie`, `$remarque->urgency` (mapped to French label via `@switch`), `$remarque->zone->nom`, `$remarque->latitude`, `$remarque->longitude`, `$remarque->created_at` |
| **Route** | `POST /api/remarques` — protected by `auth:sanctum` middleware |

**Trigger flow:**
1. Citizen fills report form (photo, category, urgency, description, etc.) on the map page
2. Frontend sends `POST /api/remarques` with multipart/form-data (including optional photo file)
3. `RemarqueController@store()` validates with `StoreRemarqueRequest`
4. If photo present, it's stored to `storage/app/public/remarques/` via `$request->file('photo')->store('remarques', 'public')`; the path is saved as `photo_path`
5. `categorie` and `building_type` are synced (whichever is filled, the other gets the same value)
6. Remarque is created with `user_id = auth()->id()` and `statut = 'en_cours'` (auto-validated, immediately visible on the map)
7. The fresh record is loaded with the `zone` relation
8. **Confirmation email is queued** inside a try/catch block — if the queue fails, the remark is still created (the error is only logged, the API still returns 201)
9. Frontend receives the created remark and shows a success toast

**Warning:** If no queue worker is running, the email sits in the `jobs` table indefinitely. The API response returns before the queue job is processed, so the user sees success immediately regardless of email delivery.

#### 4.6.2 Zone Created Notification (`ZoneCreatedMailable`)

| Aspect | Detail |
|--------|--------|
| **Trigger** | `POST /api/zones` — `ZoneController@store()` |
| **Code** | `app/Http/Controllers/Api/ZoneController.php:51` |
| **Line** | `Mail::to($admin->email)->queue(new ZoneCreatedMailable($zone, $admin));` |
| **Recipient** | All active (`statut = 'active'`) users with roles `super_admin`, `admin`, or `urbaniste` |
| **Subject** | `"UrbanMap — Nouvelle zone créée : {zone->nom}"` |
| **Template** | `resources/views/emails/zone_created.blade.php` |
| **Variables** | `$admin->nom`, `$zone->nom`, `$zone->ville`, `$zone->couleur` |
| **Route** | `POST /api/zones` — protected by `auth:sanctum` + `role:admin,super_admin` middleware |

**Trigger flow:**
1. Admin creates a zone via the admin dashboard form (name, city, polygon coordinates, color)
2. Frontend sends `POST /api/zones` with the zone data + optional `remark_ids` array
3. `ZoneController@store()` validates with `StoreZoneRequest`
4. Zone is created in the database
5. If `remark_ids` provided, those remarks get `zone_id` updated to the new zone
6. `autoAssignUnassignedToZone($zone)` runs — scans all remarks with `zone_id = null` and checks if their lat/lng falls within the zone polygon using a point-in-polygon algorithm (ray-casting); matched remarks auto-assigned
7. `resolveRemarksInZone($zone)` runs — scans all remarks with `statut = 'en_cours'` and within the zone polygon. For each matched remark: statut is set to `resolu`, zone_id is updated to the new zone, and an **IssueResolvedMailable** is queued to the citizen who submitted it. Each email failure is caught and logged individually.
8. **All active super_admin/admin/urbaniste users are queried** for a zone-created notification (`User::whereIn('role', ['super_admin','admin','urbaniste'])->where('statut', 'active')`)
9. **For each admin, a notification email is queued** — again, individual failures are caught and logged without breaking the loop
10. Response returns: `{ data: zone, notified_admins: count, auto_assigned_count: count, resolved_count: count }`

**Note:** Only `admin` and `super_admin` can call this endpoint (route middleware: `role:admin,super_admin`). Urbanistes and citizens cannot trigger zone creation.

**Citizen notification:** When a zone is created, citizens whose `en_cours` remarks fall within the zone polygon receive a "signalement résolu" email with the remark reference and zone name. Their AccountPage (`/account`) then shows a 🟢 **Résolu** badge on the resolved report.

#### 4.6.3 Group Email (`GroupEmailMailable`)

| Aspect | Detail |
|--------|--------|
| **Trigger** | `POST /api/users/send-group-email` — `UserController@sendGroupEmail()` |
| **Code** | `app/Http/Controllers/Api/UserController.php:74` |
| **Line** | `Mail::to($user->email)->queue(new GroupEmailMailable($data['subject'], $data['message'], $user->nom));` |
| **Recipient** | Filtered by the `group` parameter |
| **Subject** | Custom — provided by admin in the form |
| **Template** | `resources/views/emails/group_email.blade.php` |
| **Variables** | `$recipientName`, `$messageContent` |
| **Route** | `POST /api/users/send-group-email` — protected by `auth:sanctum` + `role:admin,super_admin` |

**Group filter logic (`UserController@sendGroupEmail`, line 39-85):**

| `group` value | Recipient query |
|---|---|
| `citoyen` | `User::where('role', 'citoyen')->get()` |
| `urbaniste` | `User::where('role', 'urbaniste')->get()` |
| `admin` | `User::where('role', 'admin')->get()` (excludes super_admin) |
| `all` | `User::where('statut', 'active')->get()` (all active users regardless of role) |
| `zone` | Finds distinct `user_id` from remarks where `zone_id = $request->zone_id`, then fetches those users with `role = 'citoyen'` and `statut = 'active'` |

**Trigger flow:**
1. Admin fills the group email form in the admin dashboard (select group, write subject + message)
2. Frontend sends `POST /api/users/send-group-email` with `{ group, subject, message, zone_id? }`
3. `UserController@sendGroupEmail()` validates: `group` must be one of `[citoyen, urbaniste, admin, all, zone]`; `zone_id` required when `group = 'zone'`; `subject` and `message` are required strings
4. Recipient list built based on group filter (see table above)
5. **For each recipient, the email is queued** individually with `Mail::to()->queue()` — failures are caught and logged per recipient
6. Response returns `{ success: true, sent_to: count }` — count is the number of successfully queued emails

**Note:** There is no rate limiting — sending "all" to thousands of users would create one queue job per user. In production, you'd want to batch or throttle this.

#### 4.6.5 Account Status Changed Notification (`AccountStatusChangedMailable`)

| Aspect | Detail |
|--------|--------|
| **Trigger** | `PATCH /api/users/{user}` — `UserController@update()` on ANY statut change |
| **Code** | `app/Http/Controllers/Api/UserController.php:37-44` |
| **Line** | `Mail::to($user->email)->queue(new AccountStatusChangedMailable($user, $oldStatut, $newStatut));` |
| **Recipient** | The user whose statut changed (admin, urbanist, or citizen) |
| **Subject** | Dynamic — `"activé"`, `"désactivé"`, or `"a changé"` based on `$newStatut` |
| **Template** | `resources/views/emails/account_status_changed.blade.php` |
| **Variables** | `$user->nom`, `$user->role`, `$oldStatut`, `$newStatut` |
| **Route** | `PATCH /api/users/{user}` — protected by `auth:sanctum` + `role:super_admin` middleware |

**Trigger flow:**
1. Super admin changes a user's statut (on any tab) via the statut dropdown or Activer/Refuser buttons
2. A confirmation dialog asks: "Voulez-vous vraiment changer le statut de {nom} de « {old} » à « {new} » ?"
3. On confirm, frontend sends `PATCH /api/users/{id}` with `{ statut: newValue }`
4. `UserController@update()` detects that `$oldStatut !== $newStatut`
5. **Status change email is queued** with old and new statut values — failure is caught and logged
6. Template shows a contextual message: activation (pending→active), suspension (active→rejected), or generic change

#### 4.6.4 Queue Architecture

**All three mailables use `Mail::to()->queue()` (not `->send()`).** This pushes a job onto the `jobs` database table.

**Config:**
- `QUEUE_CONNECTION=database` in `.env`
- The `jobs` migration is part of Laravel's default migrations (`create_jobs_table`)
- SMTP via Gmail: `MAIL_MAILER=smtp`, `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_ENCRYPTION=tls`

**To process emails, run in a separate terminal:**
```bash
cd urbanmap-backend
php artisan queue:work
```

**What happens without the queue worker:**
- Emails are NOT sent
- Jobs accumulate in the `jobs` table
- No error is thrown at the API level (the API returns 200/201 as normal)
- The only indication is growing `jobs` table rows and the absence of email delivery

**Failed jobs:**
- After 3 failed attempts, the job moves to `failed_jobs` table
- Retry failed jobs: `php artisan queue:retry all`
- Clear all jobs (if stuck): `php artisan queue:clear`

**Mailable classes location:**
| Mailable | File |
|---|---|---|
| `RemarqueConfirmationMailable` | `app/Mail/RemarqueConfirmationMailable.php` |
| `ZoneCreatedMailable` | `app/Mail/ZoneCreatedMailable.php` |
| `GroupEmailMailable` | `app/Mail/GroupEmailMailable.php` |
| `AccountStatusChangedMailable` | `app/Mail/AccountStatusChangedMailable.php` |
| `IssueResolvedMailable` | `app/Mail/IssueResolvedMailable.php` |

**Blade templates location:** `resources/views/emails/`
- `remarque_confirmation.blade.php`
- `zone_created.blade.php`
- `group_email.blade.php`
- `account_status_changed.blade.php`
- `issue_resolved.blade.php`

**All mailables use:**
- `Queueable` + `SerializesModels` traits
- `Illuminate\Mail\Mailable` base class
- `envelope()` method for subject
- `content()` method pointing to the Blade view

### 4.7 Onboarding Tour

Uses **Driver.js v1.4.0** (not older versions with `defineSteps`/`start` API). Correct API:
```js
import { driver as Driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const markTourSeen = useCallback(() => {
  localStorage.setItem('urbanmap_tour_done', 'true')
}, [])

const driver = new Driver({
  animate: true,
  steps: [{ element: '#id', popover: { title, description, position } }],
  onReset: markTourSeen,
  onDestroyed: markTourSeen,                // fires when all steps complete
  // last step can also have: onClose: markTourSeen,
})
driver.drive()  // NOT driver.start()
```

---

## 5. Roles & Permissions

| Role | Abilities | Account validation |
|------|-----------|-------------------|
| **citoyen** | View public map, submit reports, view own reports via Account page | Auto-activated on registration |
| **urbaniste** | View public map, submit reports, view annotations, manage annotations, view zone summaries, generate AI summaries, access Urbaniste Dashboard | **Pending approval** by super_admin |
| **admin** | View public map, submit reports, manage zones (CRUD), manage remarks (update statut), view dashboard stats, send group emails, view all users. **Cannot approve/reject user registrations.** | **Pending approval** by super_admin |
| **super_admin** | All citizen + admin abilities listed above — plus: approve/reject user registrations, suspend/activate accounts. **Cannot change user roles** (admin stays admin, urbaniste stays urbaniste). | Auto-activated |

**Registration flow:**
- Citizens → auto-activated (`statut=active`)
- Admin/urbaniste → created with `statut=pending`, must be approved by a super_admin via `/super-admin/users`
- Super admin accounts are created directly via seeder (no self-registration)

**Route-level enforcement:**
| Action | Required role | API route |
|--------|--------------|-----------|
| View all users | admin, super_admin | `GET /api/users` |
| View pending users | **super_admin only** | `GET /api/users/pending` |
| Approve/reject users (statut only, role immutable) | **super_admin only** | `PATCH /api/users/{user}` |
| Zone CRUD | admin, super_admin | `POST/PATCH/DELETE /api/zones/*` |
| Update remark status | admin, super_admin | `PATCH /api/remarques/{remarque}` |
| Manage annotations | urbaniste, admin | `GET/POST/PATCH/DELETE /api/annotations/*` |
| Send group emails | admin, super_admin | `POST /api/users/send-group-email` |

---

## 6. Running the App

**Backend (terminal 1):**
```bash
cd urbanmap-backend
php artisan serve --host=127.0.0.1 --port=8000
```

**Queue worker (terminal 2, required for emails):**
```bash
cd urbanmap-backend
php artisan queue:work
```

**Frontend (terminal 3):**
```bash
cd frontend
npm run dev
```

**Seed database:**
```bash
cd urbanmap-backend
php artisan db:seed --class=RealisticSeedDataSeeder
```

**Login credentials:**
| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@urbanmap.ma | super123 |
| Admin | mohammed.benali@urbanmap.ma | admin123 |
| Urbaniste | urbaniste@urbanmap.ma | urban123 |
| Citoyen | citoyen@urbanmap.ma | citoyen123 |

---

## 7. Diagrams & Reports (Data Flow)

### 7.1 Data Sources for Analytics

All analytics/reports are **client-side computed** from raw remark data fetched via `GET /api/remarques`. The flow:

```
Backend (SQLite) → GET /api/remarques → Frontend (JS) → Compute stats → Render charts
```

**Backend provides:**
- `GET /api/remarques` — List of all remarks with `user`, `zone` relations (supports `?statut=`, `?zone_id=`, `?categorie=`, `?ville=` filters)
- `GET /api/dashboard/stats` — Aggregate counts: `total_remarques`, `total_zones`, `total_users`, `pending_users`, `remarques_par_statut`, `remarques_par_zone`, `remarques_par_categorie`
- `GET /api/zones` — List of zones with polygon coordinates

**Frontend analytics entry points:**

| File | Function/Module | What it computes |
|------|----------------|------------------|
| `urbanApi.js:80-191` | `getUrbanStatsByZone()` | Category counts, urgency levels, monthly temporal data, duration breakdown, profile breakdown, affected groups (from `reasons`) |
| `urbanApi.js:65-68` | `getOpinionsByZone()` | Filters remarks by zone + category |
| `UrbanStatistiquesTab.jsx` | Local state | KPI cards, zone comparison table, temporal selector charts |
| `AdminStatistiquesTab.jsx` | Local state | Category/urgency/statut pie charts, zone bar charts |
| `SuperAdminPage.jsx` | `getDashboardStats()` | Platform KPIs, role breakdown bar chart |
| `exportService.js` | `exportExcel/exportCSV` | Cross-tabulation matrix (Category × Zone), urgency sheet, zone summary |
| `UrbanRapportTab.jsx` | Local PDF generation | Multi-page PDF report with text + stats + charts |
| `UrbanisteDashboard.jsx:100-175` | `generateAiSynthesize()` | Textual AI synthesis: dominant category, avg urgency, chronic %, profile breakdown |

### 7.2 Key Data Fields for Diagrams

**From `Remarque` model (the primary data entity):**

| Field | Type | Values / Notes | Chart use |
|-------|------|----------------|-----------|
| `categorie` | string | `route`, `eclairage`, `dechets`, `eau`, `parc`, `transport` | Pie/bar charts by category |
| `statut` | enum | `en_attente`, `en_cours`, `resolu`, `rejete` | Status distribution (lifecycle: soumis → en cours → résolu / rejeté) |
| `urgency` | int (1-5) | 1=low, 5=urgent | Urgency distribution, avg urgency |
| `profile` | string | `resident`, `conducteur`, `pieton`, `commercant`, `passant` | Reporter profile breakdown |
| `reasons` | json array | e.g. `["Signalement citoyen"]` | Affected groups/impact analysis |
| `residence_duration` / `duration` | string | `days`, `weeks`, `months`, `year`, `always` + French equivalents | Chronic vs recent analysis |
| `created_at` | timestamp | | Temporal trends (monthly/weekly) |
| `zone_id` | FK → zones | nullable | Zone coverage analysis |
| `latitude` / `longitude` | decimal | | Spatial distribution / heatmap |

**From `Zone` model:**

| Field | Type | Notes |
|-------|------|-------|
| `nom` | string | e.g. "Guéliz" |
| `ville` | string | e.g. "Marrakesh" |
| `coordonnees_geojson` | json array | `[[lat, lng], ...]` polygon vertices |
| `couleur` | string | Hex color |

### 7.3 Category Color Mapping

Used for consistent coloring across all charts and map pins:

```js
const CATEGORY_COLORS = {
  route: '#8B4513', eclairage: '#FFD700', dechets: '#2E8B57',
  eau: '#1E90FF', parc: '#228B22', transport: '#6A5ACD',
  autre: '#94a3b8',
}
const CATEGORY_LABELS = {
  route: 'Route', eclairage: 'Éclairage', dechets: 'Déchets',
  eau: 'Eau', parc: 'Parc', transport: 'Transport', autre: 'Autre',
}
```

### 7.4 Building a New Diagram / Report

To add a new chart or report page:

1. **Fetch data:** Call `getValidatedRemarks({ ville: 'Marrakesh' })` from `urbanApi.js`, or use `adminApi.getDashboardStats()` for aggregates
2. **Normalize:** Each remark has all needed fields directly (no nested unwrapping needed for basic fields). For exports, use `normalizeRemarkRow(remark, zones, city)` from `exportService.js`
3. **Compute:** Use native JS `Array.reduce()`, `Array.filter()`, etc. — all stats are computed client-side
4. **Render:** Use `recharts` components (`BarChart`, `PieChart`, `AreaChart`, `LineChart`) with the dark theme palette
5. **Export:** Use `exportService.exportExcel(remarks, zones, city)` for Excel with multiple sheets, or the CSV generator

### 7.5 Theme Colors for Charts

```js
// Dark theme palette matching the app UI
const CHART_COLORS = {
  background: '#1e293b',      // Card bg
  grid: '#334155',            // Grid lines
  text: '#94a3b8',            // Axis labels
  tooltipBg: '#1e293b',       // Tooltip bg
  tooltipBorder: '#334155',   // Tooltip border
  categories: CATEGORY_COLORS, // Category-specific colors
  accent: '#C1440E',          // Primary accent
}
```

---

## 8. Known Quirks & Conventions

- **Driver.js v1.4.0** — uses `{ driver as Driver }` named export, constructor with `steps` array, `.drive()` method.
- **Zone polygon data:** Stored as coordinate arrays `[[lat, lng], ...]` directly in DB and seeders (not GeoJSON format).
- **City field `ville` vs `city`:** Zones use `ville`, users use `city` — be careful when joining.
- **CSS:** Mostly inline `style` objects, not Tailwind classes (Tailwind v4 is installed but rarely used).
- **File uploads:** Photos stored via `$request->file('photo')->store('remarques', 'public')`.
- **Error handling:** `store()` methods wrap creation in try/catch with separate `ValidationException` (422) and generic `Exception` (500) handlers.
- **Laravel 11+:** No `app/Http/Kernel.php`, no `app/Exceptions/Handler.php`. Middleware aliases in `bootstrap/app.php`.
- **Database:** SQLite by default. The `zone_id` and `profile`/`residence_duration` columns were originally NOT NULL; migrations were added to make them nullable for citizen submissions.
- **Analytics data source:** The `getUrbanStatsByZone()` function in `urbanApi.js` computes all statistics from raw remark data on the frontend (category/urgency/duration/profile breakdowns, temporal trends, affected groups from `reasons` array). The backend `DashboardController::stats()` only provides aggregate counts (total by statut/zone/category). For detailed analytics, fetch remarks via `GET /remarques` and compute client-side.
- **Data normalization:** `exportService.js` uses `normalizeRemarkRow()` to flatten remarks into export rows. The CSV headers are: `reference, date, latitude, longitude, category, urgency, duration, description, profile, reasons, zone_name, photo_url`.
- **Phantom fields (historical):** The frontend previously accessed `reporter_profile`, `affected_groups`, `zone_nom` (flat), and `category` (English) as fallback fields that don't exist in the DB. All have been migrated to use the correct DB field names: `profile`, `reasons`, `zone.nom` (nested relation), and `categorie` (French).
- **Login rate limit removed:** The `throttle:5,1` middleware was removed from `POST /login` and `POST /register` in `routes/api.php` during development to avoid 429 errors. Re-add if needed for production.
- **Onboarding tour persistence:** Uses `useCallback` memoization + 3 Driver.js callbacks (`onReset`, `onDestroyed`, last-step `popover.onClose`) to reliably set `urbanmap_tour_done` in localStorage. Previously `onReset` alone was unreliable when completing all steps.
- **Statut audit cleanup (2026-06-08):** After changing the remark statut lifecycle to `en_attente → en_cours → resolu / rejete` and removing `validee`/`planifie`/`urgent`/`active`/`planning` from the system, an audit found stale references in several components. All have been cleaned:
  - `Navbar.jsx` filter pills updated to use `en_cours`/`resolu`/`rejete`
  - `MapPage.jsx` and `CitizenMapPage.jsx` `STATUS_COLORS` updated
  - `MapPage.jsx` dead `MOCK_PARCELS` removed
  - `MapPage.jsx` `isValidated` checks use `['en_cours', 'resolu']`
  - `urbanApi.js` `getValidatedRemarks()` no longer hardcodes `statut: 'en_cours'`
  - `pdfService.js` now reads `remarque.statut` dynamically instead of hardcoded "En attente de traitement"
  - `UDComponents.jsx` orphaned `urgent` entry removed, fallback changed to `configs.en_cours`
  - `index.css` orphaned `@keyframes urgentPulse`/`activeBreathe` + `.zone-urgent`/`.zone-active` removed
  - `ValidationPanel.jsx` and `RemarquesTable.jsx` are dead code (not imported anywhere) — left in place but unused
