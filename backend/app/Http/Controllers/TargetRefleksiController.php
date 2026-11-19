<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Profil;
use App\Models\Refleksi;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

// Mengurus target harian sederhana dan catatan refleksi kebiasaan sehat warga.
class TargetRefleksiController extends Controller
{
    public function target(Request $request)
    {
        $profil = $this->profilUser($request);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $this->bentukTarget($profil),
        ]);
    }

    public function simpanTarget(Request $request)
    {
        $this->wajibPeran($request->user(), ['user'], 'Hanya user biasa yang memakai fitur target ini.');

        $data = $request->validate([
            'bb_target_kg' => 'nullable|numeric|min:1|max:300',
            'target_aktivitas_per_minggu' => 'nullable|integer|min:0|max:30',
            'target_air_ml' => 'nullable|integer|min:0|max:10000',
        ], [
            'bb_target_kg.numeric' => 'Target berat badan harus berupa angka.',
            'target_air_ml.integer' => 'Target air harus berupa angka bulat.',
        ]);

        $profil = Profil::firstOrCreate(['user_id' => $request->user()->id]);

        if (array_key_exists('bb_target_kg', $data)
            && $data['bb_target_kg'] !== null
            && $profil->bb_awal_kg === null) {
            $profil->bb_awal_kg = CatatanKesehatan::beratTerakhir($request->user()->id);
        }

        foreach ($data as $kolom => $nilai) {
            $profil->{$kolom} = $nilai;
        }
        $profil->save();

        return response()->json([
            'success' => true,
            'message' => 'Target disimpan',
            'data' => $this->bentukTarget($profil->fresh()),
        ]);
    }

    public function simpanRefleksi(Request $request)
    {
        $this->wajibPeran($request->user(), ['user'], 'Hanya user biasa yang memakai fitur refleksi ini.');

        $data = $request->validate([
            'minggu' => ['required', 'string', 'max:10', 'regex:/^\d{4}-W\d{2}$/'],
            'catatan' => 'required|string|max:2000',
        ], [
            'minggu.regex' => 'Format minggu harus seperti 2026-W40 (tahun-W minggu).',
            'catatan.required' => 'Isi refleksi wajib diisi.',
        ]);

        $sudahAda = Refleksi::where('user_id', $request->user()->id)
            ->where('minggu', $data['minggu'])
            ->exists();

        if ($sudahAda) {
            throw ValidationException::withMessages([
                'minggu' => ['Refleksi untuk minggu ini sudah pernah dibuat.'],
            ]);
        }

        $refleksi = Refleksi::create([
            'user_id' => $request->user()->id,
            'minggu' => $data['minggu'],
            'catatan' => $data['catatan'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Refleksi tersimpan',
            'data' => $this->bentukRefleksi($refleksi),
        ], 201);
    }

    public function refleksi(Request $request)
    {
        $this->wajibPeran($request->user(), ['user'], 'Hanya user biasa yang memakai fitur refleksi ini.');

        $list = Refleksi::where('user_id', $request->user()->id)
            ->orderByDesc('minggu')
            ->orderByDesc('id')
            ->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => collect($list->items())->map(fn ($r) => $this->bentukRefleksi($r))->all(),
            'meta' => $this->metaPaginasi($list),
        ]);
    }

    private function profilUser(Request $request): ?Profil
    {
        $this->wajibPeran($request->user(), ['user'], 'Hanya user biasa yang memakai fitur target ini.');

        return Profil::where('user_id', $request->user()->id)->first();
    }

    private function bentukTarget(?Profil $profil): array
    {
        return [
            'bb_target_kg' => $profil?->bb_target_kg === null ? null : (float) $profil->bb_target_kg,
            'bb_awal_kg' => $profil?->bb_awal_kg === null ? null : (float) $profil->bb_awal_kg,
            'target_aktivitas_per_minggu' => $profil?->target_aktivitas_per_minggu,
            'target_air_ml' => $profil?->target_air_ml,
        ];
    }

    private function bentukRefleksi(Refleksi $r): array
    {
        return [
            'id' => $r->id,
            'minggu' => $r->minggu,
            'catatan' => $r->catatan,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }
}
