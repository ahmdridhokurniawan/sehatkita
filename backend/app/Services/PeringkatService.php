<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Support\Collection;

// Menghitung urutan peringkat dan jumlah peserta aktif di tiap kelurahan.
class PeringkatService
{
    public const MIN_PESERTA = 5;

    public const MAKS_BARIS = 10;

    private function peserta(int $wilayahId): Collection
    {
        return Pengguna::query()
            ->with('profil')
            ->where('wilayah_id', $wilayahId)
            ->where('role', 'user')
            ->where('aktif', true)
            ->whereNotNull('consent_at')
            ->orderByDesc('exp_total')
            ->orderBy('id')
            ->get()
            ->values();
    }

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
                    'rank' => $i + 1,
                    'nama' => $tampil ? $u->name : 'Peserta anonim',
                    'exp_total' => (int) $u->exp_total,
                    'level_gamifikasi' => (int) $u->level_gamifikasi,
                ];
            })
            ->values();
    }

    public function jumlahPeserta(int $wilayahId): int
    {
        return Pengguna::where('wilayah_id', $wilayahId)
            ->where('role', 'user')
            ->where('aktif', true)
            ->whereNotNull('consent_at')
            ->count();
    }

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
