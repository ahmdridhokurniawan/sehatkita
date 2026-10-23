<?php

namespace App\Services;

use App\Models\AmbangKategori;
use App\Models\CatatanKesehatan;
use Illuminate\Support\Facades\Cache;

/**
 * ─────────────────────────────────────────────────────────────────────
 *  HealthCalculatorService — mesin kalkulasi kesehatan (Minggu 5)
 * ─────────────────────────────────────────────────────────────────────
 *  Mengubah angka mentah (bb_kg, sistol, …) menjadi:
 *    1. IMT
 *    2. Kategori tiap indikator   (dari tabel ambang_kategori)
 *    3. Status terburuk            (normal | perlu_perhatian | berisiko)
 *    4. Skor risiko 0–100
 *    5. Flag perlu_verifikasi      (nilai di luar rentang wajar)
 *
 *  Kenapa di service, bukan langsung di controller?
 *  → Aturan ambang dipakai ulang oleh: catatan, dashboard, tren, insight,
 *    dan dashboard kelurahan. Satu tempat = satu sumber kebenaran.
 */
class HealthCalculatorService
{
    /** Urutan status dari paling sehat → paling parah. */
    private const URUTAN_STATUS = [
        'normal'          => 0,
        'perlu_perhatian' => 1,
        'berisiko'        => 2,
    ];

    /** Pembagi skala skor risiko (jumlah poin maksimum semua faktor). */
    private const SKOR_MAKS_RAW = 27;

    /*
    |-------------------------------------------------------------------
    | 1. Ambang batas (dari DB, di-cache)
    |-------------------------------------------------------------------
    */

    /**
     * Ambil daftar ambang untuk 1 kode indikator.
     */
    public function ambang(string $kode): array
    {
        // Cache::remember: ambang jarang berubah → cukup 1 query DB per jam,
        // request berulang membaca dari cache.
        $semua = Cache::remember('ambang_kategori:semua', now()->addHour(), function () {
            return AmbangKategori::with('indikator')      // eager load relasi
                ->orderBy('indikator_id')
                ->orderBy('batas_min')                     // kecil → besar
                ->get()
                ->groupBy('indikator.kode')                // kelompok per kode
                ->map(fn ($baris) => $baris->map(fn ($a) => [
                    'batas_min' => (float) $a->batas_min,  // decimal → float
                    'batas_max' => $a->batas_max === null ? null : (float) $a->batas_max,
                    'kategori'  => $a->kategori,           // label, mis. "gemuk"
                    'status'    => $a->status,             // normal|perlu_perhatian|berisiko
                    'skor'      => (int) $a->skor,         // poin risiko
                ])->toArray())
                ->toArray();
        });

        return $semua[$kode] ?? [];
    }

    /*
    |-------------------------------------------------------------------
    | 2. IMT
    |-------------------------------------------------------------------
    */

    /**
     * IMT = berat (kg) / tinggi(m)².
     * Null bila data belum lengkap (kontrak: catatan boleh parsial).
     */
    public function hitungImt(?float $bbKg, ?float $tinggiCm): ?float
    {
        if ($bbKg === null || $tinggiCm === null || $tinggiCm <= 0) {
            return null;
        }

        $meter = $tinggiCm / 100;

        return round($bbKg / ($meter * $meter), 2);   // 2 desimal (kontrak 1.6)
    }

    /*
    |-------------------------------------------------------------------
    | 3. Kategori per indikator
    |-------------------------------------------------------------------
    */

    /**
     * Cari rentang ambang yang memuat $nilai untuk kode indikator itu.
     * Null bila nilai kosong / kode tak punya ambang.
     */
    public function kategori(string $kode, ?float $nilai): ?array
    {
        if ($nilai === null) {
            return null;
        }

        foreach ($this->ambang($kode) as $a) {
            $atas = $a['batas_max'];

            // batas_max null = rentang terbuka ke atas (mis. obesitas ≥ 30)
            if ($nilai >= $a['batas_min'] && ($atas === null || $nilai <= $atas)) {
                return $a;
            }
        }

        return null;
    }

    /**
     * Dari beberapa hasil ambang, ambil yang PALING PARAH.
     * Dipakai untuk tekanan darah (sistol + diastol) & status keseluruhan.
     */
    public function kategoriTerburuk(array $hasil): ?array
    {
        // Buang null (indikator yang tak diisi), lalu urut:
        // status lebih parah menang; seri → skor lebih besar menang.
        return collect($hasil)
            ->filter()
            ->sortByDesc(fn ($a) => (self::URUTAN_STATUS[$a['status']] ?? 0) * 100 + $a['skor'])
            ->first();
    }

    /**
     * Kategori tekanan darah = terburuk antara sistol & diastol.
     */
    public function kategoriTensi(?int $sistol, ?int $diastol): ?array
    {
        return $this->kategoriTerburuk([
            $this->kategori('sistol', $sistol),
            $this->kategori('diastol', $diastol),
        ]);
    }

    /*
    |-------------------------------------------------------------------
    | 4. Status & skor risiko keseluruhan
    |-------------------------------------------------------------------
    */

    /**
     * Status catatan ini = status terburuk dari semua indikator yang
     * ada nilainya. Belum ada indikator sama sekali → "normal".
     */
    public function statusKesehatan(CatatanKesehatan $c): string
    {
        $imt = $this->hitungImt($c->bb_kg, $c->pengguna?->profil?->tinggi_cm);

        $terburuk = $this->kategoriTerburuk([
            $this->kategori('imt', $imt),
            $this->kategoriTensi($c->sistol, $c->diastol),
            $this->kategori('gula_darah', $c->gula_darah),
            $this->kategori('kolesterol', $c->kolesterol),
            $this->kategori('asam_urat', $c->asam_urat),
        ]);

        return ($terburuk['status'] ?? 'normal');
    }

    /**
     * Skor risiko 0–100:
     *   poin indikator (dari ambang) + gaya hidup + riwayat keluarga,
     *   lalu diskalakan supaya nilai maksimum = 100.
     */
    public function skorRisiko(CatatanKesehatan $c): int
    {
        $imt = $this->hitungImt($c->bb_kg, $c->pengguna?->profil?->tinggi_cm);

        // Poin tiap indikator (null = tidak diisi → 0 poin)
        $raw  = ($this->kategori('imt', $imt)['skor'] ?? 0);
        $raw += ($this->kategori('sistol', $c->sistol)['skor'] ?? 0);
        $raw += ($this->kategori('diastol', $c->diastol)['skor'] ?? 0);
        $raw += ($this->kategori('gula_darah', $c->gula_darah)['skor'] ?? 0);
        $raw += ($this->kategori('kolesterol', $c->kolesterol)['skor'] ?? 0);
        $raw += ($this->kategori('asam_urat', $c->asam_urat)['skor'] ?? 0);

        // Poin gaya hidup dari catatan ini
        $raw += $c->merokok ? 2 : 0;                              // merokok +2
        $raw += match ($c->konsumsi_manis) {                      // minuman manis
            'setiap_hari' => 2,
            'sering'      => 1,
            default       => 0,
        };
        $raw += ($c->tidur_jam !== null && $c->tidur_jam < 5) ? 1 : 0;   // kurang tidur

        // Riwayat penyakit keluarga (JSON array di profil), maksimal dihitung 3
        $riwayat = $c->pengguna?->profil?->riwayat_keluarga ?? [];
        $raw += min(3, count($riwayat));

        return min(100, (int) round($raw / self::SKOR_MAKS_RAW * 100));
    }

    /*
    |-------------------------------------------------------------------
    | 5. Rentang wajar → perlu_verifikasi
    |-------------------------------------------------------------------
    */

    /**
     * Ada nilai di luar rentang wajar? (tabel kontrak 7.2)
     * Disimpan tetap disimpan, tapi ditandai & dikeluarkan dari agregat.
     */
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
            'tidur_jam'     => [0, 24],
        ];

        foreach ($rentang as $field => [$min, $max]) {
            $nilai = $data[$field] ?? null;

            if ($nilai !== null && ($nilai < $min || $nilai > $max)) {
                return true;   // 1 nilai cukup untuk menandai catatan ini
            }
        }

        return false;
    }

    /*
    |-------------------------------------------------------------------
    | 6. Rangkuman untuk response JSON (bentuk kontrak 7.2)
    |-------------------------------------------------------------------
    */

    /**
     * Semua field hitung-server untuk 1 catatan.
     * Dipanggil controller di POST & GET supaya bentuk response konsisten.
     */
    public function rangkum(CatatanKesehatan $c): array
    {
        $imt    = $this->hitungImt($c->bb_kg, $c->pengguna?->profil?->tinggi_cm);
        $kImt   = $this->kategori('imt', $imt);
        $kTensi = $this->kategoriTensi($c->sistol, $c->diastol);
        $kGula  = $this->kategori('gula_darah', $c->gula_darah);
        $kKol   = $this->kategori('kolesterol', $c->kolesterol);
        $kAsam  = $this->kategori('asam_urat', $c->asam_urat);

        return [
            'imt'                 => $imt,
            // Semua kategori_* pakai STATUS kecuali kategori_imt (label),
            // sama seperti accessor di model CatatanKesehatan.
            'kategori_imt'        => $kImt['kategori'] ?? null,   // label: "gemuk"
            'kategori_tensi'      => $kTensi['status'] ?? null,   // status: "perlu_perhatian"
            'kategori_gula_darah' => $kGula['status'] ?? null,
            'kategori_kolesterol' => $kKol['status'] ?? null,
            'kategori_asam_urat'  => $kAsam['status'] ?? null,
            'status_kesehatan'    => $this->statusKesehatan($c),
            'skor_risiko'         => $this->skorRisiko($c),
        ];
    }
}