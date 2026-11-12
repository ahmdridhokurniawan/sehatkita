<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Jumlah item per halaman (kontrak 1.3).
     * Default 15, maksimal 100, minimal 1.
     * Contoh: /catatan-kesehatan?per_page=5
     */
    protected function perHalaman(Request $request, int $default = 15): int
    {
        $nilai = (int) $request->query('per_page', $default);

        // Nilai di bawah 1 dikembalikan ke standar default
        if ($nilai < 1) {
            $nilai = $default;
        }

        // Batas maksimal 100 item agar query tetap ringan
        return min($nilai, 100);
    }

    /**
     * Pencarian teks sederhana (kontrak 23).
     * Menerima `search=` atau `q=`, dicocokkan dengan LIKE ke satu
     * atau beberapa kolom.
     */
    protected function saringCari(Builder $query, array $kolom, Request $request): Builder
    {
        $kata = trim((string) ($request->query('search') ?? $request->query('q') ?? ''));

        if ($kata === '' || $kolom === []) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($kolom, $kata) {
            foreach ($kolom as $namaKolom) {
                $q->orWhere($namaKolom, 'like', '%'.$kata.'%');
            }
        });
    }

    // Format blok meta paginasi standar untuk seluruh response daftar
    protected function metaPaginasi(LengthAwarePaginator $list): array
    {
        return [
            'page'      => $list->currentPage(),
            'per_page'  => $list->perPage(),
            'total'     => $list->total(),
            'last_page' => $list->lastPage(),
        ];
    }

    // Hentikan request dengan 403 jika peran pengguna tidak termasuk daftar izin
    protected function wajibPeran(Pengguna $user, array $peran, string $pesan = 'Akses ditolak.'): void
    {
        abort_unless(in_array($user->role, $peran, true), 403, $pesan);
    }

    // Kembalikan response JSON 404 standar saat data tidak ditemukan atau di luar akses
    protected function responTidakDitemukan(string $pesan = 'Data tidak ditemukan.'): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $pesan], 404);
    }

    // Cek apakah warga termasuk binaan langsung kader atau satu wilayah kerja
    protected function dalamBinaan(Pengguna $kader, Pengguna $warga): bool
    {
        if ($warga->kader_id !== null) {
            return (int) $warga->kader_id === (int) $kader->id;
        }

        return $warga->wilayah_id !== null && (int) $warga->wilayah_id === (int) $kader->wilayah_id;
    }

    // Batasi query pengguna agar kader hanya melihat warga binaan atau satu kelurahan
    protected function scopeBinaan(Builder $query, Pengguna $kader): Builder
    {
        return $query->where('role', 'user')
            ->where(function (Builder $q) use ($kader) {
                $q->where('kader_id', $kader->id)->orWhereNull('kader_id');
            })
            ->where('wilayah_id', $kader->wilayah_id);
    }

    // Validasi parameter periode (1m/3m/6m/1y) lalu hitung jumlah bulan dan tanggal mulai
    protected function parsePeriode(?string $periode): array
    {
        $sah = in_array($periode, ['1m', '3m', '6m', '1y'], true) ? $periode : '3m';
        $bulan = match ($sah) {
            '1m' => 1,
            '6m' => 6,
            '1y' => 12,
            default => 3,
        };

        return [$sah, now()->subMonths($bulan), $bulan];
    }

    // Terapkan filter rentang tanggal inklusif berdasarkan parameter dari dan sampai
    protected function saringRentangTanggal(Builder $query, Request $request, string $kolom = 'created_at'): Builder
    {
        if ($request->filled('dari')) {
            $query->whereDate($kolom, '>=', $request->query('dari'));
        }
        if ($request->filled('sampai')) {
            $query->whereDate($kolom, '<=', $request->query('sampai'));
        }

        return $query;
    }
}