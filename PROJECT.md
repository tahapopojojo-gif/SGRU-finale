# UrbanMap Maroc — Full Project Documentation

> **Purpose:** A civic-tech platform for Moroccan cities where citizens report urban problems (roads, lighting, waste, water, parks, transport) and authorities manage them via a dashboard.
>
> **Stack:** Laravel 12 (backend API) + React 19 / Vite (frontend SPA) + SQLite (dev) + Leaflet (maps) + SMTP/Gmail (email).
>
> **UI Design:** Premium dark theme (`#060403` background, `#F2EDE6` text, `#C1440E` accent) with Lucide React icons, glassmorphic panels, and CSS animations.

---

## Table of Contents

0. [App Target & Logic](#0-app-target--logic)
1. [Architecture Overview](#1-architecture-overview)
2. [Backend (Laravel)](#2-backend-laravel)
3. [Frontend (React)](#3-frontend-react)
4. [Key Features Implemented](#4-key-features-implemented)
5. [Roles & Permissions](#5-roles--permissions)
6. [Running the App](#6-running-the-app)
7. [Testing](#7-testing)
8. [Diagrams & Reports (Data Flow)](#8-diagrams--reports-data-flow)
9. [Known Quirks & Conventions](#9-known-quirks--conventions)
10. [UI/UX Design System](#10-uiux-design-system-lucide--css-overhaul)
11. [Recent Changes & Fixes](#11-recent-changes--fixes)

---

## 0. App Target & Logic

### 0.1 What Is This App?

UrbanMap Maroc is a **civic-tech platform** that connects citizens with urban authorities across **24+ Moroccan cities** (Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir, etc.). Citizens report problems in their city (potholes, broken streetlights, garbage, water leaks, etc.) via an interactive map, and urban planners ("urbanistes") and administrators review, manage, and resolve those reports.

### 0.2 Why Does It Exist?

In many Moroccan cities, there is no centralized, transparent system for citizens to report urban issues. Problems go unreported or get lost in phone calls and paperwork. UrbanMap provides:

- **For citizens:** A simple, map-based way to report issues, attach photos, describe problems, and track resolution status.
- **For urbanistes (urban planners):** A dashboard to view citizen reports, add annotations per zone, generate statistics, and export data.
- **For admins:** Full management of users, zones, remarks, and system configuration.
- **For super admins:** Oversight of all activity, including admin user management.

### 0.3 Target Users

| Role | Label | Description |
|------|-------|-------------|
| `citoyen` | Citizen | Reports urban issues via the public map. No login required for viewing, but login needed to submit. |
| `urbaniste` | Urban Planner | Uses the Urbaniste Dashboard to review reports, add annotations, view zone statistics, export data. |
| `admin` | Administrator | Full CRUD on users, zones, remarks. Can send emails, manage roles, configure the system. |
| `super_admin` | Super Admin | Same as admin + can manage other admins, lock/unlock roles. |

### 0.4 How It Works — End-to-End Flow

```
Citizen opens map → Drops a pin → Fills in details (category, urgency, description, photo)
       ↓
Remark created (statut: "en_attente") → Email confirmation sent (optional queue)
       ↓
Urbaniste/Admin reviews on dashboard → Marks as "en_cours" (under investigation)
       ↓
Urbaniste adds zone annotations, urbaniste/admin resolves the issue
       ↓
Status changed to "resolu" or "rejete" → Email notification sent to citizen
```

**Detailed lifecycle of a remark (report):**
1. **Submission:** Citizen clicks "Signaler un problème" on the map, selects location, fills a form (category, urgency, duration, profile, description, optional photo).
2. **Auto-validation:** On creation, statut is set to `en_cours` (auto-validated) — no separate validation step.
3. **Review:** Urbaniste or admin views the remark on their dashboard. They can filter by zone, category, status, urgency.
4. **Annotation:** Urbanistes can add zone-level annotations (priorité: urgente, surveiller, informatif).
5. **Resolution:** Admin or urbaniste changes the statut to `resolu` or `rejete`. An email is queued to the citizen.
6. **Archiving:** Resolved/rejected remarks remain visible in filtered views for audit.

### 0.5 Key Logic Rules

- **Categories:** route, eclairage, dechets, eau, parc, transport (+ "autre"). Each has a fixed hex color and Lucide icon.
- **Urgency:** 1 (low) to 5 (critical). Displayed as color-coded badges.
- **Profile:** Who the reporter is — conducteur, pieton, resident, commercant, passant (nullable).
- **Residence duration:** How long the reporter has lived there (nullable).
- **Zones:** City districts defined as polygon coordinates on the map. Each remark is optionally linked to a zone (zone_id).
- **Statut lifecycle (2026-06-08 cleanup):** `en_attente → en_cours → resolu / rejete`. Removed old states: `validee`, `planifie`, `urgent`, `active`, `planning`.
- **Validation:** No separate "validation" step — remarks are auto-validated with statut `en_cours` on submission.
- **City data:** The frontend (Register.jsx) ships with **24+ cities** across 5 regions (Nord, Centre, Sud, Oriental, Souss-Massa). City bounds config is in `cityBounds.js`. The backend seeds focus on Marrakesh, but the architecture is city-agnostic.

### 0.6 Credentials (Dev)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@urbanmap.ma | super123 |
| Admin | mohammed.benali@urbanmap.ma | admin123 |
| Urbaniste | urbaniste@urbanmap.ma | admin123 |
| Citizen | citoyen@urbanmap.ma | citoyen123 |

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
| zone_id | bigint FK→zones | |
| resume | text | AI-generated summary |
| generated_at | timestamp | |

**Table: `categories`**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| nom | string | e.g. "Voirie" |
| couleur | string | Hex |
| icone | string | Icon name |

**Table: `personal_access_tokens`** — Laravel Sanctum tokens
**Table: `jobs`** — Queue table for emails
**Table: `failed_jobs`** — Failed queue jobs
**Table: `cache` / `cache_locks`** — Cache tables
**Table: `sessions`** — Session table

### 2.3 Models

- **User** — Sanctum auth, `role`/`statut` casts, relation: `remarques()`
- **Remarque** — BelongsTo User + Zone, casts for `reasons`/`problems` (array), `statut`/`categorie` enum strings
- **Zone** — HasMany Remarque, HasMany AnnotationUrbaniste, HasOne ZoneAiSummary
- **AnnotationUrbaniste** — BelongsTo Zone + User (urbaniste)
- **ZoneAiSummary** — BelongsTo Zone
- **Category** — Simple model (nom, couleur, icone)

### 2.4 API Routes

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | /api/register | No | — | Register as citoyen |
| POST | /api/login | No | — | Login, returns token |
| POST | /api/logout | Yes | — | Logout |
| GET | /api/user | Yes | — | Current user info |
| GET | /api/remarques | Yes | urbaniste/admin/super | List remarks (filtered) |
| POST | /api/remarques | Yes | citoyen | Submit remark |
| PUT | /api/remarques/{id} | Yes | urbaniste/admin/super | Update remark |
| GET | /api/remarques/{id} | Yes | urbaniste/admin/super | Single remark detail |
| GET | /api/zones | No | — | List zones (public) |
| POST | /api/zones | Yes | admin/super | Create zone |
| PUT | /api/zones/{id} | Yes | admin/super | Update zone |
| DELETE | /api/zones/{id} | Yes | admin/super | Delete zone |
| GET | /api/users | Yes | admin/super | List all users |
| PUT | /api/users/{id} | Yes | admin/super | Update user (role/statut) |
| POST | /api/users/{id}/send-email | Yes | admin/super | Send email to user |
| POST | /api/send-group-email | Yes | admin/super | Send email to user group |
| GET | /api/dashboard/stats | Yes | urbaniste/admin/super | Aggregate stats |
| GET | /api/annotations | Yes | urbaniste | List annotations |
| POST | /api/annotations | Yes | urbaniste | Create annotation |
| PUT | /api/annotations/{id} | Yes | urbaniste | Update annotation |
| DELETE | /api/annotations/{id} | Yes | urbaniste | Delete annotation |
| GET | /api/zone-summaries | Yes | urbaniste | List AI summaries |
| GET | /api/zone-summaries/{id} | Yes | urbaniste | Single summary |

### 2.5 Controllers

| Controller | Key Methods |
|------------|-------------|
| `AuthController` | `register()`, `login()`, `logout()`, `user()` |
| `RemarqueController` | `index()` (filtered by role/statut/zone/category/urgence), `store()`, `show()`, `update()` |
| `ZoneController` | `index()`, `store()`, `show()`, `update()`, `destroy()` |
| `UserController` | `index()`, `update()`, `sendEmail()` (individual), `sendGroupEmail()` |
| `DashboardController` | `stats()` — aggregate counts by statut/zone/categorie |
| `AnnotationController` | `index()`, `store()`, `update()`, `destroy()` |
| `ZoneSummaryController` | `index()`, `show()` |

### 2.6 Form Requests (Validation)

| Request | Rules |
|---------|-------|
| `LoginRequest` | email required, password required |
| `RegisterRequest` | nom required, email required|unique, password required|confirmed, password.min:8 |
| `StoreRemarqueRequest` | categorie required|in:route,eclairage,..., latitude/longitude required|numeric, opinion required, photo optional|image|max:5120, profile/residence_duration nullable |
| `UpdateRemarqueRequest` | Same as store but all optional |
| `StoreZoneRequest` | nom required, ville required, coordonnees_geojson required|json |
| `StoreAnnotationRequest` | zone_id required|exists, texte required, priorite required|in:urgente,surveiller,informatif |
| `UpdateAnnotationRequest` | Same as store but all optional |

### 2.7 Mailables & Email Templates

| Mailable | Trigger | Template |
|----------|---------|----------|
| `RemarqueConfirmationMailable` | Citizen submits a remark | `emails/remarque_confirmation.blade.php` |
| `ZoneCreatedMailable` | Admin creates a new zone | `emails/zone_created.blade.php` |
| `GroupEmailMailable` | Admin sends group email | `emails/group_email.blade.php` |
| `AccountStatusChangedMailable` | Admin changes user's statut | `emails/account_status_changed.blade.php` |
| `IssueResolvedMailable` | Remark changed to resolu/rejete | `emails/issue_resolved.blade.php` |

All emails are queued via `->queue()` method using the `database` queue driver.

### 2.8 Seeders

- **DatabaseSeeder:** Creates 4 default users (super_admin, admin, urbaniste, citoyen), 3 categories, 3 zones (Guéliz, Médina, Syba), calls `UnassignedReportsSeeder`.
- **UnassignedReportsSeeder:** Creates remarks without zone_id assignment.
- **RealisticSeedDataSeeder:** Alternative seeder with more realistic data volume.

### 2.9 Middleware

- **CheckRole:** Custom middleware in `bootstrap/app.php` as alias `'role'`. Usage: `->middleware('role:admin,super_admin')`.

### 2.10 Configuration

- **Mail:** `.env` has `MAIL_MAILER=smtp`, Gmail SMTP with app password.
- **Queue:** `QUEUE_CONNECTION=database` in `.env`.
- **CORS:** `config/cors.php` (or Laravel 12's built-in handling).
- **Login rate limit removed:** The `throttle:5,1` middleware was removed from `POST /login` and `POST /register` during development. Re-add for production.

---

## 3. Frontend (React)

### 3.1 Directory Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── CitizenMapPage.jsx      ← Public map (citizen report flow + tour)
│   │   ├── MapPage.jsx             ← Professional map (urbaniste/admin)
│   │   ├── Login.jsx               ← Login form
│   │   ├── Register.jsx            ← Registration form (3-step wizard)
│   │   ├── HomePage.jsx            ← Landing/role selector
│   │   ├── AdminDashboard.jsx      ← Admin dashboard (tabs)
│   │   ├── UrbanisteDashboard.jsx  ← Urbaniste dashboard (tabs)
│   │   ├── SuperAdminPage.jsx      ← Super admin oversight
│   │   ├── AccountPage.jsx         ← User account settings
│   │   ├── ForgotPassword.jsx      ← Password reset request
│   │   └── NotFound.jsx            ← 404 page
│   ├── components/
│   │   ├── Navbar.jsx              ← Top navigation bar
│   │   ├── Toast.jsx               ← Toast notification system
│   │   ├── EmptyState.jsx          ← Empty state placeholder
│   │   ├── FeedbackForm.jsx        ← Citizen report form (extracted for testing)
│   │   ├── ErrorBoundary.jsx       ← React error boundary
│   │   ├── ProtectedRoute.jsx      ← Auth + role gate wrapper
│   │   ├── SkeletonCard.jsx        ← Card skeleton loader
│   │   ├── SkeletonChart.jsx       ← Chart skeleton loader
│   │   ├── SkeletonLoader.jsx      ← Generic skeleton loader
│   │   ├── SkeletonTable.jsx       ← Table skeleton loader
│   │   ├── admin/
│   │   │   └── AdminUsersTab.jsx   ← User management tab (admin)
│   │   ├── dashboard/
│   │   │   ├── AdminRemarquesTab.jsx
│   │   │   ├── AdminStatistiquesTab.jsx
│   │   │   ├── AdminZonesTab.jsx
│   │   │   ├── AdminExportTab.jsx
│   │   │   ├── UrbanCarteTab.jsx
│   │   │   ├── UrbanStatistiquesTab.jsx
│   │   │   ├── UrbanOpinionsTab.jsx
│   │   │   ├── UrbanAnnotationsTab.jsx
│   │   │   ├── UrbanRapportTab.jsx
│   │   │   ├── ValidationPanel.jsx (dead code)
│   │   │   ├── RemarquesTable.jsx (dead code)
│   │   │   ├── HeatmapPanel.jsx
│   │   │   ├── AnnotationPanel.jsx
│   │   │   ├── UDComponents.jsx
│   │   │   ├── StatsCards.jsx
│   │   │   ├── ZoneManagement.jsx
│   │   │   └── UserManagement.jsx
│   │   ├── ui/
│   │   │   ├── Avatar.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Spinner.jsx
│   │   │   └── Tooltip.jsx
│   │   └── layout/
│   │       ├── DashboardLayout.jsx
│   │       ├── Sidebar.jsx
│   │       └── PageHeader.jsx
│   ├── services/
│   │   ├── api.js                  ← Axios instance (base URL, auth interceptor)
│   │   ├── axiosInstance.js        ← Axios instance (alternative, used for file uploads)
│   │   ├── adminApi.js             ← Admin-specific API calls
│   │   ├── urbanApi.js             ← Urbaniste-specific API calls
│   │   ├── exportService.js        ← Excel/CSV export utilities
│   │   ├── pdfService.js           ← PDF generation
│   │   ├── aiService.js            ← AI opinion analysis
│   │   ├── errorHandler.js         ← Centralized error handling
│   │   └── validationService.js    ← Form validation utilities
│   ├── context/
│   │   ├── AuthContext.jsx         ← Auth state provider
│   │   ├── ToastContext.jsx        ← Toast notifications provider
│   │   └── UrbanZoneContext.jsx    ← Urban zone state provider
│   ├── hooks/
│   │   ├── useAuth.js              ← Auth hook
│   │   ├── useToast.js             ← Toast hook
│   │   └── useResponsive.js        ← Responsive breakpoint hook
│   ├── test/
│   │   └── setup.js                ← Vitest setup (jest-dom matchers)
│   ├── __tests__/
│   │   ├── Register.test.jsx       ← Registration wizard tests
│   │   └── FeedbackForm.test.jsx   ← Feedback form "Autre" guardrail tests
│   ├── utils/
│   │   ├── cityBounds.js           ← Map bounds per city
│   │   ├── cityCoordinates.js      ← City center coordinates
│   │   └── unwrap.js               ← Data unwrapping utility
│   ├── index.css                   ← Global styles (dark theme, animations)
│   ├── main.jsx                    ← App entry point
│   └── App.jsx                     ← Router + auth check
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### 3.2 App Entry & Routing

```
main.jsx → ReactDOM.createRoot
   └── App.jsx
        ├── ToastProvider (context)
        ├── ErrorBoundary
        ├── BrowserRouter
        │    ├── /                  → HomePage
        │    ├── /dashboard         → RoleRedirect (auto-redirects to role dashboard)
        │    ├── /login             → Login
        │    ├── /register          → Register
        │    ├── /registre          → Register (aliased)
        │    ├── /forgot-password   → ForgotPassword
        │    ├── /map               → DynamicMapRoute (citizen → CitizenMapPage, pro → dashboard)
        │    ├── /account           → AccountPage (protected)
        │    ├── /admin/dashboard   → AdminDashboard (role: admin)
        │    ├── /urbaniste/dashboard → UrbanisteDashboard (role: urbaniste/admin)
        │    ├── /super-admin/users → SuperAdminPage (role: super_admin)
        │    └── *                  → NotFound
        └── AuthProvider (context)
```

- **Auth gate:** `App.jsx` checks `localStorage` for token and calls `GET /api/user` on mount. If valid, redirects away from login/register.
- **Role gates:** Each dashboard page checks the user's role via `ProtectedRoute` and redirects if unauthorized.
- **Toast system:** Global `ToastContext` + `ErrorBoundary` wrap the entire app.

### 3.3 Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| `HomePage` | `/` | Anyone | Landing page with role selection cards. Uses Lucide icons. |
| `Login` | `/login` | Guest | Role selector + email/password form. Dark theme. |
| `Register` | `/register` | Guest | 3-step registration wizard (role → city → info). 24+ cities. Lucide icons. |
| `ForgotPassword` | `/forgot-password` | Guest | Password reset request form. |
| `CitizenMapPage` | `/citizen-map` | Anyone | Public interactive map. Drop pins, submit reports, onboarding tour (Driver.js). |
| `MapPage` | `/map` | urbaniste/admin | Professional map with validated remarks overlay, zone polygons, panel system. |
| `AdminDashboard` | `/admin/dashboard` | admin/super_admin | Tabbed dashboard: Remarques, Stats, Zones, Export, Users. |
| `UrbanisteDashboard` | `/urbaniste/dashboard` | urbaniste/admin | Tabbed dashboard: Carte, Statistiques, Opinions, Annotations, Rapport. |
| `SuperAdminPage` | `/super-admin/users` | super_admin | Oversight page with platform stats (KPIs), role breakdown chart (recharts), user management with inline statut changes and pagination. |
| `AccountPage` | `/account` | Any auth | User account settings/profile management. |
| `NotFound` | `*` | Anyone | 404 page for unmatched routes. |

### 3.4 Services / API Layer

- **`api.js`** — Axios instance. Base URL from env (`VITE_API_URL`). Automatically attaches `Authorization: Bearer {token}` from localStorage. Handles 401 redirect.
- **`axiosInstance.js`** — Alternative Axios instance (may be used for file uploads with different content-type handling).
- **`adminApi.js`** — Functions: `getUsers()`, `updateUser()`, `sendEmail()`, `sendGroupEmail()`, `getDashboardStats()`, `getZones()`, `createZone()`, `updateZone()`, `deleteZone()`.
- **`urbanApi.js`** — Functions: `getValidatedRemarks({ ville, statut, categorie })`, `getUrbanStatsByZone(remarks)` (client-side computation), `getZones()`, `getAnnotations()`, `createAnnotation()`, `updateAnnotation()`, `deleteAnnotation()`.
- **`exportService.js`** — `normalizeRemarkRow()`, `exportExcel()` (multi-sheet Excel via xlsx library), `exportCSV()`.
- **`pdfService.js`** — PDF generation for individual remarks using the browser's print API or jsPDF.
- **`aiService.js`** — AI analysis of citizen opinions (summary generation).
- **`errorHandler.js`** — Centralized error handling utilities (format API errors, extract messages).
- **`validationService.js`** — Form validation helpers (email format, password strength, required fields).

### 3.5 Context Providers

- **AuthContext:** Provides `user`, `token`, `login()`, `register()`, `logout()`, `loading` across the app. Stores token in localStorage.
- **ToastContext:** Provides `toasts`, `addToast()`, `removeToast()` for global notifications.
- **UrbanZoneContext:** Provides zone-related state for the professional map experience.

### 3.6 Components

| Component | Location | Description |
|-----------|----------|-------------|
| `Navbar` | `Navbar.jsx` | Fixed top bar with UrbanMap logo, role-based nav links, user menu, live indicator. |
| `Toast` | `Toast.jsx` | Toast notification system with types (success, error, warning, info). Uses Lucide icons. |
| `EmptyState` | `EmptyState.jsx` | Placeholder for empty data states (no results, no remarks). |
| `ErrorBoundary` | `ErrorBoundary.jsx` | React error boundary with fallback UI. |
| `ProtectedRoute` | `ProtectedRoute.jsx` | Auth + role-based route guard wrapper. |
| `SkeletonCard` | `SkeletonCard.jsx` | Card skeleton placeholder for loading states. |
| `SkeletonChart` | `SkeletonChart.jsx` | Chart skeleton placeholder for loading states. |
| `SkeletonLoader` | `SkeletonLoader.jsx` | Generic skeleton loader. |
| `SkeletonTable` | `SkeletonTable.jsx` | Table skeleton placeholder. |
| `AdminUsersTab` | `admin/AdminUsersTab.jsx` | User table with role/statut management, email sending features. |
| `AdminRemarquesTab` | `dashboard/AdminRemarquesTab.jsx` | Admin remark management with CRUD, filters, category icons from Lucide. |
| `AdminStatistiquesTab` | `dashboard/AdminStatistiquesTab.jsx` | Charts (recharts) for category breakdown, urgency distribution, status overview. |
| `AdminZonesTab` | `dashboard/AdminZonesTab.jsx` | Zone CRUD with interactive polygon drawing on Leaflet map + priority annotations. |
| `AdminExportTab` | `dashboard/AdminExportTab.jsx` | Multi-format export (Excel/CSV/PDF) with filters, globe/chart themed. |
| `UrbanCarteTab` | `dashboard/UrbanCarteTab.jsx` | Zone heatmap with color-coded blocks, horizontal scroll, Lucide icons. |
| `UrbanStatistiquesTab` | `dashboard/UrbanStatistiquesTab.jsx` | Category trends, urgency heatmap, profile breakdown with recharts. |
| `UrbanOpinionsTab` | `dashboard/UrbanOpinionsTab.jsx` | Citizen remarks listing with filters, zone links, category icons, details modal. |
| `UrbanAnnotationsTab` | `dashboard/UrbanAnnotationsTab.jsx` | Zone annotations CRUD with priority pills and zone selector. |
| `UrbanRapportTab` | `dashboard/UrbanRapportTab.jsx` | Report builder with stats, download, and insight cards. |
| `HeatmapPanel` | `dashboard/HeatmapPanel.jsx` | Zone heatmap visualization panel. |
| `AnnotationPanel` | `dashboard/AnnotationPanel.jsx` | Inline annotation creation/editing panel. |
| `UDComponents` | `dashboard/UDComponents.jsx` | Shared urbaniste dashboard components (status configs, color maps). |
| `StatsCards` | `dashboard/StatsCards.jsx` | KPI stat cards (total, by status, by category). |
| `ZoneManagement` | `dashboard/ZoneManagement.jsx` | Zone CRUD with inline editing. |
| `UserManagement` | `dashboard/UserManagement.jsx` | User CRUD with role/statut editing. |
| `Avatar` | `ui/Avatar.jsx` | User avatar with initials fallback. |
| `Badge` | `ui/Badge.jsx` | Status/category badge. |
| `Button` | `ui/Button.jsx` | Reusable button with loading spinner (Loader2 from Lucide), variants. |
| `Card` | `ui/Card.jsx` | Reusable card wrapper. |
| `Input` | `ui/Input.jsx` | Styled input field. |
| `Modal` | `ui/Modal.jsx` | Overlay modal with close button (X from Lucide). |
| `Select` | `ui/Select.jsx` | Styled select with chevron (ChevronDown from Lucide). |
| `Spinner` | `ui/Spinner.jsx` | Animated loading spinner (Loader2 from Lucide). |
| `Tooltip` | `ui/Tooltip.jsx` | Hover tooltip. |
| `DashboardLayout` | `layout/DashboardLayout.jsx` | Dashboard wrapper with sidebar + header. Menu toggle uses Menu from Lucide. |
| `Sidebar` | `layout/Sidebar.jsx` | Navigation sidebar with role-based items. Uses multiple Lucide icons. |
| `PageHeader` | `layout/PageHeader.jsx` | Reusable page header with title and subtitle. |

### 3.7 Key UI Patterns

- **Tabs:** All dashboards use a tab-based layout. Active tab state managed by `useState`. Tab buttons use Lucide icons.
- **Tables:** Consistent dark table styling with `rgba(242,237,230,0.06)` row backgrounds, hover effects.
- **Charts:** recharts library with custom dark theme palette (card bg `#1e293b`, grid `#334155`, text `#94a3b8`).
- **Category colors:** Every category has a fixed color defined inline in each component that uses them (no shared constants file — defined per-component in CitizenMapPage.jsx, MapPage.jsx, UrbanCarteTab.jsx, etc.).
- **Pagination:** Custom pagination with prev/next buttons + page counter (implemented inline, no shared hook).
- **Filter pills:** Status filter pills with active state highlighting.
- **Responsive:** `useResponsive` hook provides `isMobile` flag. Layout adapts for mobile: stacked KPIs, narrower padding, collapsed nav.

---

## 4. Key Features Implemented

### 4.1 Citizen Map (CitizenMapPage)

- Public interactive Leaflet map with zone polygons (colored by category).
- "Signaler un problème" floating button (Plus icon from Lucide) → opens a side panel.
- Report form: category icons (Lucide), urgency slider, profile/residence dropdowns, description, photo upload.
- Zone auto-detection on pin drop (checks if lat/lng falls within any zone polygon).
- Onboarding tour (Driver.js v1.4.0) — 6-step tour on first visit, persisted in localStorage.
- Legend panel, feedback panel, zone filter toggles.

### 4.2 Professional Map (MapPage)

- Leaflet map with validated remarks shown as markers with popup details.
- Zone polygons displayed with zone name tooltips.
- Remarks list (left side panel) with search, filter by status/zone/category.
- Detail panel on marker click or list item click.
- Map layers control (base map + zone overlay toggle).

### 4.3 Admin Dashboard

- **Remarques tab:** Full CRUD table with inline editing, category icons, status badges.
- **Statistiques tab:** Bar chart (category breakdown), pie chart (urgency), area chart (trends).
- **Zones tab:** Interactive map with polygon drawing tools (leaflet-draw), zone CRUD form, annotation management with priority pills.
- **Export tab:** Multi-format export (Excel/CSV/PDF) with filters for city, date range, category. Globe and bar chart themed UI.
- **Users tab:** User listing with role/statut management, individual and group email sending.

### 4.4 Urbaniste Dashboard

- **Carte tab:** Zone heatmap grid — color-coded blocks per zone showing remark counts, horizontal scroll.
- **Statistiques tab:** Category distribution, urgency heatmap by zone, profile/reasons breakdown. All charts with consistent dark theme.
- **Opinions tab:** Citizen remarks listing with category icons (Lucide), urgency badges, zone links, detail modal, search/filter.
- **Annotations tab:** Zone-level annotations with priority system (urgence/surveiller/informatif) and color-coded pills.
- **Rapport tab:** Summary cards (total remarks, by zone, by urgency) with stats insight text, download button, bar chart preview.

### 4.5 Super Admin Page

- Platform-level KPIs: total users, pending users, total remarks, total zones (with Lucide icon cards).
- Role breakdown bar chart (recharts) showing citoyen/admin/urbaniste distribution.
- Two tabs: "En attente" (pending approvals) and "Tous les utilisateurs" (all users).
- Pending tab: Activate/reject buttons with confirmation dialogs.
- All users tab: Inline statut selector (dropdown) with Save/Cancel buttons. Pagination (8 users/page).
- Loading states: full skeleton placeholder while stats load.

### 4.6 Email System

- 5 email types (confirmation, zone created, group email, account status change, issue resolved).
- All emails queued via `database` queue driver.
- Admin users tab: send individual email or group email by role filter.
- Queue processes via `php artisan queue:work`.

### 4.7 Onboarding Tour

- Driver.js v1.4.0 integrated on CitizenMapPage.
- 6-step tour: Welcome → Report button → Map basics → Zone info → Category colors → Completion.
- Persistence via localStorage key `urbanmap_tour_done`.
- 3 safety mechanisms to mark tour done: `onReset`, `onDestroyed`, and last-step `popover.onClose`.
- Uses `useCallback` memoization to prevent re-creation of step handlers.

### 4.8 Registration (Register.jsx — 3-Step Wizard)

- **Step 1 – Role:** Citizen, Urbaniste, or Administrator role cards with icons, descriptions, and feature badges. Highlighted default (Citoyen).
- **Step 2 – City:** Searchable city selector with 24+ cities grouped by region (Nord, Centre, Sud, Oriental). Region filter tabs, activity indicators, status badges. Selected city preview with change option.
- **Step 3 – Info:** Full name, email, neighborhood (citizen only) with pill selector, department/service (admin/urbaniste only) with autocomplete suggestions, password + confirmation. Ghost-style submit button with hover fill effect.

---

## 5. Roles & Permissions

| Action | citoyen | urbaniste | admin | super_admin |
|--------|---------|-----------|-------|-------------|
| View public map | ✓ | ✓ | ✓ | ✓ |
| Submit remark | ✓ | ✓ | ✓ | ✓ |
| View own remarks | ✓ | ✓ | ✓ | ✓ |
| View all remarks | — | ✓ | ✓ | ✓ |
| Update any remark | — | ✓ | ✓ | ✓ |
| View zone annotations | — | ✓ | ✓ | ✓ |
| CRUD annotations | — | ✓ | — | — |
| View dashboard stats | — | ✓ | ✓ | ✓ |
| Manage users | — | — | ✓ | ✓ |
| Manage zones (CRUD) | — | — | ✓ | ✓ |
| Send emails | — | — | ✓ | ✓ |
| Manage admins | — | — | — | ✓ |
| Export data | — | ✓ | ✓ | ✓ |

---

## 6. Running the App

### 6.1 Backend (Laravel)

```bash
cd urbanmap-backend
copy .env.example .env        # Configure DB, MAIL, QUEUE
php artisan key:generate
php artisan migrate --seed
php artisan serve              # http://localhost:8000
php artisan queue:work         # In separate terminal (for emails)
```

### 6.2 Frontend (React/Vite)

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

### 6.4 Running Tests

```bash
# Backend tests
cd urbanmap-backend
php artisan test

# Frontend tests
cd frontend
npm test                # Single run
npm run test:watch      # Watch mode
```

### 6.5 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@urbanmap.ma | super123 |
| Admin (Mohammed Benali) | mohammed.benali@urbanmap.ma | admin123 |
| Urbaniste | urbaniste@urbanmap.ma | admin123 |
| Citizen | citoyen@urbanmap.ma | citoyen123 |

---

## 7. Testing

### 7.1 Backend (PHPUnit)

The backend uses **PHPUnit 11.x** with in-memory SQLite for testing.

**Test command:**
```bash
cd urbanmap-backend
php artisan test
```

**Test files** (4 feature test suites, 16 tests total):

| Test file | What it covers |
|-----------|---------------|
| `tests/Feature/AuthTest.php` | Register citoyen (active), register urbaniste (pending), login, pending user blocked, invalid credentials |
| `tests/Feature/RemarqueValidationTest.php` | Valid store, missing/short opinion for 'Autre' category, non-Autre bypass, missing required fields |
| `tests/Feature/RemarqueGeolocationTest.php` | Auto `zone_id` assignment when point falls inside zone polygon, null zone_id when outside |
| `tests/Feature/RolePermissionTest.php` | Citoyen gets 403 on status change, urbaniste can update, admin can update, unauthenticated gets 401 |

**Test configuration** (`phpunit.xml`):
- `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` — isolated in-memory DB per test
- `MAIL_MAILER=array` — mail trapped in memory, not sent
- `QUEUE_CONNECTION=sync` — jobs run inline
- All tests use `RefreshDatabase` trait for clean state

### 7.2 Frontend (Vitest + React Testing Library)

The frontend uses **Vitest 3.x** with **React Testing Library 16.x** and **jsdom**.

**Test commands:**
```bash
cd frontend
npm test            # Single run
npm run test:watch  # Watch mode
```

**Test files** (2 suites, 11 tests total):

| Test file | What it covers |
|-----------|---------------|
| `src/__tests__/Register.test.jsx` | 3-step wizard: role selection advances step 2 → step 3; citoyen shows quartier selector; admin/urbaniste show department autocomplete; back button returns |
| `src/__tests__/FeedbackForm.test.jsx` | "Autre" guardrail: label changes to `(obligatoire)`, placeholder becomes mandatory, submit disabled when empty, enabled when filled; non-Autre shows `(optionnel)` |

**Test configuration** (`vite.config.js`):
- `environment: 'jsdom'` — browser-like DOM in Node
- `globals: true` — Vitest API available without imports
- `setupFiles: './src/test/setup.js'` — jest-dom matchers + global React

**Architecture note:** The `FeedbackForm` component was extracted from `CitizenMapPage.jsx` into its own file (`src/components/FeedbackForm.jsx`) to enable isolated testing without requiring Leaflet, Driver.js, or other heavy map dependencies.

---

## 8. Diagrams & Reports (Data Flow)

### 8.1 Data Source

All analytics and exports start from the **`remarques`** (remarks) table. The backend exposes remarks via `GET /api/remarques` with query filters: `ville` (city), `statut` (status), `categorie` (category), `urgence` (urgency).

### 8.2 Computing Statistics

All detailed statistics are computed **client-side** in `urbanApi.js` via `getUrbanStatsByZone()`. The backend `DashboardController::stats()` only provides aggregate counts (total by statut/zone/category).

**`getUrbanStatsByZone(remarks)` returns:**

```js
{
  categoryBreakdown: { route: 12, eclairage: 8, ... },
  urgencyBreakdown: { 1: 5, 2: 10, 3: 8, 4: 3, 5: 2 },
  profileBreakdown: { conducteur: 8, pieton: 12, ... },
  durationBreakdown: { jours: 5, semaines: 8, mois: 10, années: 3 },
  reasonsBreakdown: { 'Signalement citoyen': 20, ... },
  temporalTrend: { '2026-01': 5, '2026-02': 8, ... },   // grouped by month
  zoneStats: { 'Guéliz': { total: 10, ... }, ... },        // per-zone breakdown
  affectedGroups: { route: { conducteur: 3, ... }, ... },  // affected groups per category
}
```

### 8.3 Category System

Category colors are defined inline in each component that uses them — there is no shared constants file. Each component (CitizenMapPage.jsx, MapPage.jsx, UrbanCarteTab.jsx, etc.) has its own `CATEGORY_COLORS` or equivalent object.

Standard categories:

```js
// Example from CitizenMapPage.jsx
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

Category icons from Lucide:
| Category | Lucide Icon |
|----------|-------------|
| route | Truck |
| eclairage | Lightbulb |
| dechets | Trash2 |
| eau | Droplets |
| parc | Trees |
| transport | Bus |
| autre | MapPin |

### 8.4 Building a New Diagram / Report

1. **Fetch data:** Call `getValidatedRemarks({ ville: 'Marrakesh' })` from `urbanApi.js`, or use `adminApi.getDashboardStats()` for aggregates
2. **Normalize:** Each remark has all needed fields directly (no nested unwrapping needed for basic fields). For exports, use `normalizeRemarkRow(remark, zones, city)` from `exportService.js`
3. **Compute:** Use native JS `Array.reduce()`, `Array.filter()`, etc. — all stats are computed client-side
4. **Render:** Use `recharts` components (`BarChart`, `PieChart`, `AreaChart`, `LineChart`) with the dark theme palette
5. **Export:** Use `exportService.exportExcel(remarks, zones, city)` for Excel with multiple sheets, or the CSV generator

### 8.5 Theme Colors for Charts

```js
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

## 9. Known Quirks & Conventions

- **Driver.js v1.4.0** — uses `{ driver as Driver }` named export, constructor with `steps` array, `.drive()` method.
- **Zone polygon data:** Stored as coordinate arrays `[[lat, lng], ...]` directly in DB and seeders (not GeoJSON format).
- **City field `ville` vs `city`:** Zones use `ville`, users use `city` — be careful when joining.
- **CSS:** Most styling uses inline `style` objects or index.css classes. Tailwind v4 is installed but rarely used.
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
- **Category colors are NOT centralized:** Each component (CitizenMapPage.jsx, MapPage.jsx, UrbanCarteTab.jsx, etc.) defines its own `CATEGORY_COLORS` inline. Changes must be applied across all files.
- **Two Axios instances:** `api.js` (standard) and `axiosInstance.js` (may be used for uploads). Both exist in `services/`.
- **Responsive design:** `useResponsive` hook is used in SuperAdminPage.jsx and likely other pages for mobile layout adaptation.

---

## 10. UI/UX Design System (Lucide & CSS Overhaul)

### 10.1 Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#060403` | Main background |
| `bg-card` | `#1e293b` | Card/dashboard backgrounds |
| `text-primary` | `#F2EDE6` | Primary text |
| `text-muted` | `rgba(242,237,230,0.6)` | Secondary text |
| `accent` | `#C1440E` | Primary accent (buttons, highlights) |
| `border-subtle` | `rgba(242,237,230,0.08)` | Subtle borders |
| `border-accent` | `rgba(193,68,14,0.35)` | Accent borders |
| Font | `'DM Sans', sans-serif` | Body text |

### 10.2 Lucide React Icon System

All UI icons across the app have been migrated from emoji characters to **Lucide React v1.14.0** icons. This provides:

- Consistent vector rendering at any size
- Proper dark theme integration (stroke color inherits from CSS)
- Accessibility (icons are semantic, not text)
- Hover/active state transitions

**Component-to-Lucide mapping:**

| Component | Icons Used |
|-----------|------------|
| `HomePage.jsx` | User, Shield, Compass, Crown |
| `Login.jsx` | User, Compass, Shield |
| `Register.jsx` | User, Compass, Shield, Search, Building2 |
| `ForgotPassword.jsx` | (various) |
| `AccountPage.jsx` | (various) |
| `CitizenMapPage.jsx` | Plus, Truck, Lightbulb, Trash2, Droplets, Trees, Bus, MapPin |
| `AdminDashboard.jsx` | ClipboardList, Map, BarChart2, Download, Users |
| `UrbanisteDashboard.jsx` | Map, BarChart2, MessageSquare, BookMarked, FileText, Download, Sparkles |
| `SuperAdminPage.jsx` | Users, Clock, MapPin, Map |
| `Navbar.jsx` | Menu, User, LogOut, etc. (inline) |
| `Toast.jsx` | CheckCircle, XCircle, Info, AlertTriangle, X |
| `AdminUsersTab.jsx` | Send, Users |
| `AdminRemarquesTab.jsx` | Truck, Lightbulb, Trash2, Droplets, Trees, School, Bus, MapPin |
| `AdminStatistiquesTab.jsx` | Truck, Lightbulb, Trash2, Droplets, Trees, School, Bus, MapPin |
| `AdminExportTab.jsx` | FileSpreadsheet, Globe, BarChart2, FileText |
| `AdminZonesTab.jsx` | MapPin, Edit3, Trash2, Plus, Save, X, AlertTriangle |
| `UrbanCarteTab.jsx` | Thermometer, BarChart2 |
| `UrbanStatistiquesTab.jsx` | Truck, Lightbulb, Trash2, Droplets, Trees, Bus, Hospital, School, MapPin, BarChart2 |
| `UrbanOpinionsTab.jsx` | Truck, Lightbulb, Trash2, Droplets, Trees, Bus, Hospital, School, MapPin, AlertCircle, Clock, Search |
| `UrbanAnnotationsTab.jsx` | Lock, FileText, AlertCircle, Eye, Info |
| `UrbanRapportTab.jsx` | BarChart2, Building2, TrendingUp, Sparkles, Download, Eye, Loader |
| `Button.jsx` | Loader2 |
| `Modal.jsx` | X |
| `Select.jsx` | ChevronDown |
| `Spinner.jsx` | Loader2 |
| `DashboardLayout.jsx` | Menu |
| `Sidebar.jsx` | LayoutDashboard, Map, BarChart2, MessageSquare, BookMarked, FileText, Download, Sparkles, Users, Settings, LogOut, ChevronLeft, ChevronRight |

### 10.3 CSS Animations

Defined in `index.css`:

| Class/Keyframe | Purpose |
|----------------|---------|
| `.fade-in` | Opacity fade-in for elements |
| `.slide-in-from-bottom-4` | Slide up + fade (cards, panels) |
| `.zoom-in-95` | Scale up + fade (modals) |
| `@keyframes livePulse` | Green pulsing dot (Navbar "Live" indicator) |
| `@keyframes pulse` | Radial scale pulse (map markers) |
| `@keyframes slideInRight` | Panel slide-in (zones create panel) |
| `@keyframes spin` | Loading spinner rotation |
| `@keyframes dotpulse` | Three-dot loading animation |
| `@keyframes adpulse` | Opacity pulse (recharts active bar) |
| `prefers-reduced-motion` | Respects OS motion settings |

### 10.4 Glassmorphic Elements

- **Leaflet layers control:** `backdrop-filter: blur(18px)` with semi-transparent background.
- **Map panels:** Semi-transparent dark backgrounds with border accents.
- **Zone create panel:** `background: rgba(8,6,3,0.98)` with `box-shadow` and border accents.

### 10.5 Navbar Design

- Fixed position with `z-index: 1100`.
- Bottom gradient line (`rgba(193,68,14,0.45)` accent).
- Live indicator dot with `livePulse` animation.
- Scrim on mobile overlay.
- Responsive — collapses search bar on mobile.

### 10.6 Accessibility (WCAG 2.1 AA)

- Universal `:focus-visible` outline (3px indigo ring).
- `.sr-only` utility for screen-reader-only content.
- Skip-link (appears on keyboard focus).
- `prefers-reduced-motion` respects OS settings.
- `forced-colors` media query for Windows High Contrast Mode.
- Minimum 44px tap targets on interactive elements.
- Error messages use `#b91c1c` (5.1:1 contrast ratio).
- `aria-disabled` styling for disabled interactive elements.

---

## 11. Recent Changes & Fixes

### 11.1 Lucide React Icon Migration (2026-06-09/10)

Replaced all emoji characters (⚠️, 🚛, 💡, 🗑️, 💧, 🌳, 🚌, etc.) with Lucide React components across **17+ components**:

- All dashboard tabs (Admin & Urbaniste)
- Toast notification system
- Login, Register, HomePage role selectors
- Sidebar navigation items
- Admin zones tab icons
- Super admin page stats cards

### 11.2 CSS Dark Theme Enhancement (2026-06-09/10)

- Added `livePulse` animation for navbar live indicator
- Enhanced glassmorphic Leaflet controls with `backdrop-filter`
- Gradient underline effect on navbar (`::after`)
- Custom animations: `fade-in`, `slide-in-from-bottom-4`, `zoom-in-95`
- Recharts cursor/active-bar transparency fixes
- Leaflet container dark background (`#1a1a2e`)
- Focus outline accessibility improvements
- Zone tooltip styling (text-shadow for readability on maps)

### 11.3 Toast Notification System (2026-06-09/10)

- New `Toast.jsx` component with Lucide icons for each type: success (CheckCircle), error (XCircle), warning (AlertTriangle), info (Info)
- Auto-dismiss with progress bar
- Click-to-close with X icon
- Positioned fixed at top-right

### 11.4 Users Tab — Send Email Feature (2026-06-09/10)

- Added "Send Email" button to each user row in `AdminUsersTab.jsx`
- Individual email modal with subject/message fields
- Group email functionality (filter by role, send to all matching users)
- Uses `GroupEmailMailable` and `AccountStatusChangedMailable`

### 11.5 UrbanCarteTab Grid Fix (2026-06-10)

- Fixed grid layout to show zone cards in a proper row layout
- Added horizontal scroll for overflow
- Each zone card shows remark count with accent background and Lucide icons

### 11.6 Pagination Hook Rename (2026-06-10)

- `useAppPaginator` renamed to `usePaginator` across all imports
- All references updated in dashboard tabs

### 11.7 Period Typo Fix (2026-06-10)

- Fixed French typo: `année` → `année` in date period aggregation labels

### 11.8 Urbaniste Password Change (2026-06-10)

- Changed urbaniste password from `password` to `admin123` in `DatabaseSeeder.php`
- All dev passwords now consistent: `admin123` for admin/urbaniste, `super123` for super_admin, `citoyen123` for citizen

### 11.9 Bug Fixes & Cleanups

- Fixed `UserController.php` import path for `GroupEmailMailable`
- Removed unused imports and variables across components
- Fixed `AdminZonesTab.jsx` icon references (trash → Trash2, etc.)
- Fixed `UrbanAnnotationsTab.jsx` priority display logic
- Fixed `UrbanOpinionsTab.jsx` category icon mapping
- Fixed `AdminStatistiquesTab.jsx` recharts bar cursor visibility
- Fixed `AdminExportTab.jsx` button layout with Lucide icons
- Fixed `UrbanStatistiquesTab.jsx` missing line chart data key
- Fixed `UrbanRapportTab.jsx` skeleton loader integration
- Fixed all Lucide import paths and SVG element type conflicts

### 11.10 Mandatory Description for "Autre" Category (2026-06-10)

- When a citizen selects "Autre" as the problem type in the report form (`CitizenMapPage.jsx`), the description field becomes **mandatory** (not optional)
- Label changes dynamically from `(optionnel)` to `(obligatoire)` 
- Placeholder changes to prompt for a precise description
- Submit button is disabled if "Autre" + description is empty
- A validation error is shown if the user tries to proceed without filling the description
- Only affects the "Autre" category — all other categories keep description as optional

### 11.11 Register.jsx — Visual Changes (2026-06-10)

- **Step 2 continue button:** Changed from solid (`#C1440E` background) to ghost style (`transparent` background, `#C1440E` text/border). Hover fills solid `#C1440E` with white text only when a city is selected.
- **Step 3 submit button:** Changed from solid to ghost style matching the Step 2 pattern. Hover fills solid only when not loading.
- **Department emoji replaced:** Replaced `🏢` emoji in the department suggestions dropdown with Lucide's `Building2` icon for consistent vector rendering.
- Added `Building2` import from `lucide-react` (line 3).
- Added `display: flex`, `alignItems: 'center'`, `gap: '8px'` to suggestion items for proper icon alignment.

### 11.12 Backend Tests (PHPUnit) — 4 Feature Suites (2026-06-11)

- Created `tests/Feature/AuthTest.php` (5 tests): register citoyen (active), register urbaniste (pending), login, pending user blocked, invalid credentials
- Created `tests/Feature/RemarqueValidationTest.php` (5 tests): valid store, missing/short opinion for 'Autre' category, non-Autre bypass, missing required fields
- Created `tests/Feature/RemarqueGeolocationTest.php` (2 tests): auto zone_id assignment, null when outside zone
- Created `tests/Feature/RolePermissionTest.php` (4 tests): citoyen 403 on status change, urbaniste can update, admin can update, unauthenticated 401
- Added `withValidator` guardrail to `StoreRemarqueRequest.php` (requires min:10 opinion when categorie === 'Autre')
- Added `Zone::findContainingPoint()` and `Zone::pointInPolygon()` methods to `app/Models/Zone.php`
- Refactored `ZoneController` to use `Zone::pointInPolygon()` instead of private method
- Added auto zone_id assignment in `RemarqueController::store()` via `Zone::findContainingPoint()`
- Added `urbaniste` role to PATCH `/remarques/{remarque}` route
- All 16 tests, 45 assertions passing — in-memory SQLite via RefreshDatabase

### 11.13 Frontend Tests (Vitest + RTL) — 2 Suites (2026-06-11)

- Installed vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom
- Configured `vite.config.js` with test block (jsdom, globals, setupFiles)
- Added `test` and `test:watch` scripts to `package.json`
- Created `src/test/setup.js` (imports jest-dom + global React)
- Extracted `FeedbackForm` from `CitizenMapPage.jsx` to `src/components/FeedbackForm.jsx` for isolated testing
- Created `src/__tests__/Register.test.jsx` (5 tests): role visibility in 3-step wizard
- Created `src/__tests__/FeedbackForm.test.jsx` (6 tests): "Autre" category guardrail behavior
- All 11 frontend tests passing

### 11.14 PROJECT.md — Testing Section & File Updates (2026-06-11)

- Added section 7 (Testing) documenting both backend and frontend test suites
- Added 6.4 (Running Tests) with test commands
- Updated frontend directory structure: FeedbackForm.jsx, test/, __tests__/
- Updated ToC to include Testing section
- Renumbered sections (7→8, 8→9, 9→10, 10→11) and all subsections to accommodate new section 7
