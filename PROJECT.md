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
7. [Known Quirks & Conventions](#7-known-quirks--conventions)

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
│   │   └── GroupEmailMailable.php
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
│   ├── migrations/           ← 14 migration files
│   └── seeders/
│       ├── DatabaseSeeder.php
│       ├── RealisticSeedDataSeeder.php
│       └── UnassignedReportsSeeder.php (if exists)
├── resources/views/emails/
│   ├── remarque_confirmation.blade.php
│   ├── zone_created.blade.php
│   └── group_email.blade.php
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
| statut | enum('en_attente','validee','rejete','planifie') | Default 'en_attente' |
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
| POST | `/register` | AuthController@register | Rate limited: 5/1min |
| POST | `/login` | AuthController@login | Rate limited: 5/1min |
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
- `store()` — Creates zone, optionally associates remark_ids. Notifies all active super_admin/admin/urbaniste users via ZoneCreatedMailable (queued).
- `update()` — Updates zone.
- `destroy()` — Deletes zone.

**`UserController`**
- `index()` — Lists all users.
- `pending()` — Lists users with statut=pending.
- `update()` — Updates user statut/role/company_name/city.
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
| **`StoreRemarqueRequest`** | zone_id (nullable,exists:zones,id), categorie (required), statut (nullable,in:[...]), building_type (nullable), reasons (required,array), problems (required,array), urgency (required,1-5), duration (nullable), profile (nullable — defaults to 'citoyen'), residence_duration (nullable — defaults to 'non_renseigne'), opinion (required), photo (nullable,image,max:5120KB), latitude (required,numeric), longitude (required,numeric) |
| `UpdateRemarqueRequest` | statut (sometimes,in:[...]), commentaire_admin (nullable,string) |
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

**`RealisticSeedDataSeeder`** creates 40 realistic citizen reports across the 3 zones with varied categories, urgency levels, profiles, durations, and realistic French descriptions. All have `statut=validee` and `opinion_ai_validated=true` so they appear in citizen map and analysis.

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

**`CitizenMapPage.jsx`** (~1910 lines) — The main citizen-facing map. Features:
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

**`MapPage.jsx`** (~1900 lines) — Professional/legacy map. Similar to CitizenMapPage but:
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
- AI synthesis modal (`generateAiSynthesize()`)
- Export PDF button
- Keyboard navigation for tabs

### 3.4 Services / API Layer

**`axiosInstance.js`** — Axios instance with `baseURL: http://localhost:8000/api`, auto-attaches `Authorization: Bearer <token>` from localStorage, handles 401 by clearing auth and redirecting to `/login`.

**`api.js`** — Main API client: `register`, `login`, `logout`, `getCurrentUser`, `getRemarks`, `createRemark` (multipart/form-data), `updateProfile`, `getMyRemarks`.

**`urbanApi.js`** — Urbanist-specific: `getZonesWithStats`, `getValidatedRemarks`, `getAnnotations`, `saveAnnotation`, `updateAnnotation`, `deleteAnnotation`, `getZoneAiSummary`, `generateZoneAiSummary`, `getUrbanStatsByZone` (comprehensive stats computation).

**`adminApi.js`** — Admin-specific: zone CRUD, remark management, dashboard stats, user management, group email, CSV export.

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

- **Styling:** Inline `styles` objects (not CSS modules or styled-components). Dark theme with colors like `#0f172a` (bg), `#1e293b` (card), `#C1440E` (accent/orange), `#F2EDE6` (text/light).
- **Design system:** Components/ui/ folder has reusable primitives, but most pages use inline styles.
- **Icon library:** `lucide-react` and `react-icons`.
- **Charts:** `recharts` (BarChart, AreaChart, PieChart).
- **Maps:** `react-leaflet` v5 with `leaflet` v1.9, `leaflet-draw` for polygon editing, `leaflet.heat` for heatmap.
- **PDF export:** `jspdf` + `jspdf-autotable` + `html2canvas`.
- **Excel export:** `xlsx` library.
- **Skeletons:** Custom `SkeletonCard`, `SkeletonChart`, `SkeletonTable`, `SkeletonLoader`.
- **Tour:** `driver.js` v1.4.0 (named export `{ driver }`, API: constructor with `steps` array, `.drive()` method).

---

## 4. Key Features Implemented

### 4.1 Citizen Map (CitizenMapPage)

**Purpose:** Allow citizens to view urban reports on a map and submit new ones.

**Key behaviors:**
- Fetches all remarks from `GET /remarques` (public endpoint)
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

User management with pending user approval, role assignment, statut changes.

### 4.6 Email System

**Three email types:**
1. **Remarque Confirmation** — sent to citizen when they submit a report
2. **Zone Created Notification** — sent to all active super_admin/admin/urbaniste when a new zone is created
3. **Group Email** — sent by admin to a selected user group (citizens/urbanistes/admins/all/zone-specific)

**Critical:** All emails are queued. Must run `php artisan queue:work` in a terminal for emails to actually send.

### 4.7 Onboarding Tour

Uses **Driver.js v1.4.0** (not older versions with `defineSteps`/`start` API). Correct API:
```js
import { driver as Driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const driver = new Driver({
  animate: true,
  steps: [{ element: '#id', popover: { title, description, position } }],
  onReset: () => localStorage.setItem('tour_done', 'true'),
})
driver.drive()  // NOT driver.start()
```

---

## 5. Roles & Permissions

| Role | Abilities |
|------|-----------|
| **citoyen** | View public map, submit reports, view own reports |
| **urbaniste** | All citizen abilities + view annotations, manage annotations, view zone summaries, generate AI summaries, access Urbaniste Dashboard |
| **admin** | All urbaniste abilities + manage zones (CRUD), manage remarks (update statut), view dashboard stats, send group emails, view all users |
| **super_admin** | All admin abilities + approve/reject user registrations, change user roles/statuts |

Registration flow: Citizens are auto-activated. Admin/urbaniste registrations go to `statut=pending` and must be approved by super_admin.

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

## 7. Known Quirks & Conventions

- **Driver.js v1.4.0** — uses `{ driver as Driver }` named export, constructor with `steps` array, `.drive()` method.
- **Field name mismatch:** Frontend may send `reporter_profile` or `profile` (handled by urbanApi.js mapping `r.profile || r.reporter_profile`). DB column is `profile`.
- **Zone polygon data:** Stored as coordinate arrays `[[lat, lng], ...]` directly in DB and seeders (not GeoJSON format).
- **City field `ville`:** Zones use `ville`, users use `city` — be careful when joining.
- **CSS:** Mostly inline `style` objects, not Tailwind classes (Tailwind v4 is installed but rarely used).
- **File uploads:** Photos stored via `$request->file('photo')->store('remarques', 'public')`.
- **Error handling:** `store()` methods wrap creation in try/catch with separate `ValidationException` (422) and generic `Exception` (500) handlers.
- **Laravel 11+:** No `app/Http/Kernel.php`, no `app/Exceptions/Handler.php`. Middleware aliases in `bootstrap/app.php`.
- **Database:** SQLite by default. The `zone_id` and `profile`/`residence_duration` columns were originally NOT NULL; migrations were added to make them nullable for citizen submissions.
