<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Rujukan;
use App\Services\HealthCalculatorService;
use App\Services\InsightService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private InsightService $insight
    ) {}

    // GET /api/v1/dashboard/pribadi & GET /api/v1/laporan/pribadi (Kontrak 8.1 & 14.1)
    public function pribadi(Request $request)
    {
        $user  = $request->user();
        $profil = $user->profil;

        $periode = $request->query('periode', '3m');
        $bulan   = match ($periode) {
            '1m' => 1,
            '6m' => 6,
            '1y' => 12,
            default => 3,
        };
        $tglMulai = now()->subMonths($bulan);

        $catatan = CatatanKesehatan::where('user_id', $user->id)
            ->where('dicatat_pada', '>=', $tglMulai)
            ->where('perlu_verifikasi', false)
            ->orderBy('dicatat_pada', 'desc')
            ->get();

        $terbaru = $catatan->first();

        // Hitung skor & status
        $statusKesehatan = 'normal';
        $skorRisiko      = 0;

        if ($terbaru) {
            $imtStatus  = $this->kalkulator->hitungIMT($terbaru->bb_kg, $profil?->tinggi_cm ?? 165);
            $tdStatus   = $this->kalkulator->kategoriTekananDarah($terbaru->sistol, $terbaru->diastol);
            $gdaStatus  = $this->kalkulator->kategoriGulaDarah($terbaru->gula_darah);

            if ($imtStatus['kategori'] === 'obesitas' || $tdStatus === 'hipertensi_2' || $gdaStatus === 'tinggi') {
                $statusKesehatan = 'perlu_perhatian';
                $skorRisiko += 40;
            }
            if ($tdStatus === 'hipertensi_1' || $imtStatus['kategori'] === 'gemuk') {
                $skorRisiko += 20;
            }
        }

        $rujukanList = Rujukan::with('faskes')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($r) => [
                'tanggal' => $r->created_at->toDateString(),
                'faskes'  => $r->faskes?->nama ?? 'Puskesmas',
                'status'  => $r->status,
            ]);

        $usia = $profil?->tgl_lahir ? Carbon::parse($profil->tgl_lahir)->age : null;

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'periode'   => $periode,
                'user'      => [
                    'name'          => $user->name,
                    'usia'          => $usia,
                    'jenis_kelamin' => $profil?->jenis_kelamin,
                ],
                'ringkasan' => [
                    'status_kesehatan' => $statusKesehatan,
                    'skor_risiko'      => $skorRisiko,
                    'total_pencatatan' => $catatan->count(),
                ],
                'catatan'   => $catatan->map(fn ($c) => [
                    'dicatat_pada' => $c->dicatat_pada->toDateString(),
                    'sumber'       => $c->sumber,
                    'bb_kg'        => (float) $c->bb_kg,
                    'imt'          => (float) ($this->kalkulator->hitungIMT($c->bb_kg, $profil?->tinggi_cm ?? 165)['imt'] ?? 0),
                    'sistol'       => $c->sistol,
                    'diastol'      => $c->diastol,
                    'gula_darah'   => $c->gula_darah,
                ])->values(),
                'rujukan'   => $rujukanList,
                'disclaimer' => 'Sistem ini bukan alat diagnosis medis. Konsultasikan hasil dengan tenaga kesehatan.',
            ],
        ]);
    }
}