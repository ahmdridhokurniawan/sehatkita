<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Models\Rujukan;
use App\Models\Wilayah;
use App\Services\HealthCalculatorService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// Controller analitik dan laporan agregat kesehatan tingkat kelurahan
class DashboardWilayahController extends Controller
{
    public function __construct(private HealthCalculatorService $kalkulator) {}

    // Batas minimum sel agar identitas warga tetap anonim dalam agregat
    private const MIN_SEL = 5;

    // Data agregat statistik dashboard kelurahan
    public function dashboardKelurahan(Request $request)
    {
        $data = $this->agregat($request);

        return response()->json(['success' => true, 'message' => 'OK', 'data' => $data]);
    }

    // Laporan agregat kesehatan kelurahan
    public function laporanKelurahan(Request $request)
    {
        $data = $this->agregat($request);
        $data['disclaimer'] = 'Sistem ini bukan alat diagnosis medis. Konsultasikan hasil dengan tenaga kesehatan.';

        return response()->json(['success' => true, 'message' => 'OK', 'data' => $data]);
    }

    // Laporan ringkasan kesehatan pribadi
    public function laporanPribadi(Request $request)
    {
        return app(DashboardController::class)->laporanPribadi($request);
    }

    // Kalkulasi agregat anonim indikator kesehatan per wilayah kelurahan
    private function agregat(Request $request): array
    {
        $user = $request->user();
        $this->wajibPeran($user, ['admin_kelurahan', 'super_admin'], 'Akses ditolak');

        // Kunci cakupan wilayah bagi admin kelurahan atau ambil parameter super admin
        if ($user->role === 'admin_kelurahan') {
            $wilayahId = $user->wilayah_id;
        } else {
            $wilayahId = $request->query('wilayah_id');
        }

        if (! $wilayahId) {
            abort(422, $user->role === 'admin_kelurahan'
                ? 'Akun admin kelurahan belum memiliki wilayah penugasan.'
                : 'wilayah_id wajib untuk super_admin');
        }

        $wilayah = Wilayah::find($wilayahId);
        abort_unless($wilayah, 404, 'Wilayah tidak ditemukan');
        // Pastikan dashboard kelurahan tidak menerima ID wilayah tingkat kecamatan (§9.1)
        abort_unless($wilayah->tipe === 'kelurahan', 422, 'wilayah_id harus berupa kelurahan.');

        [$periode, $tglMulai] = $this->parsePeriode($request->query('periode'));

        // Hitung total peserta yang telah menyetujui kebijakan
        $populasi = Pengguna::where('wilayah_id', $wilayahId)
            ->where('role', 'user')
            ->whereNotNull('consent_at')
            ->where('aktif', true);

        $totalPeserta = (clone $populasi)->count();

        $idPopulasi = (clone $populasi)->pluck('id');

        $logSah = CatatanKesehatan::whereIn('user_id', $idPopulasi)
            ->where('dicatat_pada', '>=', $tglMulai)
            ->where('perlu_verifikasi', false);

        $totalPencatatan = (clone $logSah)->count();
        $aktifCount      = (clone $logSah)->distinct()->count('user_id');

        $imt     = $this->saringKelompok($this->distribusiImt($wilayahId, $tglMulai));
        $riwayat = $this->saringKelompok($this->distribusiRiwayatKeluarga($wilayahId));
        $usia    = $this->saringKelompok($this->kelompokUsia($wilayahId));

        $rujukan = Rujukan::whereHas('pengguna', fn ($q) => $q
                ->where('wilayah_id', $wilayahId)
                ->where('role', 'user')
                ->where('aktif', true)
                ->whereNotNull('consent_at'))
            ->where('created_at', '>=', $tglMulai)
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $rujukanMentah = collect(['baru', 'dihubungi', 'selesai', 'ditolak'])
            ->mapWithKeys(fn ($s) => [$s => (int) ($rujukan[$s] ?? 0)])
            ->all();

        $rujukanSaring = $this->saringKelompok($rujukanMentah);

        $disembunyikan = $imt['disembunyikan']
            || $riwayat['disembunyikan']
            || $usia['disembunyikan']
            || $rujukanSaring['disembunyikan'];

        return [
            'wilayah' => ['id' => $wilayah->id, 'nama' => $wilayah->nama],
            'periode' => $periode,
            'total_peserta'               => $totalPeserta,
            'total_pengguna_aktif'        => $aktifCount,
            'total_pencatatan'            => $totalPencatatan,
            'distribusi_imt'              => collect($imt['tampil'])
                ->map(fn ($n, $k) => ['kategori' => $k, 'jumlah' => $n])->values(),
            'distribusi_riwayat_keluarga' => collect($riwayat['tampil'])
                ->map(fn ($n, $f) => ['faktor' => $f, 'jumlah' => $n])->values(),
            'distribusi_kelompok_usia'    => collect($usia['tampil'])
                ->map(fn ($n, $k) => ['kelompok' => $k, 'jumlah' => $n])->values(),
            'rujukan'                     => $rujukanSaring['tampil'],
            'kepatuhan_pencatatan_persen' => $totalPeserta > 0
                ? (int) round($aktifCount / $totalPeserta * 100)
                : 0,
            'tren'                        => $this->tren($wilayahId, $tglMulai),
            'ada_data_disembunyikan'      => $disembunyikan,
        ];
    }

    // Hitung sebaran kategori IMT dari catatan terakhir setiap warga yang menyetujui privasi
    private function distribusiImt(int $wilayahId, $tglMulai): array
    {
        $terakhir = DB::table('catatan_kesehatan as ck')
            ->join('pengguna as p', 'ck.user_id', '=', 'p.id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('p.role', 'user')
            ->where('p.aktif', true)
            ->whereNotNull('p.consent_at')
            ->where('ck.dicatat_pada', '>=', $tglMulai)
            ->where('ck.dicatat_pada', '<=', now()->toDateString())
            ->where('ck.perlu_verifikasi', false)
            ->whereNull('ck.deleted_at')
            ->whereNotNull('ck.bb_kg')
            ->where('ck.tinggi_cm', '>', 0)
            ->select([
                'ck.user_id',
                'ck.bb_kg',
                'ck.tinggi_cm',
                'ck.dicatat_pada',
                'ck.id',
            ])
            ->orderBy('ck.user_id')
            ->orderByDesc('ck.dicatat_pada')
            ->orderByDesc('ck.id')
            ->get()
            ->unique('user_id');

        $mentah = ['kurus' => 0, 'normal' => 0, 'gemuk' => 0, 'obesitas' => 0];

        foreach ($terakhir as $row) {
            $imt = $this->kalkulator->hitungImt((float) $row->bb_kg, (float) $row->tinggi_cm);
            if ($imt === null) {
                continue;
            }

            $dinamis  = $this->kalkulator->kategori('imt', $imt)['kategori'] ?? null;
            $kategori = isset($mentah[$dinamis ?? ''])
                ? $dinamis
                : match (true) {
                    $imt < 18.5 => 'kurus',
                    $imt < 25   => 'normal',
                    $imt < 30   => 'gemuk',
                    default     => 'obesitas',
                };

            $mentah[$kategori]++;
        }

        return $mentah;
    }

    // Hitung distribusi faktor riwayat penyakit keluarga
    private function distribusiRiwayatKeluarga(int $wilayahId): array
    {
        $rows = DB::table('pengguna as p')
            ->join('profil as pr', 'p.id', '=', 'pr.user_id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('p.role', 'user')
            ->where('p.aktif', true)
            ->whereNotNull('p.consent_at')
            ->whereNotNull('pr.riwayat_keluarga')
            ->pluck('pr.riwayat_keluarga');

        $mentah = [];

        foreach ($rows as $json) {
            $daftar = is_string($json) ? json_decode($json, true) : $json;

            if (! is_array($daftar)) {
                continue;
            }

            foreach (array_unique($daftar) as $faktor) {
                if ($faktor === 'tidak_ada' || $faktor === '') {
                    continue;
                }
                $mentah[$faktor] = ($mentah[$faktor] ?? 0) + 1;
            }
        }

        arsort($mentah);

        return $mentah;
    }

    // Hitung sebaran demografi kelompok usia 5 tahunan
    private function kelompokUsia(int $wilayahId): array
    {
        $lahir = DB::table('pengguna as p')
            ->join('profil as pr', 'p.id', '=', 'pr.user_id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('p.role', 'user')
            ->where('p.aktif', true)
            ->whereNotNull('p.consent_at')
            ->whereNotNull('pr.tgl_lahir')
            ->pluck('pr.tgl_lahir');

        $hariIni = now()->startOfDay();
        $hitung = [];

        foreach ($lahir as $tgl) {
            $umur  = (int) Carbon::parse($tgl)->diffInYears($hariIni);
            $dasar = intdiv($umur, 5) * 5;
            $kunci = $dasar . '-' . ($dasar + 4);
            $hitung[$kunci] = ($hitung[$kunci] ?? 0) + 1;
        }

        ksort($hitung, SORT_NATURAL);

        return $hitung;
    }

    // Hitung tren jumlah pencatatan kesehatan bulanan di wilayah kelurahan
    private function tren(int $wilayahId, $tglMulai)
    {
        return DB::table('catatan_kesehatan as ck')
            ->join('pengguna as p', 'ck.user_id', '=', 'p.id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('p.role', 'user')
            ->where('p.aktif', true)
            ->whereNotNull('p.consent_at')
            ->where('ck.dicatat_pada', '>=', $tglMulai)
            ->where('ck.perlu_verifikasi', false)
            ->whereNull('ck.deleted_at')
            ->orderBy('ck.dicatat_pada')
            ->pluck('ck.dicatat_pada')
            ->map(fn ($tgl) => Carbon::parse($tgl)->format('Y-m'))
            ->countBy()
            ->map(fn ($jumlah, $periode) => [
                'periode'          => $periode,
                'total_pencatatan' => (int) $jumlah,
            ])
            ->values();
    }

    // Filter privasi untuk menyembunyikan sel di bawah batas minimum
    private function saringKelompok(array $mentah): array
    {
        $adaData = array_filter($mentah, fn ($n) => (int) $n > 0);

        if (empty($adaData)) {
            return ['tampil' => [], 'disembunyikan' => false];
        }

        $tampil = array_filter($mentah, fn ($n) => (int) $n >= self::MIN_SEL);

        // Sel "tersembunyi" = ada isinya tapi < 5. Sel 0 bukan data.
        $tersembunyi = count(array_filter($mentah, fn ($n) => (int) $n > 0 && (int) $n < self::MIN_SEL));

        // Complementary: tepat satu sel disembunyikan → sembunyikan
        // sel terkecil berikutnya agar tidak bisa dihitung dari total.
        if ($tersembunyi === 1 && count($tampil) > 1) {
            $kunciTampil = array_keys($tampil);
            usort($kunciTampil, fn ($a, $b) => $tampil[$a] <=> $tampil[$b]);

            unset($tampil[$kunciTampil[0]]);
        }

        return [
            'tampil'        => $tampil,
            'disembunyikan' => $tersembunyi > 0,
        ];
    }
}
