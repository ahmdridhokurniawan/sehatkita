<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfilController extends Controller
{
    public function show(Request $request)
    {
        $profil = $request->user()->profil;

        return response()->json([
            'success' => true,
            'message' => $profil ? 'Profil ditemukan' : 'Profil belum diisi',
            'data'    => $profil,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'tgl_lahir'                   => 'required|date',
            'jenis_kelamin'               => ['required', Rule::in(['L', 'P'])],
            'tinggi_cm'                   => 'required|integer|min:100|max:250',
            'tingkat_aktivitas'           => 'required|string|max:50',
            'merokok'                     => 'required|boolean',
            'riwayat_keluarga'            => 'nullable|string|max:255',
            'bb_target_kg'                => 'required|numeric|min:30|max:200',
            'target_aktivitas_per_minggu' => 'required|integer|min:0',
            'target_air_ml'               => 'required|integer|min:0',
        ]);

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
