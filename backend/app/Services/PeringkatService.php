<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Support\Collection;

/**
 * Peringkat gamifikasi kelurahan — kontrak §12.5 & §8.1 (`rank_kelurahan`).
 *
 * Dihitung saat dibaca (tidak disimpan) dari `pengguna.exp_total`
 * warga satu kelurahan. Bukan data kesehatan.
 */
class PeringkatService
{
    /** Ambang suppression kontrak §9.2 / §12.5. */
    public const MIN_PESERTA = 5;

    /** Maksimal baris yang dikirim ke FE (§12.5). */
    public const MAKS_BARIS = 10;

    /**
     * Peserta satu kelurahan, terurut exp_total terbesar.
     * Dipakai internal (rankUser) dan publik (daftar).
     */
    private function peserta(int $wilayahId): Collection
    {
        return Pengguna::query()
            ->with('profil')
            ->where('wilayah_id', $wilayahId)
            ->where('role', 'user')
            ->where('aktif', true)
            ->orderByDesc('exp_total')
            ->orderBy('id')               // tie-break stabil
            ->get()
            ->values();
    }

    /**
     * Daftar peserta peringkat satu kelurahan.
     * Nama disamarkan bila `profil.tampil_di_peringkat` false.
     * Kosong bila peserta < 5 (suppression §12.5).
     */
    public function daftar(int $wilayahId): Collection
    {
        $peserta = $this->peserta($wilayahId);

        if ($peserta->count() < self::MIN_PESERTA) {
            return collect();
        }

        return $peserta
            ->take(self::MAKS_BARIS)
            ->map(function (Pengguna $u, int $i) {
                $tampil = (bool) ($u->profil?->tampil_di_peringkat ?? false);

                return [
                    'rank'             => $i + 1,
                    'nama'             => $tampil ? $u->name : 'Peserta anonim',
                    'exp_total'        => (int) $u->exp_total,
                    'level_gamifikasi' => (int) $u->level_gamifikasi,
                ];
            })
            ->values();
    }

    /** Jumlah peserta yang ikut diperingkat. */
    public function jumlahPeserta(int $wilayahId): int
    {
        return Pengguna::where('wilayah_id', $wilayahId)
            ->where('role', 'user')
            ->where('aktif', true)
            ->count();
    }

    /**
     * Peringkat seorang user di kelurahannya.
     * Null bila peserta < 5 (suppression) atau user tidak punya wilayah.
     */
    public function rankUser(Pengguna $user): ?int
    {
        if (! $user->wilayah_id) {
            return null;
        }

        $peserta = $this->peserta((int) $user->wilayah_id);

        if ($peserta->count() < self::MIN_PESERTA) {
            return null;
        }

        $posisi = $peserta->search(fn (Pengguna $u) => $u->id === $user->id);

        return $posisi === false ? null : $posisi + 1;
    }
}
