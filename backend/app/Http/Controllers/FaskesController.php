<?php

namespace App\Http\Controllers;

use App\Models\Faskes;
use Illuminate\Http\Request;

class FaskesController extends Controller
{
    // GET /api/faskes — butuh token (kontrak §6.2)
    public function index(Request $request)
    {
        $query = Faskes::orderBy('nama');

        // Filter opsional: faskes di kelurahan tertentu
        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $query->get([
                'id', 'nama', 'jenis', 'alamat', 'telepon', 'wilayah_id', 'lat', 'lng',
            ]),
        ]);
    }
}
