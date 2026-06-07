# UrbanMap Maroc - Comprehensive Project Architecture & State

This document serves as the absolute source of truth regarding the current technical state, architecture, database schemas, and implementations for both the **Frontend** and **Backend** of the **UrbanMap Maroc** project. It is specifically structured to provide full context to any AI agent or developer joining the project.

## 📋 1. Project Overview
**UrbanMap Maroc** is a spatial management and citizen participation platform dedicated to urban planning in Morocco (Marrakech, Casablanca, Rabat, etc.). It enables interaction between citizens, urban planners, and local authorities, leveraging Artificial Intelligence for opinion moderation, data analysis, and synthesis.

### 🚀 The Core Concept & Data Flow
The platform is built around a progressive data-enrichment flow designed to turn raw citizen feedback into structured urban planning data:

1. **Citizen (Reporting)**: Citizens drop a pin on the map to report issues. They provide a category, urgency, duration, and their own profile, along with optional photos.
2. **Admin (Clustering)**: Administrators view a **Heatmap** of all citizen pins. When they notice a hot cluster in a specific street or neighborhood, they draw a geometric polygon around it and name it, officially establishing an "Intervention Zone".
3. **Urban Planner (Analysis)**: Urbanistes (planners) only see data *inside* these officially drawn zones. This focuses their attention on verified clusters rather than random points. They analyze the specific citizen patterns within the zone to plan real interventions, draft budgets, and annotate solutions.

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
The frontend follows a modular, feature-based React structure:

```text
src/
├── assets/             # Static images and icons
├── components/         # Reusable UI elements
│   ├── admin/          # Admin-specific components (e.g., User Management)
│   ├── dashboard/      # Dashboard tabs for Admins & Urbanistes (Heatmap, Annotations)
│   ├── layout/         # Layout wrappers (Sidebar, Navbar, PageHeader)
│   └── ui/             # Core UI components (Buttons, Modals, Badges)
├── context/            # React Contexts (Auth, Toast, UrbanZone)
├── hooks/              # Custom React hooks (useToast, useResponsive)
├── pages/              # Main route views
│   ├── HomePage.jsx        # Landing page
│   ├── CitizenMapPage.jsx  # Citizen-facing reporting map
│   ├── MapPage.jsx         # Authenticated analysis map (used by Admins & Urbanistes)
│   ├── AdminDashboard.jsx  # Admin control center
│   ├── UrbanisteDashboard.jsx # Urban planner dashboard
│   ├── AccountPage.jsx     # User account management page
│   └── ...                 # Auth & utility pages
├── services/           # External API communication logic
│   ├── api.js, adminApi.js, urbanApi.js # Axios instances and endpoints
│   ├── aiService.js        # AI-driven summaries and sentiment analysis
│   └── pdfService.js       # Auto-generates PDF receipts
└── utils/              # Helper functions (GeoJSON, unwrapping)
```

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
| **Admin** | Dashboard stats, manages zones, manages users, sends group emails via Mailtrap. |
| **Urbaniste** | Dashboard access, annotations, spatial analysis. |
| **Citoyen** | Map access, submits geo-located reports, downloads PDF receipts. |

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
- Remember `/map` is gated behind authentication (`DynamicMapRoute`) and maps to `MapPage.jsx` for authenticated Admins and Urban Planners.
- `CitizenMapPage.jsx` is the dedicated page containing the new citizen submission workflow, including the 5-step form, Leaflet map configuration, and PDF generation.
- Make sure to use the provided services (`api.js`, `adminApi.js`) rather than rewriting axios calls.
- Admin Users Tab (`AdminUsersTab.jsx`) includes a group email feature backed by `UserController@sendGroupEmail`.

## 🎨 UI/UX Styling Overview

UrbanMap Maroc frontend styling follows a clean, accessible, mobile-first design. The visual language prioritizes readability, intuitive navigation, and a cohesive look across devices.

- Styling approach: Vanilla CSS with CSS variables for a consistent theme.
- Layout: responsive two-column layout (map panel + control panels) on larger screens; panels stack or slide in on smaller screens.
- Map visuals: Leaflet-based maps (via React-Leaflet). Zone colors reflect the stripe/`couleur` attribute; markers and clusters are designed for clear visibility.
- Typography: system UI fonts with balanced weights for headings and body text.
- Accessibility: good color contrast, keyboard focus states, and scalable UI elements.

Example CSS variables (add or adjust in your main stylesheet, e.g., frontend/src/styles.css):

```css
:root {
  --bg: #f7f9fc;
  --surface: #ffffff;
  --text: #1f2937;
  --muted: #6b7280;
  --accent: #1e88e5;
  --zone: #4c8bf5;
}
```

Usage notes:
- Apply the variables to cards, buttons, inputs, and map panels to ensure a unified theme.
- Ensure the Leaflet map container uses responsive height rules to adapt to different viewports.
- If you customize zone colors, consider maintaining visibility against the map background and across accessibility contrast guidelines.

This section complements existing architecture and feature explanations, helping developers and contributors understand the intended visual and interaction style.

---

## 🗺️ Final Citizen Map View

This section details the final appearance and features of the citizen-facing map interface (`CitizenMapPage.jsx`).

### Kept Features ✅

- **Zone polygons**: Clearly defined territorial boundaries.
- **Existing report pins**: Visual indicators for reported issues.
- **Plan/Satellite toggle**: Ability to switch between map views.
- **Bottom bar**: Contains navigation for 'EN DIRECT', 'SIGNALEMENTS', and 'ZONES'.
- **"Signaler un problème" button**: Prominent call-to-action for new reports.
- **Navbar with search bar**: For searching locations or zones.

### Removed Features ❌

- **Category legend panel**: No longer displayed to simplify the interface.
- **Zoom buttons**: Map interaction is now primarily via pinch-to-zoom and double-tap.

### AI Instructions for Map Behavior:

"Keep the Plan/Satellite layer toggle button and its functionality. Only remove the category legend panel and the zoom buttons. Keep everything else."