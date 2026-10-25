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

    public function index(Request $request)
    {
        $user = $request->user();

        // Wilayah: user → wilayahnya sendiri; staf → parameternya.
        $wilayahId = $request->query('wilayah_id') ?? $user->wilayah_id;

        abort_unless($wilayahId, 422, 'wilayah_id wajib diisi.');

        $wilayah = Wilayah::find($wilayahId);
        abort_unless($wilayah, 404, 'Wilayah tidak ditemukan');

        // admin_kelurahan hanya boleh melihat kelurahannya sendiri.
        if ($user->role === 'admin_kelurahan') {
            abort_unless((int) $user->wilayah_id === (int) $wilayah->id, 403, 'Akses ditolak');
        }

        // kader & user hanya boleh wilayahnya sendiri.
        if (in_array($user->role, ['kader', 'user'], true)) {
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
