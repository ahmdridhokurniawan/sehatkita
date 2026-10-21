<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Services\HealthCalculatorService;
use Illuminate\Http\Request;

/**
 * Rekam medis = series indikator untuk grafik. Kontrak 8.2.
 * Endpoint resmi /rekam-medis (dulu /tren, lihat kontrak 24).
 */
class RekamMedisController extends Controller
{
    // Satuan tiap indikator. Sengaja disamakan dengan daftar INDIKATOR di
    // frontend (app/rekam-medis/page.tsx) supaya label grafik tidak beda.
    private const SATUAN = [
        'bb_kg'         => 'kg',
        'imt'           => 'kg/m2',
        'sistol'        => 'mmHg',
        'diastol'       => 'mmHg',
        'gula_darah'    => 'mg/dL',
        'kolesterol'    => 'mg/dL',
        'asam_urat'     => 'mg/dL',
        'lingkar_perut' => 'cm',
    ];

    // periode -> jumlah bulan (kontrak 8.2: 1m, 3m, 6m, 1y)
    private const PERIODE = [
        '1m' => 1,
        '3m' => 3,
        '6m' => 6,
        '1y' => 12,
    ];

    // Service kalkulasi disuntik lewat constructor (Laravel urus sendiri).
    public function __construct(
        private HealthCalculatorService $kalkulator
    ) {}

    /** GET /rekam-medis?indikator=imt,bb_kg&periode=3m */
    public function index(Request $request)
    {
        $user = $request->user();

        // Indikator boleh banyak, dipisah koma. Yang tidak dikenal dibuang,
        // jadi user tidak bisa menyuntikkan nama kolom sembarangan ke query.
        $diminta = array_filter(explode(',', (string) $request->query('indikator', 'bb_kg')));
        $diminta = array_values(array_intersect($diminta, array_keys(self::SATUAN)));

        // Kalau semua yang diminta tidak dikenal -> fallback bb_kg,
        // supaya grafik tidak kosong tanpa penjelasan.
        if ($diminta === []) {
            $diminta = ['bb_kg'];
        }

        // Periode di luar daftar -> 3m.
        $periode = $request->query('periode', '3m');
        if (! isset(self::PERIODE[$periode])) {
            $periode = '3m';
        }

        $sejak = now()->subMonths(self::PERIODE[$periode])->startOfDay();

        // with('pengguna.profil') wajib: perhitungan IMT butuh tinggi badan
        // dari profil, kalau tidak akan query DB per baris (N+1).
        $catatan = $user->catatanKesehatan()
            ->where('dicatat_pada', '>=', $sejak)
            ->orderBy('dicatat_pada')
            ->orderBy('id')
            ->with('pengguna.profil')
            ->get();

        $series = [];

        foreach ($diminta as $kode) {
            $titik = [];

            foreach ($catatan as $c) {
                $nilai = $this->nilai($kode, $c);

                // Indikator yang tidak diisi di catatan itu dilewati,
                // bukan diisi 0 (0 akan merusak bentuk grafik).
                if ($nilai === null) {
                    continue;
                }

                $titik[] = [
                    'tanggal' => $c->dicatat_pada->toDateString(),
                    'nilai'   => $nilai,
                ];
            }

            $series[] = [
                'indikator' => $kode,
                'satuan'    => self::SATUAN[$kode],
                'titik'     => $titik,
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'periode' => $periode,
                'series'  => $series,
            ],
        ]);
    }

    /**
     * Nilai satu indikator dari satu catatan.
     * IMT tidak ada di tabel -> dihitung dari bb_kg + tinggi profil.
     */
    private function nilai(string $kode, CatatanKesehatan $c): ?float
    {
        if ($kode === 'imt') {
            return $this->kalkulator->hitungImt($c->bb_kg, $c->pengguna?->profil?->tinggi_cm);
        }

        $nilai = $c->{$kode};

        return $nilai === null ? null : (float) $nilai;
    }
}