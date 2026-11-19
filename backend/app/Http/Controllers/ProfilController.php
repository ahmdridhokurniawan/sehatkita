<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Models\Profil;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Mengurus tampilan dan pembaruan data diri serta riwayat kesehatan keluarga warga.
class ProfilController extends Controller
{
    public const ENUM_RIWAYAT = [
        'hipertensi', 'diabetes', 'jantung', 'stroke',
        'kolesterol', 'asma', 'kanker', 'ginjal', 'tidak_ada',
    ];

    public function show(Request $request)
    {
        $pemanggil = $request->user();
        $user = $pemanggil;

        if ($request->filled('user_id')) {
            $user = Pengguna::find((int) $request->query('user_id'));

            if (! $user || ! $this->bolehBaca($pemanggil, $user)) {
                return $this->tidakDitemukan();
            }

            if ($pemanggil->role === 'super_admin' && $pemanggil->id !== $user->id) {
                $this->catatAudit($pemanggil, 'baca_data_individu', Profil::class, $user->id);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $this->bentuk($user),
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Hanya user biasa yang dapat memperbarui profil kesehatannya.');

        if ($user->consent_at === null) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => ['consent' => ['Persetujuan data belum diberikan.']],
            ], 422);
        }

        $validated = $request->validate([
            'tgl_lahir' => 'required|date|before:today',
            'jenis_kelamin' => ['required', Rule::in(['L', 'P'])],
            'tinggi_cm' => 'required|numeric|min:120|max:220',
            'tingkat_aktivitas' => ['required', Rule::in(['ringan', 'sedang', 'berat'])],
            'merokok' => 'required|boolean',
            'riwayat_keluarga' => 'required|array|min:1',
            'riwayat_keluarga.*' => [Rule::in(self::ENUM_RIWAYAT)],
            'tampil_di_peringkat' => 'sometimes|boolean',
            'bb_target_kg' => 'nullable|numeric|min:30|max:200',
            'target_aktivitas_per_minggu' => 'nullable|integer|min:0',
            'target_air_ml' => 'nullable|integer|min:0',
        ]);

        $riwayat = array_values(array_unique($validated['riwayat_keluarga']));
        if (in_array('tidak_ada', $riwayat, true) && count($riwayat) > 1) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => ['riwayat_keluarga' => ['Pilih "tidak_ada" saja bila tidak ada riwayat.']],
            ], 422);
        }

        $validated['riwayat_keluarga'] = $riwayat;
        if ($request->has('tampil_di_peringkat')) {
            $validated['tampil_di_peringkat'] = $request->boolean('tampil_di_peringkat');
        }

        $lama = $user->profil;
        if (! empty($validated['bb_target_kg']) && empty($lama?->bb_awal_kg)) {
            $validated['bb_awal_kg'] = CatatanKesehatan::beratTerakhir($user->id);
        }

        $user->profil()->updateOrCreate(['user_id' => $user->id], $validated);

        return response()->json([
            'success' => true,
            'message' => 'Profil tersimpan',
            'data' => $this->bentuk($user->fresh()),
        ]);
    }

    private function bentuk(Pengguna $user): array
    {
        $p = $user->profil;
        $riwayat = $p?->riwayat_keluarga;

        return [
            'user_id' => $user->id,
            'tgl_lahir' => $p?->tgl_lahir?->toDateString(),
            'usia' => $p?->tgl_lahir ? (int) $p->tgl_lahir->diffInYears(now()) : null,
            'jenis_kelamin' => $p?->jenis_kelamin,
            'tinggi_cm' => $p?->tinggi_cm !== null ? (float) $p->tinggi_cm : null,
            'tingkat_aktivitas' => $p?->tingkat_aktivitas,
            'merokok' => $p?->merokok,
            'riwayat_keluarga' => is_array($riwayat) ? array_values($riwayat) : [],
            'tampil_di_peringkat' => (bool) ($p?->tampil_di_peringkat ?? false),
            'profil_lengkap' => $this->lengkap($p),
            'updated_at' => $p?->updated_at?->toIso8601String(),
        ];
    }

    private function lengkap(?Profil $p): bool
    {
        return $p !== null
            && $p->tgl_lahir !== null
            && $p->jenis_kelamin !== null
            && $p->tinggi_cm !== null
            && $p->tingkat_aktivitas !== null
            && $p->merokok !== null;
    }

    private function bolehBaca(Pengguna $pemanggil, Pengguna $target): bool
    {
        if ($pemanggil->id === $target->id) {
            return true;
        }

        return match ($pemanggil->role) {
            'super_admin' => true,
            'kader' => $this->dalamBinaan($pemanggil, $target),
            default => false,
        };
    }

    private function tidakDitemukan()
    {
        return $this->responTidakDitemukan();
    }
}
