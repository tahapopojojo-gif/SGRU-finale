<?php

use App\Http\Controllers\Api\AnnotationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\RemarqueController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ZoneController;
use App\Http\Controllers\Api\ZoneSummaryController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::get('/zones', [ZoneController::class, 'index']);
Route::get('/remarques', [RemarqueController::class, 'index']); // Public — citizens see community pins without login

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::get('/my-remarks', [RemarqueController::class, 'myRemarks']);

    Route::post('/remarques', [RemarqueController::class, 'store']);


    Route::middleware('role:admin,super_admin')->group(function (): void {
        Route::post('/zones', [ZoneController::class, 'store']);
        Route::patch('/zones/{zone}', [ZoneController::class, 'update']);
        Route::delete('/zones/{zone}', [ZoneController::class, 'destroy']);
        Route::patch('/remarques/{remarque}', [RemarqueController::class, 'update']);
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    });

    Route::middleware('role:admin,super_admin')->group(function (): void {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users/send-group-email', [UserController::class, 'sendGroupEmail']);
    });

    Route::middleware('role:super_admin')->group(function (): void {
        Route::get('/users/pending', [UserController::class, 'pending']);
        Route::patch('/users/{user}', [UserController::class, 'update']);
    });

    Route::middleware('role:urbaniste,admin')->group(function (): void {
        Route::get('/zones/{zone}/annotations', [AnnotationController::class, 'byZone']);
        Route::get('/urbanistes/{urbaniste}/annotations', [AnnotationController::class, 'byUrbaniste']);
        Route::post('/annotations', [AnnotationController::class, 'store']);
        Route::patch('/annotations/{annotation}', [AnnotationController::class, 'update']);
        Route::delete('/annotations/{annotation}', [AnnotationController::class, 'destroy']);

        Route::get('/zones/{zone}/summary', [ZoneSummaryController::class, 'show']);
        Route::post('/zones/{zone}/summary', [ZoneSummaryController::class, 'generate']);
    });
});
