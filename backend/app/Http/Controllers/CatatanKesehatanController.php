<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use Illuminate\Http\Request; // baca input & user dari token

class CatatanKesehatanController extends Controller
{
    // POST /api/catatan-kesehatan - simpan data baru
    public function store(Request $request)
    {
        // 1. validasi, gagal -> 422 otomatis {errors}
        $data = $request->validate([
            'dicatat_pada'   => 'required|date', // tgl ukur
            'sumber'         => 'required|in:mandiri,kader,puskesmas',
            'bb_kg'          => 'nullable|numeric|min:20|max:300',
            'sistol'         => 'nullable|integer|min:60|max:260',
            'diastol'        => 'nullable|integer|min:30|max:160',
            'gula_darah'     => 'nullable|integer|min:20|max:700',
            'kolesterol'     => 'nullable|integer|min:50|max:600',
            'asam_urat'      => 'nullable|numeric|min:1|max:20',
            'lingkar_perut'  => 'nullable|numeric|min:40|max:200',
            'tidur_jam'      => 'nullable|integer|min:0|max:24',
            'merokok'        => 'nullable|boolean',
            'konsumsi_manis' => 'nullable|in:jarang,sering,setiap_hari',
            'catatan'        => 'nullable|string|max:1000',
        ]);

        $data['user_id'] = $request->user()->id; // dari token, bukan dari FE

        // hitung IMT server-side §7.1, tinggi ambil dari profil
        $tinggi = $request->user()->profil?->tinggi_cm;
        if (!empty($data['bb_kg']) && $tinggi) {
            $data['imt'] = round($data['bb_kg'] / ($tinggi / 100) ** 2, 2);
        }

        $catatan = CatatanKesehatan::create($data);

        return response()->json([ // envelope §1.2
            'success' => true,
            'message' => 'Data kesehatan tersimpan',
            'data'    => $catatan,
        ], 201);
    }

    // GET /api/catatan-kesehatan - riwayat milik sendiri + paginasi §1.3
    public function index(Request $request)
    {
        $list = CatatanKesehatan::where('user_id', $request->user()->id)
            ->latest('dicatat_pada')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->items(),
            // **Perbaikan**: kunci meta harus `meta`, bukan `Anthropic`
            'meta' => [
                'page'      => $list->currentPage(),
                'per_page'  => $list->perPage(),
                'total'     => $list->total(),
                'last_page' => $list->lastPage(),
            ],
        ]);
    }
}