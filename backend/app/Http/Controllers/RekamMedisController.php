<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Services\HealthCalculatorService;
use Illuminate\Http\Request;

/**
 * Series indikator untuk grafik. Kontrak §8.2.
 * Path resmi tetap `/tren` (§20: rename ke /rekam-medis dibatalkan);
 * `/rekam-medis` dipertahankan sebagai alias agar FE lama tidak pecah.
 */
class RekamMedisController extends Controller
{
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

    private const PERIODE = [
        '1m' => 1,
        '3m' => 3,
        '6m' => 6,
        '1y' => 12,
    ];

    public function __construct(
        private HealthCalculatorService $kalkulator
    ) {}

    /** GET /tren?indikator=imt,bb_kg&periode=3m[&user_id=] */
    public function index(Request $request)
    {
        $user = $request->user();

        // §8.2 — kader boleh lihat warga binaannya lewat ?user_id=
        $target = $user;
        if ($request->filled('user_id') && (int) $request->user_id !== (int) $user->id) {
            if (! in_array($user->role, ['kader', 'super_admin'], true)) {
                abort(404);
            }

            $target = Pengguna::findOrFail((int) $request->user_id);

            if ($user->role === 'kader' && (int) $target->kader_id !== (int) $user->id) {
                abort(404);
            }
        }

        $diminta = array_filter(explode(',', (string) $request->query('indikator', 'bb_kg')));
        $diminta = array_values(array_intersect($diminta, array_keys(self::SATUAN)));

        if ($diminta === []) {
            $diminta = ['bb_kg'];
        }

        $periode = $request->query('periode', '3m');
        if (! isset(self::PERIODE[$periode])) {
            $periode = '3m';
        }

        $sejak = now()->subMonths(self::PERIODE[$periode])->startOfDay();

        // §8.2 — log `perlu_verifikasi` dilewati; with('pengguna.profil') hindari N+1.
        $catatan = CatatanKesehatan::query()
            ->where('user_id', $target->id)
            ->where('dicatat_pada', '>=', $sejak)
            ->where('perlu_verifikasi', false)
            ->orderBy('dicatat_pada')
            ->orderBy('id')
            ->with('pengguna.profil')
            ->get();

        $series = [];

        foreach ($diminta as $kode) {
            // §8.2 — satu titik per hari = nilai log terakhir hari itu.
            $perHari = [];

            foreach ($catatan as $c) {
                $nilai = $this->nilai($kode, $c);

                if ($nilai === null) {
                    continue;
                }

                $perHari[$c->dicatat_pada->toDateString()] = $nilai;
            }

            $titik = [];
            foreach ($perHari as $tanggal => $nilai) {
                $titik[] = ['tanggal' => $tanggal, 'nilai' => $nilai];
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
