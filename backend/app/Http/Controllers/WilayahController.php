<?php

namespace App\Http\Controllers;

use App\Models\Wilayah;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

// Menampilkan daftar dan rincian kelurahan serta kecamatan.
class WilayahController extends Controller
{
    public function index(Request $request)
    {

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
            'data' => $query->get(['id', 'nama', 'tipe', 'kode', 'parent_id']),
        ]);
    }

    public function show(Request $request, $id)
    {
        if (! Gate::allows('view-wilayah', $id)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak memiliki izin untuk melihat wilayah ini.',
                'data' => null,
            ], 403);
        }

        $wilayah = Wilayah::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Data wilayah berhasil diambil',
            'data' => $wilayah,
        ]);
    }
}
