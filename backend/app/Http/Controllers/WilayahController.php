<?php

namespace App\Http\Controllers;

use App\Models\Wilayah;
use Illuminate\Http\Request;

class WilayahController extends Controller
{
    // GET /api/wilayah — publik, dipakai form register (kontrak 6.1)
    // Query: ?tipe=kecamatan|kelurahan&parent_id=1&search=Sungai (kontrak 23)
    public function index(Request $request)
        {
            // Query dasar, urut: kecamatan dulu (parent null), lalu nama
            $query = Wilayah::orderByRaw('parent_id IS NULL DESC')
                ->orderBy('nama');

            // Filter opsional: hanya kecamatan / hanya kelurahan
            if ($request->filled('tipe')) {
                $query->where('tipe', $request->tipe);
            }

            // Filter opsional: kelurahan di bawah kecamatan tertentu
            if ($request->filled('parent_id')) {
                $query->where('parent_id', $request->parent_id);
            }

            // Pencarian nama / kode wilayah (kontrak 23, contoh ?search=Sungai)
            $this->saringCari($query, ['nama', 'kode'], $request);

            return response()->json([
                'success' => true,
                'message' => 'OK',
                'data'    => $query->get(['id', 'nama', 'tipe', 'kode', 'parent_id']),
            ]);
        }

        /**
         * GET /v1/wilayah/{id}
         * Menggunakan Gate "view-wilayah" untuk otorisasi.
         */
        public function show(Request $request, $id)
        {
            // Cek izin dengan Gate yang didefinisikan di AuthServiceProvider
            if (! \Gate::allows('view-wilayah', $id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak memiliki izin untuk melihat wilayah ini.',
                    'data'    => null,
                ], 403);
            }

            $wilayah = Wilayah::findOrFail($id);
            return response()->json([
                'success' => true,
                'message' => 'Data wilayah berhasil diambil',
                'data'    => $wilayah,
            ]);
        }
}