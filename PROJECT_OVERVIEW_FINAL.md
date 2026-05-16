# 🇲🇦 UrbanMap Maroc - Project Overview

This document provides a comprehensive overview of the current state of the UrbanMap Maroc project, including architecture, technical stack, database schema, and core features.

---

## 📋 Project Description
**UrbanMap Maroc** is an advanced spatial management and citizen participation platform dedicated to urban planning. It facilitates interaction between citizens, urban planners, and local authorities to improve city planning in Morocco (Marrakech, Casablanca, Rabat, etc.), leveraging Artificial Intelligence for data analysis and moderation.

---

## 🏗️ Technical Architecture

### 💻 Frontend (Client Side)
- **Framework**: React 18 with Vite.js
- **Styling**: Vanilla CSS (Mobile-first responsive design)
- **Mapping**: Leaflet.js & React-Leaflet
- **Data Visualization**: Recharts (Dynamic charts and KPIs)
- **Document Generation**: jsPDF & jsPDF-AutoTable (Professional PDF reports)
- **State Management**: React Context API (`UrbanZoneContext`)
- **AI Integration**: Anthropic Claude API (integrated via backend or direct proxy)

### ⚙️ Backend (Server Side)
- **Framework**: Laravel 12 (PHP 8.2)
- **Authentication**: Laravel Sanctum (Token-based)
- **Database**: MySQL (Production) / SQLite (Development)
- **File Storage**: Laravel Storage (for citizen photo uploads)
- **API Architecture**: RESTful API providing JSON responses

---

## 🗄️ Database Schema (Table Structures)

### 1. `users`
Stores all account information and roles.
- `id`: Primary Key
- `nom`: Full name
- `email`: Unique email
- `password`: Hashed password
- `role`: enum ('super_admin', 'admin', 'urbaniste', 'citoyen')
- `statut`: enum ('pending', 'active', 'rejected')
- `company_name`: For urbanists/professionals
- `city`: Assigned city for admins/urbanists

### 2. `zones`
Official urban zones defined by administrators.
- `id`: Primary Key
- `nom`: Name of the zone (e.g., "Gueliz")
- `ville`: City name
- `couleur`: Hex color for map rendering
- `coordonnees_geojson`: JSON polygon data for Leaflet
- `centre_lat`, `centre_lng`: Center coordinates for map centering

### 3. `remarques` (Reports/Opinions)
Citizen submissions within specific zones.
- `id`: Primary Key
- `user_id`: Foreign Key (ref `users`)
- `zone_id`: Foreign Key (ref `zones`)
- `categorie`: Category (e.g., "Infrastructure", "Environment")
- `statut`: enum ('en_attente', 'validee', 'rejete', 'planifie')
- `urgency`: 1-5 scale
- `opinion`: Textual content
- `opinion_ai_validated`: Boolean (filtered by AI)
- `opinion_ai_summary`: AI-generated snippet
- `latitude`, `longitude`: Exact location
- `photo_path`: Path to uploaded image

### 4. `annotation_urbanistes`
Private professional notes for urban planners.
- `id`: Primary Key
- `zone_id`: Foreign Key (ref `zones`)
- `urbaniste_id`: Foreign Key (ref `users`)
- `texte`: Private note content

### 5. `zone_ai_summaries`
Global AI analysis of all opinions within a zone.
- `id`: Primary Key
- `zone_id`: Foreign Key (ref `zones`)
- `summary_text`: The consolidated AI analysis
- `generated_at`: Timestamp

---

## 👥 User Roles & Features

| Role | Key Capabilities |
| :--- | :--- |
| **Super Admin** | User management, account validation (Pending -> Active), system audits. |
| **Admin** | Territorry management, drawing zones on map, global moderation of reports. |
| **Urbaniste** | Spatial analysis (Heatmaps), AI opinion synthesis, private annotations, PDF report generation. |
| **Citoyen** | Geo-located reporting (5-step form), submission of opinions, tracking status. |

---

## 🚀 Current Implementation Status

### ✅ Completed
- Full responsive UI for all dashboards.
- Laravel backend API with secure authentication.
- Leaflet map integration with zone drawing and report clustering.
- AI Pipeline for report moderation and zone-wide synthesis.
- Professional PDF export module.

### 🛠️ In Progress / Next Steps
- Real-time notifications (Websockets) for status updates.
- 3D Map visualization (Cesium.js).
- Mobile App version (React Native).

---

## 📡 API Endpoints Summary

- `POST /api/login` | `POST /api/register`
- `GET /api/zones` - Fetch all urban zones
- `GET /api/remarques` - Fetch citizen reports (filtered by zone/city)
- `POST /api/remarques` - Submit a new report
- `POST /api/annotations` - Create urbanist private note
- `POST /api/zones/{zone}/summary` - Trigger AI analysis for a zone
