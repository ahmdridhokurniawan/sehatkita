<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
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

        // per_page ngawur (0, minus, atau bukan angka) -> pakai default
        if ($nilai < 1) {
            $nilai = $default;
        }

        // Kontrak: per_page maksimal 100
        return min($nilai, 100);
    }

    /**
     * Pencarian teks sederhana (kontrak 23).
     * Menerima `search=` atau `q=`, dicocokkan dengan LIKE ke satu
     * atau beberapa kolom.
     *
     * Semua kolom dibungkus satu grup OR, jadi filter lain tetap dihormati:
     *   WHERE user_id = ? AND (catatan LIKE ? OR sumber LIKE ?)
     * Tanpa grup, filter tanggal di atasnya bisa bocor.
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

    /**
     * Blok `meta` paginasi (kontrak 1.3), biar tidak ditulis ulang
     * di setiap controller.
     */
    protected function metaPaginasi(LengthAwarePaginator $list): array
    {
        return [
            'page'      => $list->currentPage(),
            'per_page'  => $list->perPage(),
            'total'     => $list->total(),
            'last_page' => $list->lastPage(),
        ];
    }
}