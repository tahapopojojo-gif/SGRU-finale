# UrbanMap Backend (Laravel API)

Backend API pour le projet UrbanMap Maroc.

## Stack

- Laravel 12 + PHP 8.2
- Sanctum (auth API token)
- SQLite (par defaut) ou MySQL

## Setup rapide

1. Installer les dependances:
   - `composer install`
2. Copier la configuration:
   - `copy .env.example .env`
3. Generer la cle:
   - `php artisan key:generate`
4. Migrer + seeder:
   - `php artisan migrate --seed`
5. Lier le storage public (upload photos):
   - `php artisan storage:link`
6. Lancer le serveur:
   - `php artisan serve`

## Variables importantes

- `APP_URL=http://localhost`
- `FRONTEND_URL=http://localhost:5173`
- DB:
  - Soit SQLite: `DB_CONNECTION=sqlite`
  - Soit MySQL:
    - `DB_CONNECTION=mysql`
    - `DB_HOST=127.0.0.1`
    - `DB_PORT=3306`
    - `DB_DATABASE=urbanmap`
    - `DB_USERNAME=root`
    - `DB_PASSWORD=...`

## Compte seed par defaut

- Email: `superadmin@urbanmap.ma`
- Mot de passe: `super123`

## Endpoints principaux

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/users`
- `GET /api/users/pending`
- `PATCH /api/users/{user}`
- `GET /api/zones`
- `POST /api/zones`
- `DELETE /api/zones/{zone}`
- `GET /api/remarques`
- `POST /api/remarques`
- `PATCH /api/remarques/{remarque}`
- `GET /api/zones/{zone}/annotations`
- `GET /api/urbanistes/{urbaniste}/annotations`
- `POST /api/annotations`
- `PATCH /api/annotations/{annotation}`
- `DELETE /api/annotations/{annotation}`
- `GET /api/zones/{zone}/summary`
- `POST /api/zones/{zone}/summary`

## Verification rapide

- `php artisan route:list`
- `php artisan test`
