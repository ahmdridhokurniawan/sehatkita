<?php

namespace App\Http\Controllers;

use App\Models\LogAudit;
use App\Models\Pengguna;
use App\Models\Profil;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Modul Profil — kontrak §5.1 (GET) & §5.2 (PUT).
 *
 * GET tanpa query   -> profil sendiri.
 * GET ?user_id=12   -> hanya kader (warga binaan) & super_admin; di luar scope 404.
 * Profil belum diisi -> 200, semua field null, profil_lengkap=false.
 */
class ProfilController extends Controller
{
    /** Enum riwayat keluarga (§1.5). */
    public const ENUM_RIWAYAT = [
        'hipertensi', 'diabetes', 'jantung', 'stroke',
        'kolesterol', 'asma', 'kanker', 'ginjal', 'tidak_ada',
    ];

    // GET /api/v1/profil
    public function show(Request $request)
    {
        $pemanggil = $request->user();
        $user      = $pemanggil;

        // §5.1 — baca profil orang lain hanya dalam scope
        if ($request->filled('user_id')) {
            $user = Pengguna::find((int) $request->query('user_id'));

            if (! $user || ! $this->bolehBaca($pemanggil, $user)) {
                return $this->tidakDitemukan();
            }

            // super_admin membaca data individu -> catat di log_audit (§5.1)
            if ($pemanggil->role === 'super_admin' && $pemanggil->id !== $user->id) {
                $this->catatAudit($pemanggil, $user);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $this->bentuk($user),
        ]);
    }

    // PUT /api/v1/profil
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'tgl_lahir'                   => 'required|date|before:today',
            'jenis_kelamin'               => ['required', Rule::in(['L', 'P'])],
            'tinggi_cm'                   => 'required|integer|min:50|max:250',
            'tingkat_aktivitas'           => ['required', Rule::in(['ringan', 'sedang', 'berat'])],
            'merokok'                     => 'required|boolean',
            'riwayat_keluarga'            => 'required|array|min:1',
            'riwayat_keluarga.*'          => [Rule::in(self::ENUM_RIWAYAT)],
            'tampil_di_peringkat'         => 'sometimes|boolean',
            'bb_target_kg'                => 'nullable|numeric|min:30|max:200',
            'target_aktivitas_per_minggu' => 'nullable|integer|min:0',
            'target_air_ml'               => 'nullable|integer|min:0',
        ]);

        // "tidak_ada" tidak boleh dicampur riwayat lain
        $riwayat = array_values(array_unique($validated['riwayat_keluarga']));
        if (in_array('tidak_ada', $riwayat, true) && count($riwayat) > 1) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => ['riwayat_keluarga' => ['Pilih "tidak_ada" saja bila tidak ada riwayat.']],
            ], 422);
        }

        $validated['riwayat_keluarga']    = $riwayat;
        $validated['tampil_di_peringkat'] = $request->boolean('tampil_di_peringkat');

        // bb_awal_kg diisi server saat target pertama diset (§17)
        $lama = $user->profil;
        if (! empty($validated['bb_target_kg']) && empty($lama?->bb_awal_kg)) {
            $validated['bb_awal_kg'] = $this->beratTerakhir($user) ?? $validated['bb_target_kg'];
        }

        $user->profil()->updateOrCreate(['user_id' => $user->id], $validated);

        return response()->json([
            'success' => true,
            'message' => 'Profil tersimpan',
            'data'    => $this->bentuk($user->fresh()),
        ]);
    }

    /**
     * Bentuk response §5.1 — selalu lengkap walau profil belum ada.
     */
    private function bentuk(Pengguna $user): array
    {
        /** @var Profil|null $p */
        $p       = $user->profil;
        $riwayat = $p?->riwayat_keluarga;

        return [
            'user_id'             => $user->id,
            'tgl_lahir'           => $p?->tgl_lahir?->toDateString(),
            'usia'                => $p?->tgl_lahir ? (int) $p->tgl_lahir->diffInYears(now()) : null,
            'jenis_kelamin'       => $p?->jenis_kelamin,
            'tinggi_cm'           => $p?->tinggi_cm !== null ? (float) $p->tinggi_cm : null,
            'tingkat_aktivitas'   => $p?->tingkat_aktivitas,
            'merokok'             => $p?->merokok,
            'riwayat_keluarga'    => is_array($riwayat) ? array_values($riwayat) : [],
            'tampil_di_peringkat' => (bool) ($p?->tampil_di_peringkat ?? false),
            'profil_lengkap'      => $this->lengkap($p),
            'updated_at'          => $p?->updated_at?->toIso8601String(),
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

    /** §5.1 — kader hanya warga binaannya, super_admin semua. */
    private function bolehBaca(Pengguna $pemanggil, Pengguna $target): bool
    {
        if ($pemanggil->id === $target->id) {
            return true;
        }

        return match ($pemanggil->role) {
            'super_admin'     => true,
            'kader'           => (int) $target->kader_id === (int) $pemanggil->id,
            'admin_kelurahan' => (int) $target->wilayah_id === (int) $pemanggil->wilayah_id,
            default           => false,
        };
    }

    private function beratTerakhir(Pengguna $user): ?float
    {
        $bb = $user->catatanKesehatan()
            ->whereNotNull('bb_kg')
            ->orderByDesc('dicatat_pada')
            ->value('bb_kg');

        return $bb !== null ? (float) $bb : null;
    }

    private function catatAudit(Pengguna $pemanggil, Pengguna $target): void
    {
        try {
            LogAudit::create([
                'user_id'    => $pemanggil->id,
                'aksi'       => 'baca_data_individu',
                'model'      => Profil::class,
                'model_id'   => $target->id,
                'ip'         => request()->ip(),
                'user_agent' => substr((string) request()->userAgent(), 0, 255),
            ]);
        } catch (\Throwable $e) {
            // audit tidak boleh menggagalkan pembacaan
        }
    }

    private function tidakDitemukan()
    {
        return response()->json([
            'success' => false,
            'message' => 'Data tidak ditemukan.',
        ], 404);
    }
}
