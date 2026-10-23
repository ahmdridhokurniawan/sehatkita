<?php

namespace App\Http\Controllers;

use App\Models\Profil;
use App\Models\Refleksi;
use Illuminate\Http\Request;

/**
 * Modul Target & Refleksi - kontrak 13.
 *
 * 13.1 PUT  /target    -> simpan target pribadi (tersimpan di TABEL `profil`)
 * 13.2 POST /refleksi  -> tulis refleksi mingguan (tabel `refleksi`)
 */
class TargetRefleksiController extends Controller
{
    /**
     * PUT /target - kontrak 13.1
     *
     * 3 kolom target tidak punya tabel sendiri; semuanya ada di tabel `profil`
     * (bb_target_kg, target_aktivitas_per_minggu, target_air_ml).
     */
    public function simpanTarget(Request $request)
    {
        $user = $request->user();

        // Diakses cuma role `user` (kontrak 16).
        abort_unless($user->role === 'user', 403, 'Hanya user biasa yang memakai fitur target ini.');

        // Semua kolom nullable: PATCH-like, hanya yang dikirim yang berubah.
        $data = $request->validate([
            'bb_target_kg'               => 'nullable|numeric|min:1|max:300',
            'target_aktivitas_per_minggu' => 'nullable|integer|min:0|max:30',
            'target_air_ml'               => 'nullable|integer|min:0|max:10000',
        ], [
            'bb_target_kg.numeric' => 'Target berat badan harus berupa angka.',
            'target_air_ml.integer' => 'Target air harus berupa angka bulat.',
        ]);

        // Profil bisa belum ada (user baru daftar belum isi profil) -> buat dulu.
        $profil = Profil::firstOrCreate(['user_id' => $user->id]);

        // Hanya timpa kolom yang dikirim, kolom lain profil tetap utuh.
        foreach ($data as $kolom => $nilai) {
            $profil->{$kolom} = $nilai;
        }
        $profil->save();

        // Balikkan bentuk persis seperti kontrak 13.1.
        return response()->json([
            'success' => true,
            'message' => 'Target disimpan',
            'data'    => [
                'bb_target_kg'               => $profil->bb_target_kg === null ? null : (float) $profil->bb_target_kg,
                'target_aktivitas_per_minggu' => $profil->target_aktivitas_per_minggu,
                'target_air_ml'               => $profil->target_air_ml,
            ],
        ]);
    }

    /** POST /refleksi - kontrak 13.2 */
    public function simpanRefleksi(Request $request)
    {
        $user = $request->user();

        abort_unless($user->role === 'user', 403, 'Hanya user biasa yang memakai fitur refleksi ini.');

        $data = $request->validate([
            'minggu'  => ['required', 'string', 'max:10', 'regex:/^\d{4}-W\d{2}$/'],
            'catatan' => 'required|string|max:2000',
        ], [
            'minggu.regex' => 'Format minggu harus seperti 2026-W40 (tahun-W minggu).',
            'catatan.required' => 'Isi refleksi wajib diisi.',
        ]);

        // Tabel punya unique (user_id, minggu) -> satu orang satu refleksi per minggu.
        $sudahAda = Refleksi::where('user_id', $user->id)
            ->where('minggu', $data['minggu'])
            ->exists();

        if ($sudahAda) {
            return response()->json([
                'success' => false,
                'message' => 'Refleksi untuk minggu ini sudah pernah dibuat.',
            ], 409);
        }

        $refleksi = Refleksi::create([
            'user_id' => $user->id,
            'minggu'  => $data['minggu'],
            'catatan' => $data['catatan'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Refleksi tersimpan',
            'data'    => [
                'id'         => $refleksi->id,
                'minggu'     => $refleksi->minggu,
                'catatan'    => $refleksi->catatan,
                'created_at' => $refleksi->created_at->toIso8601String(),
            ],
        ], 201);
    }
}