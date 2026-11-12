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
    // Batas minimum sel untuk privasi data agregat
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

    // Kalkulasi agregat data anonim per wilayah
    private function agregat(Request $request): array
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['admin_kelurahan', 'super_admin']), 403, 'Akses ditolak');

        // Batasi wilayah sesuai peran pengguna
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

        $periode = in_array($request->query('periode'), ['1m', '3m', '6m', '1y'], true)
            ? $request->query('periode')
            : '3m';

        $tglMulai = now()->subMonths(match ($periode) {
            '1m' => 1, '6m' => 6, '1y' => 12, default => 3,
        });

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

        $rujukan = Rujukan::whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $wilayahId))
            ->where('created_at', '>=', $tglMulai)
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $rujukanMentah = collect(['baru', 'dihubungi', 'tertangani', 'ditolak'])
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

    // Hitung distribusi kategori IMT per pengguna dari log terbaru
    private function distribusiImt(int $wilayahId, $tglMulai): array
    {
        $terakhir = DB::table('catatan_kesehatan as ck')
            ->join('pengguna as p', 'ck.user_id', '=', 'p.id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('p.role', 'user')
            ->where('ck.dicatat_pada', '>=', $tglMulai)
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
            $imt = (float) $row->bb_kg / (((float) $row->tinggi_cm / 100) ** 2);

            $kategori = match (true) {
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
            ->whereNotNull('p.consent_at')
            ->whereNotNull('pr.tgl_lahir')
            ->pluck('pr.tgl_lahir');

        $hariIni = now()->startOfDay();
        $hitung = [];

        foreach ($lahir as $tgl) {
            $umur = (int) \Illuminate\Support\Carbon::parse($tgl)->diffInYears($hariIni);
            $dasar = intdiv($umur, 5) * 5;
            $kunci = $dasar . '-' . ($dasar + 4);
            $hitung[$kunci] = ($hitung[$kunci] ?? 0) + 1;
        }

        ksort($hitung, SORT_NATURAL);

        return $hitung;
    }

    // Tren jumlah pencatatan kesehatan per bulan
    private function tren(int $wilayahId, $tglMulai)
    {
        return DB::table('catatan_kesehatan as ck')
            ->join('pengguna as p', 'ck.user_id', '=', 'p.id')
            ->where('p.wilayah_id', $wilayahId)
            ->where('p.role', 'user')
            ->whereNotNull('p.consent_at')
            ->where('ck.dicatat_pada', '>=', $tglMulai)
            ->where('ck.perlu_verifikasi', false)
            ->whereNull('ck.deleted_at')
            ->orderBy('ck.dicatat_pada')
            ->pluck('ck.dicatat_pada')
            ->map(fn ($tgl) => \Illuminate\Support\Carbon::parse($tgl)->format('Y-m'))
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
