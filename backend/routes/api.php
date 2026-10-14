<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatatanKesehatanController;
use App\Http\Controllers\FaskesController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\WilayahController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Semua endpoint pakai prefix /api/v1 (kontrak Base URL .../api/v1)
Route::prefix('v1')->group(function () {
    // Publik (tanpa token) — hanya register & login (kontrak §4.1, §4.2)
        Route::prefix('auth')->group(function () {
            Route::post('/register', [AuthController::class, 'register']);
            Route::post('/login',    [AuthController::class, 'login']);
        });

    // Master wilayah publik (dipakai dropdown form register, kontrak §6.1)
    Route::get('/wilayah', [WilayahController::class, 'index']);

    // Route TERPROTEKSI - wajib token di bawah /api/v1/auth & lainnya
    Route::middleware('auth:sanctum')->group(function () {
        Route::prefix('auth')->group(function () {
            Route::post('/logout',        [AuthController::class, 'logout']);      // §4.3
            Route::get('/me',             [AuthController::class, 'me']);          // §4.4
            Route::post('/persetujuan',   [AuthController::class, 'consent']);     // §5.3
            Route::delete('/persetujuan', [AuthController::class, 'revokeConsent']); // §5.4
        });

    });

    // Profil & onboarding
    Route::get('/profil', [ProfilController::class, 'show']);
    Route::put('/profil', [ProfilController::class, 'update']);

    // Master faskes (kontrak §6.2)
    Route::get('/faskes', [FaskesController::class, 'index']);

    // Catatan kesehatan (kontrak §7)
    Route::get('/catatan-kesehatan',       [CatatanKesehatanController::class, 'index']);
    Route::post('/catatan-kesehatan',      [CatatanKesehatanController::class, 'store']);
    Route::get('/catatan-kesehatan/{id}',  [CatatanKesehatanController::class, 'show']);
    Route::delete('/catatan-kesehatan/{id}', [CatatanKesehatanController::class, 'destroy']);

    // Insight (kontrak §8.3)
    Route::get('/insight', [InsightController::class, 'index']);
});