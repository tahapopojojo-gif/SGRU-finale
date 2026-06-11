@echo off
echo ========================================================
echo       LANCEMENT DE URBANMAP MAROC (DEMO PFE)
echo ========================================================
echo.
echo [1/3] Lancement du Serveur Backend Laravel (API)...
start "Laravel API" cmd /k "cd urbanmap-backend && php artisan serve"

echo [2/3] Lancement du Worker de File d'Attente (Emails)...
start "Laravel Queue Worker" cmd /k "cd urbanmap-backend && php artisan queue:work"

echo [3/3] Lancement de l'Application Frontend React (Vite)...
start "React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo Tout est pret ! Vos 3 terminaux s'executent en arriere-plan.
echo Bon courage pour votre soutenance !
echo ========================================================
pause