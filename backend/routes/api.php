<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatatanKesehatanController;
use App\Http\Controllers\FaskesController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\WilayahController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — kontrak v1.1 BEKU
| Semua endpoint: /api/v1/...
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ─────────────────────────────────────────────
    // PUBLIK (tanpa token)
    // ─────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']); // §4.1
        Route::post('/login',    [AuthController::class, 'login']);    // §4.2
    });

    // Master wilayah untuk dropdown form register (§6.1)
    Route::get('/wilayah', [WilayahController::class, 'index']);

    // ─────────────────────────────────────────────
    // TERPROTEKSI (wajib Bearer [REDACTED]
    // ─────────────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Modul Auth (§4.3, §4.4) & Persetujuan (§5.3, §5.4)
        Route::prefix('auth')->group(function () {
            Route::post('/logout',        [AuthController::class, 'logout']);
            Route::get('/me',             [AuthController::class, 'me']);
            Route::post('/persetujuan',   [AuthController::class, 'consent']);
            Route::delete('/persetujuan', [AuthController::class, 'revokeConsent']);
        });

        // Modul Profil (§5.1, §5.2)
        Route::get('/profil', [ProfilController::class, 'show']);
        Route::put('/profil', [ProfilController::class, 'update']);

        // Master faskes (§6.2)
        Route::get('/faskes', [FaskesController::class, 'index']);

        // Catatan kesehatan (§7.2 – §7.5)
        Route::get('/catatan-kesehatan',         [CatatanKesehatanController::class, 'index']);
        Route::post('/catatan-kesehatan',        [CatatanKesehatanController::class, 'store']);
        Route::get('/catatan-kesehatan/{id}',    [CatatanKesehatanController::class, 'show']);
        Route::delete('/catatan-kesehatan/{id}', [CatatanKesehatanController::class, 'destroy']);

        // Insight (§8.3)
        Route::get('/insight', [InsightController::class, 'index']);
    });
});