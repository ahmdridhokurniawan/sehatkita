<?php

namespace App\Services;

use App\Models\Pengguna;
use App\Models\RiwayatPeringkat;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

// Menghitung urutan peringkat kuartalan (per 3 bulan), cache Redis, dan arsip histori peringkat.
class PeringkatService
{
    public const MIN_PESERTA = 5;

    public const MAKS_BARIS = 10;

    private const NAMA_BULAN = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
        5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
        9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des',
    ];

    public function infoPeriode(?Carbon $ref = null): array
    {
        $sekarang = ($ref ?? now())->copy();
        $kuartal = (int) ceil($sekarang->month / 3);
        $mulai = $sekarang->copy()->firstOfQuarter()->startOfDay();
        $selesai = $sekarang->copy()->lastOfQuarter()->endOfDay();
        $resetBerikutnya = $mulai->copy()->addQuarter();
        $kode = "{$sekarang->year}-Q{$kuartal}";
        $label = self::NAMA_BULAN[$mulai->month].' – '.self::NAMA_BULAN[$selesai->month].' '.$sekarang->year;

        return [
            'kode' => $kode,
            'label' => $label,
            'kuartal' => $kuartal,
            'tahun' => $sekarang->year,
            'mulai' => $mulai->toDateString(),
            'selesai' => $selesai->toDateString(),
            'reset_berikutnya' => $resetBerikutnya->toDateString(),
            'sisa_hari' => max(0, (int) now()->startOfDay()->diffInDays($resetBerikutnya->startOfDay(), false)),
            'siklus_bulan' => 3,
        ];
    }

    private function cacheKey(int $wilayahId): string
    {
        $periode = $this->infoPeriode()['kode'];

        return "peringkat:wilayah:{$wilayahId}:{$periode}";
    }

    public function lupakanCache(?int $wilayahId = null): void
    {
        if ($wilayahId !== null) {
            Cache::forget($this->cacheKey($wilayahId));

            return;
        }

        $ids = Pengguna::whereNotNull('wilayah_id')
            ->distinct()
            ->pluck('wilayah_id');

        foreach ($ids as $id) {
            Cache::forget($this->cacheKey((int) $id));
        }
    }

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

    public function ringkasanWilayah(int $wilayahId): array
    {
        return Cache::remember($this->cacheKey($wilayahId), now()->addMinutes(5), function () use ($wilayahId) {
            $peserta = $this->peserta($wilayahId);
            $jumlah = $peserta->count();

            $daftar = $jumlah < self::MIN_PESERTA
                ? []
                : $peserta
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
                    ->values()
                    ->all();

            $posisiPerUser = [];
            if ($jumlah >= self::MIN_PESERTA) {
                foreach ($peserta as $i => $u) {
                    $posisiPerUser[$u->id] = $i + 1;
                }
            }

            return [
                'jumlah_peserta' => $jumlah,
                'daftar' => $daftar,
                'posisi' => $posisiPerUser,
            ];
        });
    }

    public function daftar(int $wilayahId): Collection
    {
        return collect($this->ringkasanWilayah($wilayahId)['daftar']);
    }

    public function jumlahPeserta(int $wilayahId): int
    {
        return (int) $this->ringkasanWilayah($wilayahId)['jumlah_peserta'];
    }

    public function rankUser(Pengguna $user): ?int
    {
        if (! $user->wilayah_id) {
            return null;
        }

        $ringkasan = $this->ringkasanWilayah((int) $user->wilayah_id);

        return $ringkasan['posisi'][$user->id] ?? null;
    }

    public function riwayatUser(Pengguna $user): array
    {
        return RiwayatPeringkat::query()
            ->with('wilayah:id,nama')
            ->where('user_id', $user->id)
            ->orderByDesc('selesai_periode')
            ->limit(12)
            ->get()
            ->map(fn (RiwayatPeringkat $r) => [
                'periode_kode' => $r->periode_kode,
                'periode_label' => $r->periode_label,
                'mulai_periode' => $r->mulai_periode?->toDateString(),
                'selesai_periode' => $r->selesai_periode?->toDateString(),
                'wilayah' => $r->wilayah ? ['id' => $r->wilayah->id, 'nama' => $r->wilayah->nama] : null,
                'exp_akhir' => (int) $r->exp_akhir,
                'level_akhir' => (int) $r->level_akhir,
                'peringkat_akhir' => $r->peringkat_akhir !== null ? (int) $r->peringkat_akhir : null,
                'total_peserta' => (int) $r->total_peserta,
                'diarsipkan_pada' => $r->diarsipkan_pada?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    public function resetKuartal(?Carbon $sekarang = null, bool $paksa = false): array
    {
        $ref = ($sekarang ?? now())->copy();
        $targetPeriode = $paksa
            ? $this->infoPeriode($ref)
            : $this->infoPeriode($ref->copy()->subDay());

        if (! $paksa && RiwayatPeringkat::where('periode_kode', $targetPeriode['kode'])->exists()) {
            return [
                'periode_kode' => $targetPeriode['kode'],
                'periode_label' => $targetPeriode['label'],
                'jumlah_diarsipkan' => 0,
                'dilewati' => true,
            ];
        }

        $diarsipkan = 0;

        DB::transaction(function () use ($targetPeriode, &$diarsipkan) {
            $waktuArsip = now();

            $semuaWarga = Pengguna::query()
                ->where('role', 'user')
                ->where(function ($q) {
                    $q->where(fn ($sub) => $sub->where('aktif', true)->whereNotNull('consent_at'))
                        ->orWhere('exp_total', '>', 0);
                })
                ->orderByDesc('exp_total')
                ->orderBy('id')
                ->get();

            $perWilayah = $semuaWarga->groupBy(fn (Pengguna $u) => (int) ($u->wilayah_id ?? 0));

            foreach ($perWilayah as $wilId => $kelompok) {
                $terurut = $kelompok->values();
                $totalPeserta = $terurut->count();

                foreach ($terurut as $idx => $warga) {
                    RiwayatPeringkat::updateOrCreate(
                        [
                            'user_id' => $warga->id,
                            'periode_kode' => $targetPeriode['kode'],
                        ],
                        [
                            'wilayah_id' => $wilId > 0 ? $wilId : null,
                            'periode_label' => $targetPeriode['label'],
                            'mulai_periode' => $targetPeriode['mulai'],
                            'selesai_periode' => $targetPeriode['selesai'],
                            'exp_akhir' => (int) $warga->exp_total,
                            'level_akhir' => max(1, (int) $warga->level_gamifikasi),
                            'peringkat_akhir' => $wilId > 0 ? $idx + 1 : null,
                            'total_peserta' => $totalPeserta,
                            'diarsipkan_pada' => $waktuArsip,
                        ]
                    );
                    $diarsipkan++;
                }
            }

            Pengguna::where('role', 'user')->update([
                'exp_total' => 0,
                'level_gamifikasi' => 1,
            ]);
        });

        $this->lupakanCache();

        return [
            'periode_kode' => $targetPeriode['kode'],
            'periode_label' => $targetPeriode['label'],
            'jumlah_diarsipkan' => $diarsipkan,
            'dilewati' => false,
        ];
    }
}
