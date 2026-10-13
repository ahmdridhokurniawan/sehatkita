<?php

namespace App\Http\Controllers;

use App\Models\Wilayah;
use Illuminate\Http\Request;

class WilayahController extends Controller
{
    // GET /api/wilayah — publik, dipakai form register (kontrak §6.1)
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

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $query->get(['id', 'nama', 'tipe', 'kode', 'parent_id']),
        ]);
    }
}
