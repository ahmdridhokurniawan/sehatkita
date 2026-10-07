<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfilController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public endpoints (tidak butuh login/token)
|--------------------------------------------------------------------------
| Wajib diawali: register & login. Tanpa ini, FE tidak bisa masuk.
*/

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);


/*
|--------------------------------------------------------------------------
| Protected endpoints (wajib kirim token Sanctum)
|--------------------------------------------------------------------------
| Token didapat setelah login, dikirim di header:
|   Authorization: Bearer <token>
|
| Semua route di dalam group ini memakai middleware 'auth:sanctum',
| artinya: kalau tidak kirim token -> ditolak (401 Unauthorized).
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout',  [AuthController::class, 'logout']);

    // Onboarding: GET untuk lihat profil, PUT untuk isi/ubah profil
    Route::get('/profil',   [ProfilController::class, 'show']);
    Route::put('/profil',   [ProfilController::class, 'update']);
});
