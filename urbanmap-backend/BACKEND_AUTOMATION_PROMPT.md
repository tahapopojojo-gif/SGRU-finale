Tu es un expert Laravel. Travaille uniquement dans le dossier `urbanmap-backend`.

Objectif:
- Finaliser totalement le backend UrbanMap et le rendre pret pour integration frontend React.

Contraintes:
- Ne pas toucher au frontend.
- Conserver une API REST sous prefixe `/api`.
- Utiliser Laravel Sanctum pour auth token.
- Utiliser Form Requests pour validation.
- Utiliser middleware role pour securite.
- Reutiliser les noms de champs metier en francais (`nom`, `statut`, `categorie`, etc.).

Taches obligatoires:
1) Verifier/ajuster le schema DB:
- users: nom, email, password, role, statut, company_name, city
- categories: nom, couleur, icone
- zones: nom, ville, couleur, coordonnees_geojson, centre_lat, centre_lng
- remarques: user_id, zone_id, categorie, statut, building_type, reasons(json), problems(json), urgency, profile, residence_duration, opinion, opinion_ai_validated, opinion_ai_summary, commentaire_admin, photo_path, latitude, longitude
- annotation_urbanistes: zone_id, urbaniste_id, texte
- zone_ai_summaries: zone_id, summary_text, generated_at

2) Verifier/ajuster les Modeles Eloquent:
- fillable, casts, relations.

3) Implementer/valider les routes API:
- Auth: register, login, logout, me
- Users (super_admin): list, pending, update
- Zones: list, create(admin), delete(admin)
- Remarques: list, create, update(admin)
- Annotations (urbaniste|admin): list by zone, list by urbaniste, create, update, delete
- AI summary (urbaniste|admin): show + generate/save

4) Implementer/valider middleware role:
- alias `role`
- usage `role:super_admin`, `role:admin`, `role:urbaniste,admin`

5) Validation:
- Requests dediees (RegisterRequest, LoginRequest, StoreRemarqueRequest, etc.)
- messages d'erreur coherents

6) Config backend:
- CORS pour frontend local (`FRONTEND_URL`)
- rate limiting sur login/register
- upload photo remarque sur disque public

7) Seed:
- creer super admin `superadmin@urbanmap.ma` / `super123`
- categories + zones de base

8) Verification finale:
- executer `php artisan migrate:fresh --seed`
- executer `php artisan route:list`
- executer `php artisan test`
- corriger toute erreur avant de terminer

Livrables attendus:
- Backend fonctionnel sans erreur.
- README mis a jour avec:
  - commandes setup
  - variables .env
  - compte seed
  - endpoints principaux
- Resume final des fichiers modifies et des commandes executees.
