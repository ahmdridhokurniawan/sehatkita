<?php

use App\Http\Controllers\AdminMasterController;
use App\Http\Controllers\AdminStatistikController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatatanKesehatanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DashboardWilayahController;
use App\Http\Controllers\FaskesController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\PeringkatController;
use App\Http\Controllers\PosbinduController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\RekamMedisController;
use App\Http\Controllers\RujukanController;
use App\Http\Controllers\TargetRefleksiController;
use App\Http\Controllers\WilayahController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // ===== 1. PUBLIK =====
    // /landing-page, /auth/password, /wilayah/{id} dihapus/disesuaikan kontrak
    // throttle: batasi percobaan supaya password tidak bisa ditebak otomatis.
    // 5 percobaan / menit per IP untuk login, 10 / menit untuk daftar.
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login');
    Route::get('/wilayah', [WilayahController::class, 'index']);

    // ===== 2. TERPROTEKSI (Bearer token) =====
    Route::middleware('auth:sanctum')->group(function () {

        // --- Auth & akun ---
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // --- Persetujuan ---
        Route::post('/persetujuan', [AuthController::class, 'consent']);
        Route::delete('/persetujuan', [AuthController::class, 'revokeConsent']);

        // --- Profil ---
        Route::get('/profil', [ProfilController::class, 'show']);
        Route::put('/profil', [ProfilController::class, 'update']);

        // --- Faskes ---
        Route::get('/faskes', [FaskesController::class, 'index']);

        // --- Catatan kesehatan ---
        Route::get('/catatan-kesehatan', [CatatanKesehatanController::class, 'index']);
        Route::post('/catatan-kesehatan', [CatatanKesehatanController::class, 'store']);
        Route::get('/catatan-kesehatan/{catatan_kesehatan}', [CatatanKesehatanController::class, 'show']);
        Route::delete('/catatan-kesehatan/{catatan_kesehatan}', [CatatanKesehatanController::class, 'destroy']);

        // --- Insight (§8.3) ---
        Route::get('/insight', [InsightController::class, 'index']);
        // Ambang kategori (read-only untuk semua user) — dipakai halaman Insight
        // untuk menjelaskan kapan aman / siaga / bahaya. Dirujuk §8.3.
        Route::get('/insight/ambang', [InsightController::class, 'ambang']);

        // --- Rekam Medis / Tren (§8.2) — path resmi tetap `/tren` (§20) ---
        Route::get('/tren', [RekamMedisController::class, 'index']);
        Route::get('/rekam-medis', [RekamMedisController::class, 'index']); // alias FE lama

        // --- Rujukan ---
        Route::post('/rujukan', [RujukanController::class, 'store']);
        Route::get('/rujukan', [RujukanController::class, 'index']);
        Route::patch('/rujukan/{id}/status', [RujukanController::class, 'updateStatus']);

        // --- Posbindu ---
        Route::get('/posbindu/sesi', [PosbinduController::class, 'indexSesi']);
        Route::post('/posbindu/sesi', [PosbinduController::class, 'storeSesi']);
        Route::get('/posbindu/sesi/{id}', [PosbinduController::class, 'showSesi']);
        Route::put('/posbindu/sesi/{id}', [PosbinduController::class, 'updateSesi']);
        Route::delete('/posbindu/sesi/{id}', [PosbinduController::class, 'destroySesi']);
        Route::post('/posbindu/sesi/{id}/peserta', [PosbinduController::class, 'storePeserta']);
        Route::get('/posbindu/kunjungan', [PosbinduController::class, 'indexKunjungan']);

        // --- Program ---
        Route::get('/program', [ProgramController::class, 'index']);
        Route::post('/program', [ProgramController::class, 'store']);
        Route::post('/program/{id}/peserta', [ProgramController::class, 'ikut']);
        Route::patch('/program/{id}/peserta', [ProgramController::class, 'ubahStatusPeserta']);
        Route::get('/peringkat', [PeringkatController::class, 'index']);

        // --- Target & Refleksi ---
        Route::get('/target', [TargetRefleksiController::class, 'target']);
        Route::put('/target', [TargetRefleksiController::class, 'simpanTarget']);
        Route::get('/refleksi', [TargetRefleksiController::class, 'refleksi']);
        Route::post('/refleksi', [TargetRefleksiController::class, 'simpanRefleksi']);

        // --- Dashboard & laporan ---
        Route::get('/dashboard/pribadi', [DashboardController::class, 'pribadi']);
        Route::get('/dashboard/kelurahan', [DashboardWilayahController::class, 'dashboardKelurahan']);
        Route::get('/laporan/pribadi', [DashboardWilayahController::class, 'laporanPribadi']);
        Route::get('/laporan/kelurahan', [DashboardWilayahController::class, 'laporanKelurahan']);

        // ===== 3. ADMIN MASTER =====
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

            // §15 — verifikasi log ber-flag
            Route::get('/catatan-kesehatan/perlu-verifikasi', [CatatanKesehatanController::class, 'perluVerifikasiList']);
            Route::patch('/catatan-kesehatan/{id}/verifikasi', [CatatanKesehatanController::class, 'verifikasi']);
        });
    });
});