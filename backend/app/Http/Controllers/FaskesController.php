<?php

namespace App\Http\Controllers;

use App\Models\Faskes;
use Illuminate\Http\Request;

// Menampilkan daftar puskesmas dan fasilitas kesehatan yang tersedia.
class FaskesController extends Controller
{
    public function index(Request $request)
    {
        $query = Faskes::orderBy('nama');

        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }

        $this->saringCari($query, ['nama', 'alamat', 'jenis'], $request);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $query->get([
                'id', 'nama', 'jenis', 'alamat', 'telepon', 'wilayah_id', 'lat', 'lng',
            ]),
        ]);
    }
}
