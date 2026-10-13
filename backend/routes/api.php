<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatatanKesehatanController;
use App\Http\Controllers\FaskesController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\WilayahController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

#Route PUBLIK - tidak butuh token
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Master wilayah publik (dipakai dropdown form register, kontrak §6.1)
Route::get('/wilayah',   [WilayahController::class, 'index']);

//  Route TERPROTEKSI - wajib kirim token (Bearer)
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout',      [AuthController::class, 'logout']);
    Route::post('/persetujuan', [AuthController::class, 'consent']);

    Route::get('/me', function (Request $request) {
        return response()->json([
            'success' => true,
            'data'    => $request->user()->load('profil', 'wilayah'),
        ]);
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