<?php

use App\Http\Controllers\AdminStatistikController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatatanKesehatanController;
use App\Http\Controllers\FaskesController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\LandingPageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\WilayahController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RekamMedisController;
use App\Http\Controllers\RujukanController;
use App\Http\Controllers\PosbinduController; // 👈 Ditambahkan: Controller Posbindu baru
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (Versi 1)
|--------------------------------------------------------------------------
| Semua rute di bawah menggunakan awalan /api/v1 (didefinisikan di group prefix).
| Mengikuti kontrak API SehatKita.
*/

Route::prefix('v1')->group(function () {

    // =========================================================
    // 1. PUBLIK — Bebas diakses tanpa token / login
    // =========================================================
    
    // Kontrak §19: Data halaman utama / landing page (statistik, FAQ)
    Route::get('/landing-page', [LandingPageController::class, 'index']);

    // Kontrak §4.1 & §4.2: Registrasi akun baru & Login
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Kontrak §6.1: Daftar wilayah (kelurahan/kecamatan untuk pilihan register)
    Route::get('/wilayah', [WilayahController::class, 'index']);


    // =========================================================
    // 2. TERPROTEKSI — Wajib menyertakan header Authorization: Bearer TOKEN
    // =========================================================
    Route::middleware('auth:sanctum')->group(function () {

        // --- AUTHENTICATION & PENGGUNA (§4.3 & §4.4) ---
        Route::get('/auth/me', [AuthController::class, 'me']);           // Info user yang sedang login + usia
        Route::post('/auth/logout', [AuthController::class, 'logout']);    // Hapus token aktif
        Route::put('/auth/password', [AuthController::class, 'changePassword']); // Ganti password

        // --- PERSETUJUAN / CONSENT (§5.3 & §5.4) ---
        Route::post('/persetujuan', [AuthController::class, 'consent']);         // Berikan persetujuan rekam medis
        Route::delete('/persetujuan', [AuthController::class, 'revokeConsent']); // Tarik persetujuan

        // --- PROFIL PENGGUNA (§5.1 & §5.2) ---
        Route::get('/profil', [ProfilController::class, 'show']);   // Lihat profil milik sendiri
        Route::put('/profil', [ProfilController::class, 'update']); // Ubah profil milik sendiri

        // --- FASKES & RUMAH SAKIT (§6.2) ---
        Route::get('/faskes', [FaskesController::class, 'index']);  // Daftar fasilitas kesehatan

        // --- CATATAN KESEHATAN / REKAM MEDIS Mandiri (§7.2 - §7.5) ---
        // apiResource otomatis mendaftarkan 5 rute: index, store, show, update, destroy
        Route::apiResource('catatan-kesehatan', CatatanKesehatanController::class);

        // --- INSIGHT & ANALISIS KESEHATAN (§8.3) ---
        Route::get('/insight', [InsightController::class, 'index']);

        // --- NOTIFIKASI PENGGUNA (§27) ---
        Route::get('/notifications', [NotificationController::class, 'index']);

        // --- WILAYAH & STATISTIK ---
        Route::get('/wilayah/{id}', [WilayahController::class, 'show']); // Detail wilayah (butuh Gate)
        Route::get('/admin/statistik', [AdminStatistikController::class, 'index']); // Statistik super_admin

        // --- DASHBOARD & TREN ---
        Route::get('/dashboard/pribadi', [DashboardController::class, 'pribadi']); // Dashboard utama warga (§8.1)
        Route::get('/rekam-medis', [RekamMedisController::class, 'index']);        // Riwayat / series data (§8.2)
        Route::get('/tren', [RekamMedisController::class, 'index']);                // Alias untuk rekam-medis

        // --- MODUL RUJUKAN (§11) ---
        Route::post('/rujukan', [RujukanController::class, 'store']);                 // Buat rujukan baru
        Route::get('/rujukan', [RujukanController::class, 'index']);                 // Daftar rujukan
        Route::patch('/rujukan/{id}/status', [RujukanController::class, 'updateStatus']); // Ubah status rujukan

        // --- MODUL POSBINDU (§10) — DITAMBAHKAN BARU ---
        Route::get('/posbindu/sesi', [PosbinduController::class, 'indexSesi']);             // Daftar sesi posbindu
        Route::post('/posbindu/sesi', [PosbinduController::class, 'storeSesi']);           // Buat sesi posbindu baru (Kader/Admin)
        Route::get('/posbindu/sesi/{id}', [PosbinduController::class, 'showSesi']);        // Detail sesi & daftar peserta
        Route::post('/posbindu/sesi/{id}/peserta', [PosbinduController::class, 'storePeserta']); // Catat kehadiran & kesehatan peserta
        Route::get('/posbindu/kunjungan', [PosbinduController::class, 'indexKunjungan']);    // Riwayat kunjungan posbindu

    });
});