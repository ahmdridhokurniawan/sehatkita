<?php

use App\Http\Controllers\AdminStatistikController;
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

    // Kontrak sec 19: Landing Page (Statistik & Info Umum)
    Route::get('/landing-page', [LandingPageController::class, 'index']);

    // Kontrak sec 1: Auth (Registrasi & Login)
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Kontrak sec 2: Master Data Wilayah (Hanya List Kelurahan)
    Route::get('/wilayah', [WilayahController::class, 'index']);


    // --- 2. TERPROTEKSI (Wajib Token / Sanctum) ---

    Route::middleware('auth:sanctum')->group(function () {

        // Kontrak sec 1: Profil & Logout
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/persetujuan/batal', [AuthController::class, 'revokeConsent']);

        // Ubah password sendiri (semua role)
        Route::put('/auth/password', [AuthController::class, 'changePassword']);

        // Kontrak sec 3: Manajemen Profil User
        Route::apiResource('profil', ProfilController::class)->only(['show', 'store', 'update']);

        // Kontrak sec 6: Catatan Kesehatan Mandiri
        Route::apiResource('catatan-kesehatan', CatatanKesehatanController::class);

        // Kontrak sec 8: Insight Kesehatan (Bab 23 filter level)
        Route::get('/insight', [InsightController::class, 'index']);

        // Kontrak sec 27: Notifikasi (Insight & Rujukan Baru)
        Route::get('/notifications', [NotificationController::class, 'index']);

        // Kontrak sec 2: Data Detail Wilayah (Dengan Gate Authorize)
        Route::get('/wilayah/{id}', [WilayahController::class, 'show']);

        // Statistik sistem (super_admin)
        Route::get('/admin/statistik', [AdminStatistikController::class, 'index']);

    });
});