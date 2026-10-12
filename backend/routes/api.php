<?php

// Controller untuk register, login, logout, persetujuan
use App\Http\Controllers\AuthController;

// Controller untuk lihat & isi profil (onboarding)
use App\Http\Controllers\ProfilController;

// **Tambahan**: controller catatan kesehatan
use App\Http\Controllers\CatatanKesehatanController;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Route PUBLIK - tidak butuh token
| Bisa diakses siapa saja (belum login)
|--------------------------------------------------------------------------
*/
// Daftar akun baru
Route::post('/register', [AuthController::class, 'register']);
// Login, dapat token Sanctum
Route::post('/login',    [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Route TERPROTEKSI - wajib kirim token
| Header: Authorization: Bearer ***
| Kalau tidak ada token -> 401 Unauthorized
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Hapus semua token (logout)
    Route::post('/logout', [AuthController::class, 'logout']);

    // Catat persetujuan kebijakan privasi (isi consent_at)
    Route::post('/persetujuan', [AuthController::class, 'consent']);

    // Cek "siapa saya" - kembalikan user + profil + wilayah
    Route::get('/me', function (Request $request) {
        // load() = ambil relasi sekalian biar tidak query lagi
        return response()->json([
            'success' => true,
            'data'    => $request->user()->load('profil', 'wilayah'),
        ]);
    });

    // Lihat profil sendiri (hasil null kalau belum onboarding)
    Route::get('/profil',  [ProfilController::class, 'show']);
    // Isi / ubah profil (dipakai halaman onboarding daffa)
    Route::put('/profil',  [ProfilController::class, 'update']);

    // -------------------------------------------------
    // **Endpoint catatan kesehatan (minggu 4)**
    // -------------------------------------------------
    Route::get('/catatan-kesehatan',  [CatatanKesehatanController::class, 'index']);
    Route::post('/catatan-kesehatan', [CatatanKesehatanController::class, 'store']);
});