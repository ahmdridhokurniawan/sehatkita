<?php

namespace App\Http\Controllers;

use App\Models\Wilayah;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;

// Menampilkan daftar dan rincian kelurahan serta kecamatan dengan dukungan cache Redis.
class WilayahController extends Controller
{
    public function index(Request $request)
    {
        $adaCari = trim((string) ($request->query('search') ?? $request->query('q') ?? '')) !== '';
        $tipe = (string) $request->query('tipe', '');
        $parentId = (string) $request->query('parent_id', '');

        if (! $adaCari) {
            $cacheKey = 'wilayah:v2:list:'.md5("{$tipe}|{$parentId}");
            $data = Cache::remember($cacheKey, now()->addHour(), function () use ($tipe, $parentId) {
                return $this->queryDasar($tipe, $parentId)
                    ->get(['id', 'nama', 'tipe', 'kode', 'parent_id'])
                    ->values()
                    ->toArray();
            });

            return response()->json([
                'success' => true,
                'message' => 'OK',
                'data' => $data,
            ]);
        }

        $query = $this->queryDasar($tipe, $parentId);
        $this->saringCari($query, ['nama', 'kode'], $request);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $query->get(['id', 'nama', 'tipe', 'kode', 'parent_id']),
        ]);
    }

    private function queryDasar(string $tipe, string $parentId)
    {
        $query = Wilayah::orderByRaw('parent_id IS NULL DESC')->orderBy('nama');

        if ($tipe !== '') {
            $query->where('tipe', $tipe);
        }

        if ($parentId !== '') {
            $query->where('parent_id', $parentId);
        }

        return $query;
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
