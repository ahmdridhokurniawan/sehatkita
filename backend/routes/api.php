<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatatanKesehatanController;
use App\Http\Controllers\LandingPageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\WilayahController;
use App\Http\Controllers\InsightController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - SehatKita v1.2
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // --- 1. PUBLIK (Tanpa Login) ---

    // Kontrak §19: Landing Page (Statistik & Info Umum)
    Route::get('/landing-page', [LandingPageController::class, 'index']);

    // Kontrak §1: Auth (Registrasi & Login)
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Kontrak §2: Master Data Wilayah (Hanya List Kelurahan)
    Route::get('/wilayah', [WilayahController::class, 'index']);


    // --- 2. TERPROTEKSI (Wajib Token / Sanctum) ---

    Route::middleware('auth:sanctum')->group(function () {

        // Kontrak §1: Profile & Logout
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/persetujuan/batal', [AuthController::class, 'revokeConsent']);

        // Kontrak §3: Manajemen Profil User
        Route::apiResource('profil', ProfilController::class)->only(['show', 'store', 'update']);

        // Kontrak §6: Catatan Kesehatan Mandiri
        Route::apiResource('catatan-kesehatan', CatatanKesehatanController::class);

        // Kontrak §8: Insight Kesehatan (Bab 23 filter level)
        Route::get('/insight', [InsightController::class, 'index']);

        // Kontrak §27: Notifikasi (Insight & Rujukan Baru)
        Route::get('/notifications', [NotificationController::class, 'index']);

        // Kontrak §2: Data Detail Wilayah (Dengan Gate Authorize)
        Route::get('/wilayah/{id}', [WilayahController::class, 'show']);

    });
});