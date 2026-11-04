<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Support\Collection;

class PeringkatService
{
    // Batas minimal peserta untuk menampilkan peringkat
    public const MIN_PESERTA = 5;

    // Jumlah maksimal peserta di papan peringkat
    public const MAKS_BARIS = 10;

    // Ambil daftar peserta aktif satu kelurahan terurut EXP tertinggi
    private function peserta(int $wilayahId): Collection
    {
        return Pengguna::query()
            ->with('profil')
            ->where('wilayah_id', $wilayahId)
            ->where('role', 'user')
            ->where('aktif', true)
            ->orderByDesc('exp_total')
            ->orderBy('id')
            ->get()
            ->values();
    }

    // Ambil daftar peringkat satu kelurahan (anonim jika profil disembunyikan)
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

    // Hitung total peserta aktif di wilayah
    public function jumlahPeserta(int $wilayahId): int
    {
        return Pengguna::where('wilayah_id', $wilayahId)
            ->where('role', 'user')
            ->where('aktif', true)
            ->count();
    }

    // Ambil posisi peringkat pengguna di kelurahannya
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
