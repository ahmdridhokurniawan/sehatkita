<?php

namespace App\Http\Controllers;

use App\Models\Wilayah;
use App\Services\PeringkatService;
use Illuminate\Http\Request;

/**
 * Peringkat gamifikasi — kontrak 12.5 & matriks 16.
 * GET /peringkat (?wilayah_id=)
 */
class PeringkatController extends Controller
{
    public function __construct(private PeringkatService $peringkat) {}

    // Ambil papan peringkat EXP warga dalam satu kelurahan dengan pembatasan akses
    public function index(Request $request)
    {
        $user = $request->user();

        // Tentukan kelurahan target dari parameter atau wilayah pengguna sendiri
        $wilayahId = $request->query('wilayah_id') ?? $user->wilayah_id;

        abort_unless($wilayahId, 422, 'wilayah_id wajib diisi.');

        $wilayah = Wilayah::find($wilayahId);
        abort_unless($wilayah, 404, 'Wilayah tidak ditemukan');

        // Selain super admin hanya boleh melihat papan peringkat kelurahannya sendiri
        if ($user->role !== 'super_admin') {
            abort_unless((int) $user->wilayah_id === (int) $wilayah->id, 403, 'Akses ditolak');
        }

        $daftar = $this->peringkat->daftar((int) $wilayah->id);

        $saya = null;
        if ($user->role === 'user') {
            $saya = [
                'rank'      => $this->peringkat->rankUser($user),
                'exp_total' => (int) $user->exp_total,
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'wilayah'          => ['id' => $wilayah->id, 'nama' => $wilayah->nama],
                'peserta_peringkat' => $this->peringkat->jumlahPeserta((int) $wilayah->id),
                'daftar'           => $daftar,
                'saya'             => $saya,
            ],
        ]);
    }
}
