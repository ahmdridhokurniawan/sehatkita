<?php

use App\Http\Controllers\AdminMasterController;
use App\Http\Controllers\AdminStatistikController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatatanKesehatanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DashboardWilayahController;
use App\Http\Controllers\FaskesController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PosbinduController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\RekamMedisController;
use App\Http\Controllers\RujukanController;
use App\Http\Controllers\TargetRefleksiController;
use App\Http\Controllers\WilayahController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // PUBLIC
    Route::post('/auth/register', [AuthController::class, 'register']);
    // rate‑limit login – 5 req / menit → 429
    Route::post('/auth/login', [AuthController::class, 'login'])
         ->middleware('throttle:5,1')
         ->name('login');

    Route::get('/wilayah', [WilayahController::class, 'index']);

    // PROTECTED (sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        // Auth
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/persetujuan', [AuthController::class, 'consent']);
        Route::delete('/persetujuan', [AuthController::class, 'revokeConsent']);

        // Profil
        Route::get('/profil', [ProfilController::class, 'show']);
        Route::put('/profil', [ProfilController::class, 'update']);

        // Faskes
        Route::get('/faskes', [FaskesController::class, 'index']);

        // Catatan kesehatan
        Route::get('/catatan-kesehatan', [CatatanKesehatanController::class, 'index']);
        Route::post('/catatan-kesehatan', [CatatanKesehatanController::class, 'store']);
        Route::get('/catatan-kesehatan/{catatan_kesehatan}', [CatatanKesehatanController::class, 'show']);
        Route::delete('/catatan-kesehatan/{catatan_kesehatan}', [CatatanKesehatanController::class, 'destroy']);

        // Insight & notifikasi
        Route::get('/insight', [InsightController::class, 'index']);
        Route::get('/notifications', [NotificationController::class, 'index']);

        // Rekam Medis
        Route::get('/rekam-medis', [RekamMedisController::class, 'index']);

        // Rujukan
        Route::post('/rujukan', [RujukanController::class, 'store']);
        Route::get('/rujukan', [RujukanController::class, 'index']);
        Route::patch('/rujukan/{id}/status', [RujukanController::class, 'updateStatus']);

        // Posbindu
        Route::get('/posbindu/sesi', [PosbinduController::class, 'indexSesi']);
        Route::post('/posbindu/sesi', [PosbinduController::class, 'storeSesi']);
        Route::get('/posbindu/sesi/{id}', [PosbinduController::class, 'showSesi']);
        Route::put('/posbindu/sesi/{id}', [PosbinduController::class, 'updateSesi']);
        Route::post('/posbindu/sesi/{id}/peserta', [PosbinduController::class, 'storePeserta']);
        Route::get('/posbindu/kunjungan', [PosbinduController::class, 'indexKunjungan']);

        // Program
        Route::get('/program', [ProgramController::class, 'index']);
        Route::post('/program', [ProgramController::class, 'store']);
        Route::post('/program/{id}/peserta', [ProgramController::class, 'ikut']);
        Route::patch('/program/{id}/peserta', [ProgramController::class, 'ubahStatusPeserta']);

        // Target & refleksi
        Route::put('/target', [TargetRefleksiController::class, 'simpanTarget']);
        Route::post('/refleksi', [TargetRefleksiController::class, 'simpanRefleksi']);

        // Dashboard & laporan
        Route::get('/dashboard/pribadi', [DashboardController::class, 'pribadi']);
        Route::get('/dashboard/kelurahan', [DashboardWilayahController::class, 'dashboardKelurahan']);
        Route::get('/laporan/pribadi', [DashboardWilayahController::class, 'laporanPribadi']);
        Route::get('/laporan/kelurahan', [DashboardWilayahController::class, 'laporanKelurahan']);

        // ADMIN MASTER
        Route::prefix('admin')->group(function () {
            Route::get('/statistik', [AdminStatistikController::class, 'index']);

            Route::get('/indikator', [AdminMasterController::class, 'indexIndikator']);
            Route::post('/indikator', [AdminMasterController::class, 'storeIndikator']);
            Route::put('/indikator/{id}', [AdminMasterController::class, 'updateIndikator']);
            Route::delete('/indikator/{id}', [AdminMasterController::class, 'destroyIndikator']);

            Route::get('/ambang-kategori', [AdminMasterController::class, 'indexAmbang']);
            Route::post('/ambang-kategori', [AdminMasterController::class, 'storeAmbang']);
            Route::put('/ambang-kategori/{id}', [AdminMasterController::class, 'updateAmbang']);
            Route::delete('/ambang-kategori/{id}', [AdminMasterController::class, 'destroyAmbang']);

            Route::get('/pengguna', [AdminMasterController::class, 'indexPengguna']);
            Route::post('/pengguna', [AdminMasterController::class, 'storePengguna']);
            Route::put('/pengguna/{id}', [AdminMasterController::class, 'updatePengguna']);
            Route::delete('/pengguna/{id}', [AdminMasterController::class, 'destroyPengguna']);

            Route::get('/faskes', [AdminMasterController::class, 'indexFaskes']);
            Route::post('/faskes', [AdminMasterController::class, 'storeFaskes']);
            Route::put('/faskes/{id}', [AdminMasterController::class, 'updateFaskes']);
            Route::delete('/faskes/{id}', [AdminMasterController::class, 'destroyFaskes']);

            Route::get('/log-audit', [AdminMasterController::class, 'indexLogAudit']);
        });
    });
});