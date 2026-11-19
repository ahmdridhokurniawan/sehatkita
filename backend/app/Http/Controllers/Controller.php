<?php

namespace App\Http\Controllers;

use App\Models\LogAudit;
use App\Models\Pengguna;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// Berisi aturan dasar bersama seperti pengecekan peran pengguna, pembagian halaman, dan pencatatan aktivitas.
abstract class Controller
{
    protected function perHalaman(Request $request, int $default = 15): int
    {
        $nilai = (int) $request->query('per_page', $default);

        if ($nilai < 1) {
            $nilai = $default;
        }

        return min($nilai, 100);
    }

    protected function saringCari(Builder $query, array $kolom, Request $request): Builder
    {
        $kata = trim((string) ($request->query('search') ?? $request->query('q') ?? ''));

        if ($kata === '' || $kolom === []) {
            return $query;
        }

        $kata = mb_substr($kata, 0, 100);
        $escaped = addcslashes($kata, '%_\\');

        return $query->where(function (Builder $q) use ($kolom, $escaped) {
            foreach ($kolom as $namaKolom) {
                $q->orWhere($namaKolom, 'like', '%'.$escaped.'%');
            }
        });
    }

    protected function catatAudit(Pengguna $pelaku, string $aksi, string $model, ?int $modelId = null): void
    {
        try {
            LogAudit::create([
                'user_id' => $pelaku->id,
                'aksi' => $aksi,
                'model' => $model,
                'model_id' => $modelId,
                'ip' => request()->ip(),
                'user_agent' => substr((string) request()->userAgent(), 0, 255),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Gagal mencatat log audit: '.$e->getMessage());
        }
    }

    protected function metaPaginasi(LengthAwarePaginator $list): array
    {
        return [
            'page' => $list->currentPage(),
            'per_page' => $list->perPage(),
            'total' => $list->total(),
            'last_page' => $list->lastPage(),
        ];
    }

    protected function wajibPeran(Pengguna $user, array $peran, string $pesan = 'Akses ditolak.'): void
    {
        abort_unless(in_array($user->role, $peran, true), 403, $pesan);
    }

    protected function responTidakDitemukan(string $pesan = 'Data tidak ditemukan.'): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $pesan], 404);
    }

    protected function dalamBinaan(Pengguna $kader, Pengguna $warga): bool
    {
        if ($warga->kader_id !== null) {
            return (int) $warga->kader_id === (int) $kader->id;
        }

        return $warga->wilayah_id !== null && (int) $warga->wilayah_id === (int) $kader->wilayah_id;
    }

    protected function scopeBinaan(Builder $query, Pengguna $kader): Builder
    {
        return $query->where('role', 'user')
            ->where(function (Builder $q) use ($kader) {
                $q->where('kader_id', $kader->id)->orWhereNull('kader_id');
            })
            ->where('wilayah_id', $kader->wilayah_id);
    }

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
