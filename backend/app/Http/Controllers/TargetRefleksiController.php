<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Profil;
use App\Models\Refleksi;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Modul Target & Refleksi - kontrak 13.
 *
 * 13.1 GET  /target    -> target pribadi (tersimpan di TABEL `profil`)
 * 13.2 PUT  /target    -> simpan target pribadi
 * 13.3 POST /refleksi  -> tulis refleksi mingguan (tabel `refleksi`)
 * 13.4 GET  /refleksi  -> daftar refleksi miliknya + paginasi
 */
class TargetRefleksiController extends Controller
{
    // GET /target - kontrak 13.1
    public function target(Request $request)
    {
        $profil = $this->profilUser($request);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $this->bentukTarget($profil),
        ]);
    }

    // Simpan perubahan target kesehatan pribadi warga
    public function simpanTarget(Request $request)
    {
        $this->wajibPeran($request->user(), ['user'], 'Hanya user biasa yang memakai fitur target ini.');

        // Semua kolom nullable agar pengguna bisa memperbarui sebagian target saja
        $data = $request->validate([
            'bb_target_kg'                => 'nullable|numeric|min:1|max:300',
            'target_aktivitas_per_minggu' => 'nullable|integer|min:0|max:30',
            'target_air_ml'               => 'nullable|integer|min:0|max:10000',
        ], [
            'bb_target_kg.numeric'  => 'Target berat badan harus berupa angka.',
            'target_air_ml.integer' => 'Target air harus berupa angka bulat.',
        ]);

        // Buat baris profil kosong bila warga baru belum mengisi onboarding
        $profil = Profil::firstOrCreate(['user_id' => $request->user()->id]);

        // Isi berat awal otomatis dari catatan valid terakhir saat target pertama diset
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
            'data'    => $this->bentukTarget($profil->fresh()),
        ]);
    }

    // Simpan catatan refleksi mingguan warga (maksimal satu per minggu ISO)
    public function simpanRefleksi(Request $request)
    {
        $this->wajibPeran($request->user(), ['user'], 'Hanya user biasa yang memakai fitur refleksi ini.');

        $data = $request->validate([
            'minggu'  => ['required', 'string', 'max:10', 'regex:/^\d{4}-W\d{2}$/'],
            'catatan' => 'required|string|max:2000',
        ], [
            'minggu.regex'     => 'Format minggu harus seperti 2026-W40 (tahun-W minggu).',
            'catatan.required' => 'Isi refleksi wajib diisi.',
        ]);

        // Kontrak 13.3: kirim ulang minggu yang sama → 422 (bukan 409).
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
            'minggu'  => $data['minggu'],
            'catatan' => $data['catatan'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Refleksi tersimpan',
            'data'    => $this->bentukRefleksi($refleksi),
        ], 201);
    }

    // Ambil daftar refleksi mingguan milik warga dengan paginasi terbaru
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
            'data'    => collect($list->items())->map(fn ($r) => $this->bentukRefleksi($r))->all(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // Ambil profil milik warga setelah memverifikasi peran user
    private function profilUser(Request $request): ?Profil
    {
        $this->wajibPeran($request->user(), ['user'], 'Hanya user biasa yang memakai fitur target ini.');

        return Profil::where('user_id', $request->user()->id)->first();
    }

    /** Bentuk §13.1 — semua null bila belum pernah diisi. */
    private function bentukTarget(?Profil $profil): array
    {
        return [
            'bb_target_kg'                => $profil?->bb_target_kg === null ? null : (float) $profil->bb_target_kg,
            'bb_awal_kg'                  => $profil?->bb_awal_kg === null ? null : (float) $profil->bb_awal_kg,
            'target_aktivitas_per_minggu' => $profil?->target_aktivitas_per_minggu,
            'target_air_ml'               => $profil?->target_air_ml,
        ];
    }

    private function bentukRefleksi(Refleksi $r): array
    {
        return [
            'id'         => $r->id,
            'minggu'     => $r->minggu,
            'catatan'    => $r->catatan,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }
}
