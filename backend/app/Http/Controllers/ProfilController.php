<?php

// Namespace wajib, supaya Laravel tahu ini controller
namespace App\Http\Controllers;

// Untuk baca user login ($request->user()) dan input JSON
use Illuminate\Http\Request;
// Untuk validasi jenis_kelamin hanya boleh L atau P
use Illuminate\Validation\Rule;

class ProfilController extends Controller
{
    // GET /api/profil : lihat profil milik sendiri
    public function show(Request $request)
    {
        // Ambil profil lewat relasi hasOne di model Pengguna
        // Hasilnya bisa isi profil, bisa null kalau belum onboarding
        $profil = $request->user()->profil;

        // Balas sesuai kontrak {success, message, data}
        // Data diubah jadi array supaya bisa ditambah field usia (kontrak §5.1)
        $data = $profil ? $profil->toArray() : null;

        // Hitung usia (selisih tahun) dari tgl_lahir — kontrak §5.1 minta field "usia"
        if ($profil && $profil->tgl_lahir) {
            $data['usia'] = (int) $profil->tgl_lahir->diffInYears(now());
        }

        return response()->json([
            'success' => true,
            'message' => $profil ? 'Profil ditemukan' : 'Profil belum diisi',
            'data'    => $data,
        ]);
    }

    // PUT /api/profil : isi / ubah profil (dipakai halaman onboarding)
    public function update(Request $request)
    {
        // Cek input dulu, kalau gagal otomatis balas 422
        $validated = $request->validate([
            'tgl_lahir'                   => 'required|date',
            'jenis_kelamin'               => ['required', Rule::in(['L', 'P'])],
            'tinggi_cm'                   => 'required|integer|min:50|max:250',
            'tingkat_aktivitas'           => 'required|string|max:50',
            'merokok'                     => 'required|boolean',
            'riwayat_keluarga' => 'nullable|array',
            'bb_target_kg' => 'nullable|numeric|min:30|max:200',
            'target_aktivitas_per_minggu' => 'nullable|integer|min:0',
            'target_air_ml' => 'nullable|integer|min:0',
        ]);

        // Cari profil berdasar user_id
        // Kalau ada -> update, kalau belum ada -> insert baru
        $profil = $request->user()->profil()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated
        );

        return response()->json([
            'success' => true,
            'message' => 'Profil tersimpan',
            'data'    => $profil,
        ]);
    }
}