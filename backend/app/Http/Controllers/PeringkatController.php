<?php

namespace App\Http\Controllers;

use App\Models\Wilayah;
use App\Services\BadgeKeaktifanService;
use App\Services\PeringkatService;
use Illuminate\Http\Request;

// Menampilkan papan peringkat keaktifan kuartalan (3 bulanan), histori periode sebelumnya, dan daftar achievement.
class PeringkatController extends Controller
{
    public function __construct(
        private PeringkatService $peringkat,
        private BadgeKeaktifanService $badges
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();

        $wilayahId = $request->query('wilayah_id') ?? $user->wilayah_id;

        abort_unless($wilayahId, 422, 'wilayah_id wajib diisi.');

        $wilayah = Wilayah::find($wilayahId);
        abort_unless($wilayah, 404, 'Wilayah tidak ditemukan');

        if ($user->role !== 'super_admin') {
            abort_unless((int) $user->wilayah_id === (int) $wilayah->id, 403, 'Akses ditolak');
        }

        $daftar = $this->peringkat->daftar((int) $wilayah->id);

        $saya = null;
        $riwayatSaya = [];
        if ($user->role === 'user') {
            $saya = [
                'rank' => $this->peringkat->rankUser($user),
                'jumlah_badge' => $user->badge()->count(),
                'badges' => $user->badge()->pluck('badge')->values()->all(),
                'exp_total' => (int) $user->exp_total,
            ];
            $riwayatSaya = $this->peringkat->riwayatUser($user);
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => [
                'wilayah' => ['id' => $wilayah->id, 'nama' => $wilayah->nama],
                'periode' => $this->peringkat->infoPeriode(),
                'peserta_peringkat' => $this->peringkat->jumlahPeserta((int) $wilayah->id),
                'daftar' => $daftar,
                'saya' => $saya,
                'riwayat_saya' => $riwayatSaya,
            ],
        ]);
    }

    public function achievement(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Hanya warga yang memiliki pencapaian pribadi.');

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $this->badges->daftarAchievement($user),
        ]);
    }
}
