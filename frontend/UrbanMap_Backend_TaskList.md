# UrbanMap Maroc — Backend Implementation Task List
> **Stack :** Laravel 11 · PHP 8.2+ · MySQL 8 · Laravel Sanctum  
> **Règle :** Chaque tâche est atomique, testable et indépendante.  
> **Convention :** PSR-12 · FormRequests · API Resources · Middlewares par rôle

---

## Phase 1 — Setup & Configuration

- [ ] **1.1** Créer le projet Laravel 11
  ```bash
  composer create-project laravel/laravel urbanmap-backend
  cd urbanmap-backend
  ```

- [ ] **1.2** Configurer le fichier `.env`
  ```env
  APP_NAME=UrbanMapMaroc
  APP_URL=http://localhost:8000
  FRONTEND_URL=http://localhost:5173

  DB_CONNECTION=mysql
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_DATABASE=urbanmap
  DB_USERNAME=root
  DB_PASSWORD=

  OPENAI_API_KEY=
  GROQ_API_KEY=
  ```

- [ ] **1.3** Installer et initialiser Laravel Sanctum
  ```bash
  composer require laravel/sanctum
  php artisan sanctum:install
  php artisan migrate
  ```

- [ ] **1.4** Configurer `config/cors.php` pour autoriser le frontend Vite
  - `allowed_origins` → `['http://localhost:5173']`
  - `supports_credentials` → `true`
  - `allowed_headers` → `['*']`
  - `allowed_methods` → `['*']`

- [ ] **1.5** Configurer le rate limiting dans `bootstrap/app.php`
  - Route `/api/login` → max 5 requêtes/minute par IP
  - Route `/api/register` → max 5 requêtes/minute par IP

- [ ] **1.6** Créer et enregistrer le middleware `CheckRole`
  - Fichier : `app/Http/Middleware/CheckRole.php`
  - Logique : vérifie `$request->user()->role` contre les rôles autorisés
  - Alias : `role` dans `bootstrap/app.php`

- [ ] **1.7** Créer et enregistrer le middleware `EnsureAccountIsActive`
  - Fichier : `app/Http/Middleware/EnsureAccountIsActive.php`
  - Logique : retourne `403` si `statut` est `pending` ou `rejected`
  - S'applique à toutes les routes `auth:sanctum` sauf `/api/user`

---

## Phase 2 — Modèles & Migrations

- [ ] **2.1** Migration de la table `users` — ajout des colonnes métier
  ```bash
  php artisan make:migration add_custom_fields_to_users_table --table=users
  ```
  Colonnes à ajouter :
  - `role` → `enum(['super_admin','admin','urbaniste','citoyen'])` default `citoyen`
  - `statut` → `enum(['pending','active','rejected'])` default `active`
  - `city` → `string`, nullable
  - `company_name` → `string`, nullable

- [ ] **2.2** Mettre à jour le modèle `User`
  - Ajouter `HasApiTokens` (Sanctum)
  - Déclarer `$fillable`, `$hidden`, `$casts`
  - Ajouter helper `hasRole(string|array $roles): bool`
  - Ajouter helper `isActive(): bool`

- [ ] **2.3** Créer la migration et le modèle `Zone`
  ```bash
  php artisan make:model Zone -m
  ```
  Colonnes :
  - `nom` → string
  - `ville` → string (index)
  - `couleur` → string (default `#3b82f6`)
  - `coordonnees` → json
  - `centre_lat` → decimal(10,7)
  - `centre_lng` → decimal(10,7)

- [ ] **2.4** Configurer le modèle `Zone`
  - `$fillable`, cast `coordonnees` → `array`
  - Relations : `hasMany(Remarque::class)`, `hasMany(AnnotationUrbaniste::class)`, `hasOne(ZoneAiSummary::class)`

- [ ] **2.5** Créer la migration et le modèle `Remarque`
  ```bash
  php artisan make:model Remarque -m
  ```
  Colonnes :
  - `user_id` → FK → `users`
  - `zone_id` → FK → `zones`
  - `categorie` → string
  - `statut` → `enum(['en_attente','validee','rejete','planifie','urgent'])` default `en_attente`
  - `urgency` → tinyInteger (1–5)
  - `profile` → string
  - `residence_duration` → string, nullable
  - `problems` → json, nullable
  - `opinion` → text
  - `opinion_ai_validated` → boolean, default `false`
  - `opinion_ai_summary` → text, nullable
  - `commentaire_admin` → text, nullable
  - `photo_path` → string, nullable
  - `latitude` → decimal(10,7)
  - `longitude` → decimal(10,7)

- [ ] **2.6** Configurer le modèle `Remarque`
  - `$fillable`, casts (`problems` → `array`, `opinion_ai_validated` → `boolean`)
  - Relations : `belongsTo(User::class)`, `belongsTo(Zone::class)`

- [ ] **2.7** Créer la migration et le modèle `AnnotationUrbaniste`
  ```bash
  php artisan make:model AnnotationUrbaniste -m
  ```
  Colonnes :
  - `zone_id` → FK → `zones`
  - `urbaniste_id` → FK → `users`
  - `texte` → text
  - Contrainte unique : `(zone_id, urbaniste_id)` — une annotation par zone par urbaniste

- [ ] **2.8** Créer la migration et le modèle `ZoneAiSummary`
  ```bash
  php artisan make:model ZoneAiSummary -m
  ```
  Colonnes :
  - `zone_id` → FK → `zones`, unique
  - `summary_text` → text
  - `generated_at` → timestamp

- [ ] **2.9** Créer les Seeders de base
  ```bash
  php artisan make:seeder SuperAdminSeeder
  php artisan make:seeder ZoneSeeder
  php artisan make:seeder RemarqueSeeder
  ```
  - `SuperAdminSeeder` : créer un compte `super_admin` par défaut
  - `ZoneSeeder` : 2–3 zones de test par ville (Marrakech, Casablanca)
  - `RemarqueSeeder` : 10 remarques de test avec statuts variés

- [ ] **2.10** Lancer les migrations et les seeders
  ```bash
  php artisan migrate:fresh --seed
  ```

---

## Phase 3 — FormRequests & API Resources

- [ ] **3.1** Créer les FormRequests d'authentification
  ```bash
  php artisan make:request Auth/RegisterRequest
  php artisan make:request Auth/LoginRequest
  ```
  - `RegisterRequest` : valide `nom`, `email`, `password`, `role`, `city`, `company_name`
  - `LoginRequest` : valide `email`, `password`

- [ ] **3.2** Créer les FormRequests pour les Zones
  ```bash
  php artisan make:request Zone/StoreZoneRequest
  php artisan make:request Zone/UpdateZoneRequest
  ```
  - Valider `nom`, `couleur`, `coordonnees` (array de paires lat/lng), `centre_lat`, `centre_lng`

- [ ] **3.3** Créer les FormRequests pour les Remarques
  ```bash
  php artisan make:request Remarque/StoreRemarqueRequest
  php artisan make:request Remarque/UpdateRemarqueStatusRequest
  ```
  - `StoreRemarqueRequest` : valider tous les champs métier + `photo` (image, max 5MB)
  - `UpdateRemarqueStatusRequest` : valider `statut`, `commentaire_admin`

- [ ] **3.4** Créer les FormRequests pour les Annotations
  ```bash
  php artisan make:request Annotation/StoreAnnotationRequest
  php artisan make:request Annotation/UpdateAnnotationRequest
  ```

- [ ] **3.5** Créer les API Resources
  ```bash
  php artisan make:resource UserResource
  php artisan make:resource ZoneResource
  php artisan make:resource ZoneCollection
  php artisan make:resource RemarqueResource
  php artisan make:resource RemarqueCollection
  php artisan make:resource AnnotationResource
  php artisan make:resource ZoneAiSummaryResource
  ```

---

## Phase 4 — Controllers & Routes API

- [ ] **4.1** Créer `AuthController`
  ```bash
  php artisan make:controller Api/AuthController
  ```
  Méthodes :
  - `register()` → créer l'utilisateur, retourner token si citoyen, message d'attente sinon
  - `login()` → valider credentials + statut `active`, retourner token Sanctum
  - `logout()` → révoquer le token courant
  - `me()` → retourner `UserResource` de l'utilisateur connecté

- [ ] **4.2** Créer `SuperAdminController`
  ```bash
  php artisan make:controller Api/SuperAdminController
  ```
  Méthodes :
  - `index()` → lister tous les utilisateurs (avec filtre `?statut=pending`)
  - `pending()` → lister uniquement les comptes en attente
  - `update()` → modifier `statut` et/ou `role` d'un utilisateur

- [ ] **4.3** Créer `ZoneController`
  ```bash
  php artisan make:controller Api/ZoneController --api
  ```
  Méthodes :
  - `index()` → zones filtrées par `$request->user()->city`
  - `store()` → créer une zone, injecter `ville` depuis `$user->city`
  - `update()` → modifier une zone (vérifier que la zone appartient à la ville de l'admin)
  - `destroy()` → supprimer (soft delete optionnel)

- [ ] **4.4** Créer `RemarqueController`
  ```bash
  php artisan make:controller Api/RemarqueController --api
  ```
  Méthodes :
  - `index()` → remarques filtrées par ville + query params (`zone_id`, `statut`, `categorie`)
  - `store()` → créer une remarque (citoyen), gérer upload photo via `Storage::disk('public')`
  - `update()` → modifier statut + commentaire (admin uniquement)

- [ ] **4.5** Créer `AnnotationController`
  ```bash
  php artisan make:controller Api/AnnotationController
  ```
  Méthodes :
  - `byZone()` → annotations d'une zone (filtrées par `urbaniste_id` connecté)
  - `store()` → créer ou mettre à jour (upsert sur `zone_id` + `urbaniste_id`)
  - `update()` → modifier le texte
  - `destroy()` → supprimer (vérifier ownership)

- [ ] **4.6** Définir toutes les routes dans `routes/api.php`

  ```php
  // Auth (public)
  POST   /api/register
  POST   /api/login

  // Auth (protégées)
  POST   /api/logout               [auth:sanctum]
  GET    /api/user                 [auth:sanctum]

  // Super Admin
  GET    /api/users                [auth:sanctum, role:super_admin]
  GET    /api/users/pending        [auth:sanctum, role:super_admin]
  PATCH  /api/users/{id}          [auth:sanctum, role:super_admin]

  // Zones
  GET    /api/zones                [auth:sanctum, active]
  POST   /api/zones                [auth:sanctum, role:admin]
  PATCH  /api/zones/{id}          [auth:sanctum, role:admin]
  DELETE /api/zones/{id}          [auth:sanctum, role:admin]

  // Remarques
  GET    /api/remarques            [auth:sanctum, active]
  POST   /api/remarques            [auth:sanctum, role:citoyen]
  PATCH  /api/remarques/{id}      [auth:sanctum, role:admin]

  // Annotations
  GET    /api/zones/{id}/annotations   [auth:sanctum, role:urbaniste|admin]
  POST   /api/annotations              [auth:sanctum, role:urbaniste]
  PATCH  /api/annotations/{id}        [auth:sanctum, role:urbaniste]
  DELETE /api/annotations/{id}        [auth:sanctum, role:urbaniste]
  ```

- [ ] **4.7** Tester toutes les routes avec Postman ou Insomnia
  - Vérifier les 401 (non authentifié)
  - Vérifier les 403 (mauvais rôle ou compte inactif)
  - Vérifier le filtrage par ville (un admin de Marrakech ne voit pas les zones de Casablanca)

---

## Phase 5 — Upload Photos & Stockage

- [ ] **5.1** Configurer `config/filesystems.php`
  - Disk `public` pour les photos de remarques
  - Lancer `php artisan storage:link`

- [ ] **5.2** Implémenter l'upload dans `RemarqueController::store()`
  - Valider `photo` → `image|mimes:jpeg,png,jpg,webp|max:5120`
  - Stocker avec `Storage::disk('public')->store('remarques', $file)`
  - Sauvegarder le chemin dans `photo_path`

- [ ] **5.3** Exposer l'URL publique via `RemarqueResource`
  - Ajouter `photo_url` → `Storage::url($this->photo_path)`

---

## Phase 6 — Intégration IA

- [ ] **6.1** Créer `AiController`
  ```bash
  php artisan make:controller Api/AiController
  ```

- [ ] **6.2** Créer `AiService` (`app/Services/AiService.php`)
  - Méthode `generateZoneSummary(Zone $zone): string`
    - Récupère les remarques validées de la zone
    - Construit le prompt avec les opinions
    - Appelle OpenAI/Groq via `Http::withToken()`
    - Retourne le résumé texte
  - Méthode `validateOpinion(string $opinion): array`
    - Vérifie la pertinence sémantique de l'opinion
    - Retourne `['valid' => bool, 'reason' => string]`

- [ ] **6.3** Définir les routes IA dans `routes/api.php`
  ```php
  GET  /api/zones/{id}/summary    [auth:sanctum, role:urbaniste|admin]
  POST /api/zones/{id}/summary    [auth:sanctum, role:urbaniste]
  POST /api/remarques/validate-opinion  [auth:sanctum, role:citoyen]
  ```

- [ ] **6.4** Implémenter la persistance du résumé dans `zone_ai_summaries`
  - Upsert sur `zone_id` à chaque génération

- [ ] **6.5** Ajouter la gestion d'erreur IA (timeout, quota dépassé → `503` avec message clair)

---

## Phase 7 — Tests & Validation Finale

- [ ] **7.1** Écrire les tests Feature pour l'authentification
  ```bash
  php artisan make:test Auth/RegisterTest
  php artisan make:test Auth/LoginTest
  ```

- [ ] **7.2** Écrire les tests Feature pour les Zones
  - Test : admin voit seulement les zones de sa ville
  - Test : admin ne peut pas modifier une zone d'une autre ville

- [ ] **7.3** Écrire les tests Feature pour les Remarques
  - Test : citoyen peut créer une remarque
  - Test : citoyen ne peut pas accéder au dashboard admin

- [ ] **7.4** Écrire les tests Feature pour les Annotations
  - Test : urbaniste ne voit que ses propres annotations
  - Test : upsert fonctionne correctement

- [ ] **7.5** Lancer la suite de tests complète
  ```bash
  php artisan test --coverage
  ```

---

## Phase 8 — Migration Frontend (Connexion React ↔ Laravel)

- [ ] **8.1** Configurer `axios` dans le frontend (`src/services/axiosInstance.js`)
  - `baseURL` → `http://localhost:8000/api`
  - Intercepteur : injecter `Authorization: Bearer {token}` depuis le contexte
  - Intercepteur réponse : gérer `401` (logout automatique)

- [ ] **8.2** Remplacer `src/services/api.js` (auth mock)
  - `login()` → `POST /api/login`
  - `register()` → `POST /api/register`
  - `getUser()` → `GET /api/user`
  - `logout()` → `POST /api/logout`

- [ ] **8.3** Remplacer `src/services/adminApi.js` (zones + remarques admin)
  - `getZones()` → `GET /api/zones`
  - `createZone()` → `POST /api/zones`
  - `updateZone()` → `PATCH /api/zones/{id}`
  - `deleteZone()` → `DELETE /api/zones/{id}`
  - `getRemarks()` → `GET /api/remarques`
  - `updateRemarkStatus()` → `PATCH /api/remarques/{id}`

- [ ] **8.4** Remplacer `src/services/urbanApi.js` (urbaniste)
  - `getZonesWithStats()` → `GET /api/zones`
  - `getValidatedRemarks()` → `GET /api/remarques?statut=validee`
  - `getAnnotations(zoneId)` → `GET /api/zones/{id}/annotations`
  - `saveAnnotation()` → `POST /api/annotations`
  - `getZoneAiSummary()` → `GET /api/zones/{id}/summary`

- [ ] **8.5** Remplacer les appels `localStorage` dans `AuthContext.jsx`
  - Stocker uniquement le token dans `localStorage`
  - Récupérer `user` depuis `GET /api/user` au chargement de l'app

- [ ] **8.6** Test d'intégration End-to-End
  - Flux complet : inscription → validation super_admin → login → dépôt remarque → modération admin → visualisation urbaniste → génération PDF

---

## Récapitulatif des Phases

| Phase | Contenu | Priorité |
|-------|---------|----------|
| 1 | Setup & Configuration | 🔴 Critique |
| 2 | Modèles & Migrations | 🔴 Critique |
| 3 | FormRequests & Resources | 🟠 Haute |
| 4 | Controllers & Routes | 🔴 Critique |
| 5 | Upload Photos | 🟠 Haute |
| 6 | Intégration IA | 🟡 Moyenne |
| 7 | Tests | 🟠 Haute |
| 8 | Migration Frontend | 🔴 Critique |

---

> **Convention de réponse :** Une fois ce plan validé, chaque tâche sera traitée individuellement avec :
> - Les commandes artisan exactes
> - Le code complet du fichier concerné
> - Les instructions de test associées
