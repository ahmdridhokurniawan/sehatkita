<?php

namespace App\Http\Controllers;

use App\Models\Wilayah;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

// Controller daftar wilayah kecamatan/kelurahan dan detail akses per wilayah
class WilayahController extends Controller
{
    // Tampilkan daftar wilayah dengan filter tipe, induk kecamatan, dan pencarian
    public function index(Request $request)
    {
        // Urutkan kecamatan lebih dulu agar pemilihan di form bertingkat rapi
        $query = Wilayah::orderByRaw('parent_id IS NULL DESC')
            ->orderBy('nama');

        if ($request->filled('tipe')) {
            $query->where('tipe', $request->tipe);
        }

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        $this->saringCari($query, ['nama', 'kode'], $request);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $query->get(['id', 'nama', 'tipe', 'kode', 'parent_id']),
        ]);
    }

    // Ambil detail satu wilayah setelah memeriksa izin Gate view-wilayah
    public function show(Request $request, $id)
    {
        if (! Gate::allows('view-wilayah', $id)) {
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
