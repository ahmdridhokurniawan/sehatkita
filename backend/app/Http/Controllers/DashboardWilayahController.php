<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Models\Rujukan;
use App\Models\Wilayah;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardWilayahController extends Controller
{
    // GET /dashboard/kelurahan — kontrak 9.1
    public function dashboardKelurahan(Request $request)
    {
        $data = $this->agregat($request);

        return response()->json(['success' => true, 'message' => 'OK', 'data' => $data]);
    }

    // GET /laporan/kelurahan — 14.2: struktur sama + disclaimer
    public function laporanKelurahan(Request $request)
    {
        $data = $this->agregat($request);
        $data['disclaimer'] = 'Sistem ini bukan alat diagnosis medis. Konsultasikan hasil dengan tenaga kesehatan.';

        return response()->json(['success' => true, 'message' => 'OK', 'data' => $data]);
    }

    // 14.1 khusus role user — delegasi supaya route lama tetap jalan
    public function laporanPribadi(Request $request)
    {
        return app(DashboardController::class)->laporanPribadi($request);
    }

    // Satu sumber angka untuk dua endpoint di atas
    private function agregat(Request $request): array
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['admin_kelurahan', 'super_admin']), 403, 'Akses ditolak');

        // admin_kelurahan terkunci ke wilayahnya sendiri (9.1)
        $wilayahId = $user->role === 'admin_kelurahan'
            ? $user->wilayah_id
            : $request->query('wilayah_id');

        abort_unless($wilayahId, 422, 'wilayah_id wajib untuk super_admin');
        $wilayah = Wilayah::find($wilayahId);
        abort_unless($wilayah, 404, 'Wilayah tidak ditemukan');

        $periode  = $request->query('periode', '3m');
        $tglMulai = now()->subMonths(match ($periode) {
            '1m' => 1, '6m' => 6, '1y' => 12, default => 3,
        });

        $totalPeserta = Pengguna::where('wilayah_id', $wilayahId)->where('role', 'user')->count();

        $totalPencatatan = CatatanKesehatan::whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $wilayahId))
            ->where('dicatat_pada', '>=', $tglMulai)
            ->where('perlu_verifikasi', false)   // outlier tidak dihitung (9.2)
            ->count();

        // count('user_id') + distinct() = COUNT(DISTINCT user_id); bukan distinct('user_id')->count()
        $aktifCount = CatatanKesehatan::whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $wilayahId))
            ->where('dicatat_pada', '>=', $tglMulai)
            ->where('perlu_verifikasi', false)
            ->distinct()->count('user_id');

        // IMT dihitung di SQL; tinggi_cm NULL / 0 dibuang agar tidak jadi kategori NULL
        $rawImt = DB::table('catatan_kesehatan as ck')
            ->join('pengguna as p', 'ck.user_id', '=', 'p.id')
            ->join('profil as pr', 'p.id', '=', 'pr.user_id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('p.role', 'user')
            ->where('ck.dicatat_pada', '>=', $tglMulai)     // filter periode (sebelumnya hilang)
            ->where('ck.perlu_verifikasi', false)
            ->where('pr.tinggi_cm', '>', 0)
            ->selectRaw("CASE
                WHEN ck.bb_kg / POWER(pr.tinggi_cm / 100, 2) < 18.5 THEN 'kurus'
                WHEN ck.bb_kg / POWER(pr.tinggi_cm / 100, 2) <= 25  THEN 'normal'
                WHEN ck.bb_kg / POWER(pr.tinggi_cm / 100, 2) <= 30  THEN 'gemuk'
                ELSE 'obesitas' END AS kategori,
                COUNT(DISTINCT ck.user_id) AS jumlah")
            ->groupBy('kategori')
            ->get();

        $imt = collect(['kurus', 'normal', 'gemuk', 'obesitas'])->map(fn ($k) => [
            'kategori' => $k,
            'jumlah'   => (int) (collect($rawImt)->firstWhere('kategori', $k)->jumlah ?? 0),
        ]);

        // Risiko: user unik per faktor, periode sama, outlier dibuang
        $risiko = collect([
            ['faktor' => 'hipertensi', 'jumlah' => $this->hitungRisiko($wilayahId, $tglMulai, 'sistol', '>=', 140)],
            ['faktor' => 'diabetes',   'jumlah' => $this->hitungRisiko($wilayahId, $tglMulai, 'gula_darah', '>=', 200)],
            ['faktor' => 'obesitas',   'jumlah' => (int) ($imt->firstWhere('kategori', 'obesitas')['jumlah'] ?? 0)],
        ]);

        $rujukan = Rujukan::whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $wilayahId))
            ->where('created_at', '>=', $tglMulai)
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'wilayah' => ['id' => $wilayah->id, 'nama' => $wilayah->nama],
            'periode' => $periode,
            'total_peserta'               => $totalPeserta,
            'total_pengguna_aktif'        => $aktifCount,
            'total_pencatatan'            => $totalPencatatan,
            'distribusi_imt'              => $this->suppress($imt),
            'distribusi_risiko'           => $this->suppress($risiko),
            'distribusi_kelompok_usia'    => $this->kelompokUsia($wilayahId),
            'rujukan' => [
                'total'                 => (int) $rujukan->sum(),
                'baru'                  => (int) ($rujukan['baru'] ?? 0),
                'dihubungi'             => (int) ($rujukan['dihubungi'] ?? 0),
                'tertangani'            => (int) ($rujukan['tertangani'] ?? 0),
                'ditolak'               => (int) ($rujukan['ditolak'] ?? 0),
                'belum_ditindaklanjuti' => (int) ($rujukan['baru'] ?? 0),
            ],
            'kepatuhan_pencatatan_persen' => $totalPeserta > 0 ? (int) round($aktifCount / $totalPeserta * 100) : 0,
            'tren'                        => $this->tren($wilayahId, $tglMulai),
        ];
    }

    // Hitung user unik yang melewati ambang pada 1 indikator
    private function hitungRisiko(int $wilayahId, $tglMulai, string $kolom, string $op, int $nilai): int
    {
        return CatatanKesehatan::whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $wilayahId))
            ->where('dicatat_pada', '>=', $tglMulai)
            ->where($kolom, $op, $nilai)
            ->where('perlu_verifikasi', false)
            ->distinct()->count('user_id');
    }

    // 9.2: sel dengan jumlah < 5 dihilangkan, bukan dikirim 0
    private function suppress($rows)
    {
        return collect($rows)
            ->filter(fn ($r) => (int) ($r['jumlah'] ?? 0) >= 5)
            ->map(fn ($r) => ['jumlah' => (int) $r['jumlah']] + $r)  // jumlah selalu int
            ->values();
    }

    // Kelompok umur 5 tahunan; suppression juga berlaku
    private function kelompokUsia(int $wilayahId)
    {
        $rows = DB::table('pengguna as p')
            ->join('profil as pr', 'p.id', '=', 'pr.user_id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('p.role', 'user')
            ->whereNotNull('pr.tgl_lahir')
            ->selectRaw("FLOOR(TIMESTAMPDIFF(YEAR, pr.tgl_lahir, CURDATE()) / 5) * 5 AS dasar, COUNT(*) AS jumlah")
            ->groupBy('dasar')
            ->orderBy('dasar')
            ->get();

        return $this->suppress(collect($rows)->map(fn ($r) => [
            'kelompok' => $r->dasar.'-'.($r->dasar + 4),
            'jumlah'   => (int) $r->jumlah,
        ]));
    }

    // Tren pencatatan bulanan (periode Y-m)
    private function tren(int $wilayahId, $tglMulai)
    {
        return DB::table('catatan_kesehatan as ck')
            ->join('pengguna as p', 'ck.user_id', '=', 'p.id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('ck.dicatat_pada', '>=', $tglMulai)
            ->where('ck.perlu_verifikasi', false)
            ->selectRaw("DATE_FORMAT(ck.dicatat_pada, '%Y-%m') AS periode, COUNT(*) AS total_pencatatan")
            ->groupBy('periode')
            ->orderBy('periode')
            ->get()
            ->map(fn ($r) => ['periode' => $r->periode, 'total_pencatatan' => (int) $r->total_pencatatan]);
    }
}