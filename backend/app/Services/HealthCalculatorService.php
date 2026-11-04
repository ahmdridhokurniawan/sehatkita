<?php

namespace App\Services;

use App\Models\AmbangKategori;
use App\Models\CatatanKesehatan;
use Illuminate\Support\Facades\Cache;

class HealthCalculatorService
{
    // Skor maksimal per indikator untuk normalisasi skor risiko
    public const SKOR_MAKS = [
        'imt'         => 2,
        'tensi'       => 3,
        'gula_darah'  => 2,
        'kolesterol'  => 2,
        'asam_urat'   => 2,
    ];

    // Urutan keparahan kategori tensi
    private const URUTAN_KATEGORI = [
        'normal'          => 0,
        'perlu_perhatian' => 1,
        'tinggi'          => 2,
        'krisis'          => 3,
    ];

    // Ambil daftar ambang kategori indikator (dengan cache)
    public function ambang(string $kode, ?string $jenisGula = null): array
    {
        $semua = Cache::remember('ambang_kategori:semua', now()->addHour(), function () {
            return AmbangKategori::with('indikator')
                ->orderBy('indikator_id')
                ->orderBy('batas_min')
                ->get()
                ->groupBy(fn ($a) => $a->indikator->kode.'|'.($a->jenis_gula_darah ?? ''))
                ->map(fn ($baris) => $baris->map(fn ($a) => [
                    'batas_min'      => (float) $a->batas_min,
                    'batas_max'      => $a->batas_max === null ? null : (float) $a->batas_max,
                    'kategori'       => $a->kategori,
                    'status'         => $a->status,
                    'skor'           => (int) $a->skor,
                    'memicu_rujukan' => (bool) $a->memicu_rujukan,
                ])->toArray())
                ->toArray();
        });

        $kunci = $kode.'|'.($kode === 'gula_darah' ? ($jenisGula ?? 'puasa') : '');

        return $semua[$kunci] ?? [];
    }

    // Bersihkan cache ambang
    public function lupakanCache(): void
    {
        Cache::forget('ambang_kategori:semua');
    }

    // Hitung IMT = berat (kg) / (tinggi (m))^2
    public function hitungImt(?float $bbKg, ?float $tinggiCm): ?float
    {
        if ($bbKg === null || $tinggiCm === null || $tinggiCm <= 0) {
            return null;
        }

        $meter = $tinggiCm / 100;

        return round($bbKg / ($meter * $meter), 2);
    }

    // Ambil kategori indikator berdasarkan nilai pengukuran
    public function kategori(string $kode, ?float $nilai, ?string $jenisGula = null): ?array
    {
        if ($nilai === null) {
            return null;
        }

        foreach ($this->ambang($kode, $jenisGula) as $a) {
            $atas = $a['batas_max'];

            if ($nilai >= $a['batas_min'] && ($atas === null || $nilai < $atas)) {
                return $a;
            }
        }

        return null;
    }

    // Tentukan kategori dengan tingkat risiko paling tinggi
    public function kategoriTerburuk(array $hasil): ?array
    {
        return collect($hasil)
            ->filter()
            ->sortByDesc(fn ($a) => (self::URUTAN_KATEGORI[$a['kategori'] ?? ''] ?? 0) * 100 + ($a['skor'] ?? 0))
            ->first();
    }

    // Kategori tensi mengambil yang terberat antara sistol dan diastol
    public function kategoriTensi(?int $sistol, ?int $diastol): ?array
    {
        return $this->kategoriTerburuk([
            $this->kategori('sistol', $sistol),
            $this->kategori('diastol', $diastol),
        ]);
    }

    // Hitung skor risiko normalisasi 0-100
    public function skorRisiko(CatatanKesehatan $c): int
    {
        $terukur = $this->komponenSkor($c);

        $maks = array_sum(array_column($terukur, 'maks'));

        if ($maks === 0) {
            return 0;
        }

        return (int) min(100, round(array_sum(array_column($terukur, 'skor')) / $maks * 100));
    }

    // Ambil daftar skor komponen indikator yang terukur
    public function komponenSkor(CatatanKesehatan $c): array
    {
        $komponen = [];

        $imt = $c->imt;
        if ($imt !== null) {
            $komponen[] = [
                'kunci' => 'imt',
                'skor'  => (int) ($this->kategori('imt', $imt)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['imt'],
            ];
        }

        if ($c->sistol !== null || $c->diastol !== null) {
            $komponen[] = [
                'kunci' => 'tensi',
                'skor'  => (int) ($this->kategoriTensi($c->sistol, $c->diastol)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['tensi'],
            ];
        }

        if ($c->gula_darah !== null) {
            $komponen[] = [
                'kunci' => 'gula_darah',
                'skor'  => (int) ($this->kategori('gula_darah', $c->gula_darah, $c->jenis_gula_darah)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['gula_darah'],
            ];
        }

        if ($c->kolesterol !== null) {
            $komponen[] = [
                'kunci' => 'kolesterol',
                'skor'  => (int) ($this->kategori('kolesterol', $c->kolesterol)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['kolesterol'],
            ];
        }

        if ($c->asam_urat !== null) {
            $komponen[] = [
                'kunci' => 'asam_urat',
                'skor'  => (int) ($this->kategori('asam_urat', $c->asam_urat)['skor'] ?? 0),
                'maks'  => self::SKOR_MAKS['asam_urat'],
            ];
        }

        return $komponen;
    }

    // Tentukan status kesehatan berdasarkan skor indikator tertinggi
    public function statusKesehatan(CatatanKesehatan $c): string
    {
        $tertinggi = max([0, ...array_column($this->komponenSkor($c), 'skor')]);

        return match (true) {
            $tertinggi >= 2 => 'berisiko',
            $tertinggi === 1 => 'perlu_perhatian',
            default => 'normal',
        };
    }

    // Konversi nilai skor ke status kesehatan
    public function statusDariSkor(int $skor): string
    {
        return match (true) {
            $skor >= 2 => 'berisiko',
            $skor === 1 => 'perlu_perhatian',
            default => 'normal',
        };
    }

    // Generate snapshot kategori saat penyimpanan data
    public function snapshot(array $data, ?float $tinggiCm): array
    {
        $bb = isset($data['bb_kg']) ? (float) $data['bb_kg'] : null;
        $imt = $this->hitungImt($bb, $tinggiCm);

        $kJenisGula = $data['jenis_gula_darah'] ?? null;

        $kImt   = $this->kategori('imt', $imt);
        $kTensi = $this->kategoriTensi(
            isset($data['sistol']) ? (int) $data['sistol'] : null,
            isset($data['diastol']) ? (int) $data['diastol'] : null
        );
        $kGula  = $this->kategori('gula_darah', isset($data['gula_darah']) ? (float) $data['gula_darah'] : null, $kJenisGula);
        $kKol   = $this->kategori('kolesterol', isset($data['kolesterol']) ? (float) $data['kolesterol'] : null);
        $kAsam  = $this->kategori('asam_urat', isset($data['asam_urat']) ? (float) $data['asam_urat'] : null);

        return [
            'tinggi_cm'           => $tinggiCm,
            'kategori_imt'        => $kImt['kategori'] ?? null,
            'kategori_tensi'      => $kTensi['kategori'] ?? null,
            'kategori_gula_darah' => $kGula['kategori'] ?? null,
            'kategori_kolesterol' => $kKol['kategori'] ?? null,
            'kategori_asam_urat'  => $kAsam['kategori'] ?? null,
        ];
    }

    // Cek indikator yang memenuhi ambang batas rujukan otomatis
    public function indikatorMemicuRujukan(CatatanKesehatan $c): array
    {
        $hasil = [];

        $cek = [
            'sistol'      => $c->sistol,
            'diastol'     => $c->diastol,
            'gula_darah'  => $c->gula_darah,
            'kolesterol'  => $c->kolesterol,
            'asam_urat'   => $c->asam_urat,
        ];

        foreach ($cek as $kode => $nilai) {
            $a = $this->kategori($kode, $nilai, $kode === 'gula_darah' ? $c->jenis_gula_darah : null);

            if (($a['memicu_rujukan'] ?? false) === true) {
                $hasil[] = $kode;
            }
        }

        return $hasil;
    }

    // Cek apakah nilai berada di luar rentang wajar (perlu verifikasi petugas)
    public function perluVerifikasi(array $data): bool
    {
        $rentang = [
            'bb_kg'         => [20, 300],
            'sistol'        => [60, 260],
            'diastol'       => [30, 160],
            'gula_darah'    => [20, 700],
            'kolesterol'    => [50, 600],
            'asam_urat'     => [1, 20],
            'lingkar_perut' => [40, 200],
            'tidur_jam'     => [3, 12],
            'tinggi_cm'     => [120, 220],
        ];

        foreach ($rentang as $field => [$min, $max]) {
            $nilai = $data[$field] ?? null;

            if ($nilai !== null && ($nilai < $min || $nilai > $max)) {
                return true;
            }
        }

        if (isset($data['sistol'], $data['diastol']) && $data['diastol'] >= $data['sistol']) {
            return true;
        }

        return false;
    }

    // Format rangkuman hasil kalkulasi untuk response JSON
    public function rangkum(CatatanKesehatan $c): array
    {
        return [
            'tinggi_cm'           => $c->tinggi_cm === null ? null : (float) $c->tinggi_cm,
            'imt'                 => $c->imt,
            'kategori_imt'        => $c->kategori_imt,
            'kategori_tensi'      => $c->kategori_tensi,
            'kategori_gula_darah' => $c->kategori_gula_darah,
            'kategori_kolesterol' => $c->kategori_kolesterol,
            'kategori_asam_urat'  => $c->kategori_asam_urat,
            'status_kesehatan'    => $c->status_kesehatan,
            'skor_risiko'         => $c->skor_risiko,
        ];
    }
}
