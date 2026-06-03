# UrbanMap Maroc - Comprehensive Project Architecture & State

This document serves as the absolute source of truth regarding the current technical state, architecture, database schemas, and implementations for both the **Frontend** and **Backend** of the **UrbanMap Maroc** project. It is specifically structured to provide full context to any AI agent or developer joining the project.

## 📋 1. Project Overview
**UrbanMap Maroc** is a spatial management and citizen participation platform dedicated to urban planning in Morocco (Marrakech, Casablanca, Rabat, etc.). It enables interaction between citizens, urban planners, and local authorities, leveraging Artificial Intelligence for opinion moderation, data analysis, and synthesis.

The project is split into two main directories:
- `/frontend/` - React SPA Client
- `/urbanmap-backend/` - Laravel API Server

---

## 💻 2. Frontend State (Client Side)

The frontend is a modern Single Page Application (SPA) built to consume the backend REST API.

### Technical Stack & Styling Conventions
- **Core Framework**: React 19 (via Vite 8)
- **Routing**: React Router DOM (`react-router-dom` v7)
- **Styling**: **Inline CSS only**. Tailwind is present in the build pipeline (`index.css`), but do NOT use Tailwind utility classes in JSX.
- **Color Palette**: Primary `#C1440E`, Text `#F2EDE6`, Background `#060403`, Accent `#E8B87A`, Secondary `#1A5276`
- **Fonts**: `DM Sans` (UI), `Amiri` (Headings/Brand), `DM Mono` (Monospace)
- **Theme**: Dark mode only, glassmorphism effects.
- **HTTP Client**: Axios (`src/services/axiosInstance.js`)
- **Mapping & GIS**: `leaflet` & `react-leaflet`
- **Data Visualization**: `recharts`
- **Document Generation**: `jspdf` & `jspdf-autotable` (used in `pdfService.js` for auto-generating PDF receipts)
- **Icons**: `lucide-react` & `react-icons`

### File Tree & Structure
**Pages (`src/pages/`)**:
- `HomePage.jsx`: Public landing page at `/`
- `Login.jsx`: Login with role selector pills (citoyen/urbaniste/admin)
- `Register.jsx` & `ForgotPassword.jsx`: Auth pages
- `PublicMapPage.jsx`: Public map at `/map` (no auth required), with drawing + remark submission + auto PDF download
- `AdminDashboard.jsx`: Admin dashboard at `/admin/dashboard` (5 tabs: Remarques, Zones, Statistiques, Export CSV, Utilisateurs)
- `UrbanisteDashboard.jsx`: Urbaniste dashboard at `/urbaniste/dashboard`
- `SuperAdminPage.jsx`: Super admin at `/super-admin/users`
- `MapPage.jsx`: Authenticated map page
- `NotFound.jsx`: 404 page

**Components (`src/components/`)**:
- `Navbar.jsx`: Fixed top navbar (50px). Context-aware.
- `ProtectedRoute.jsx`: Role-based route guard.
- `admin/AdminUsersTab.jsx`: User listing, search, filter, pagination, and group email functionality.
- `dashboard/`: Contains dashboard tabs (`AdminRemarquesTab.jsx`, `AdminZonesTab.jsx`, `AdminStatistiquesTab.jsx`, `AdminExportTab.jsx`, `UDComponents.jsx`). Admin drawing has been removed.

**Services (`src/services/`)**:
- `api.js`: Core API endpoints
- `adminApi.js`: Admin-specific (stats, CRUD, `getUsers`, `sendGroupEmail`)
- `urbanApi.js`: Urbaniste-specific
- `pdfService.js`: jsPDF generator for remark receipts
- `aiService.js`, `validationService.js`, `errorHandler.js`

---

## ⚙️ 3. Backend State (Server Side)

### Technical Stack
- **Framework**: Laravel 12 (PHP 8.2)
- **Authentication**: Laravel Sanctum
- **Database**: SQLite (Development) / MySQL (Production)
- **Email Configuration**: Mailtrap (configured in `.env`)

### Database Schema (Core Tables)

1. **`users`**
   - `id`, `nom`, `email`, `password`
   - `role`: enum (`super_admin`, `admin`, `urbaniste`, `citoyen`)
   - `statut`: enum (`pending`, `active`, `rejected`)
   - `company_name`, `city`

2. **`zones`**
   - `id`, `nom`, `ville`, `couleur`, `coordonnees_geojson`, `centre_lat`, `centre_lng`

3. **`remarques`**
   - `id`, `user_id`, `zone_id`, `categorie`, `statut` (`en_attente`, `validee`, `rejete`, `planifie`), `urgency`, `opinion`, `photo_path`, `latitude`, `longitude`

4. **`annotation_urbanistes`**
   - `id`, `zone_id`, `urbaniste_id`, `texte`

5. **`zone_ai_summaries`**
   - `id`, `zone_id`, `summary_text`, `generated_at`

### Test Credentials (from DatabaseSeeder)
| Role | Email | Password |
|---|---|---|
| super_admin | superadmin@urbanmap.ma | super123 |
| admin | admin@urbanmap.ma | admin123 |
| urbaniste | urbaniste@urbanmap.ma | urban123 |
| citoyen | citoyen@urbanmap.ma | citoyen123 |

---

## 👥 4. Access Control & User Roles

| Role | Permissions & Access |
| :--- | :--- |
| **Super Admin** | Full access. Validates accounts. |
| **Admin** | Dashboard stats, manages zones (no drawing), manages users, sends group emails via Mailtrap. |
| **Urbaniste** | Dashboard access, annotations, spatial analysis. |
| **Citoyen** | Public map access (`/map`), submits geo-located reports, downloads PDF receipts. |

---

## 📡 5. API Endpoints Map

**Public Routes**
- `POST /api/register`
- `POST /api/login` (Throttled 5/min)
- `GET /api/zones` (Public map rendering)

**Authenticated Routes (Requires Sanctum Token)**
- `POST /api/logout`, `GET /api/me`, `GET /api/user`
- `GET /api/remarques`, `POST /api/remarques`

**Admin / Super Admin Only**
- `POST /zones`, `PATCH /zones/{zone}`, `DELETE /zones/{zone}`
- `PATCH /remarques/{remarque}`
- `GET /dashboard/stats`
- `GET /users` (Fetch paginated users)
- `POST /users/send-group-email` (Send emails to users)

**Super Admin Only**
- `GET /users/pending`, `PATCH /users/{user}`

**Urbaniste / Admin**
- `GET`, `POST`, `PATCH`, `DELETE /api/annotations`
- `GET`, `POST /api/zones/{zone}/summary` (AI synthesis)

---

## 🛠️ 6. Environment & Setup Notes

- **Backend**: `composer install`, `php artisan migrate:fresh --seed` (creates the test accounts above), `php artisan storage:link`, `php artisan serve`. Expected to run on `http://localhost:8000`.
- **Frontend**: `npm install`, `npm run dev`. Expects backend at `http://localhost:8000` (via `VITE_API_BASE_URL`).

## 🤖 7. AI Context Summary
If you are an AI reading this:
- **STRICT CSS RULE**: Only use **inline CSS**. Do NOT use Tailwind classes in React components.
- Rely on the test accounts defined above.
- Remember `/map` is public.
- Make sure to use the provided services (`api.js`, `adminApi.js`) rather than rewriting axios calls.
- Admin Users Tab (`AdminUsersTab.jsx`) includes a group email feature backed by `UserController@sendGroupEmail`.
