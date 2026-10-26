<?php

namespace App\Http\Controllers;

use App\Services\InsightService;
use Illuminate\Http\Request;

class InsightController extends Controller
{
    public function __construct(
        private InsightService $insight
    ) {}

    // GET /api/v1/insight?level=bahaya (Kontrak 29)
    public function index(Request $request)
    {
        $level = $request->query('level'); // info | peringatan | bahaya
        $data  = $this->insight->untukUser($request->user());

        if ($level) {
            $data = array_values(array_filter($data, fn ($i) => $i['level'] === $level));
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $data,
        ]);
    }

    /**
     * GET /insight/ambang — tabel ambang_kategori (read-only).
     *
     * Dipakai halaman Insight untuk menjelaskan **kapan** sebuah indikator
     * masuk kategori aman / siaga / bahaya. Sumber angkanya sama persis
     * dengan yang dipakai HealthCalculatorService, jadi penjelasan di UI
     * tidak bisa berbeda dari perhitungan sebenarnya.
     */
    public function ambang()
    {
        $data = \App\Models\AmbangKategori::query()
            ->with('indikator:id,kode,nama,satuan')
            ->orderBy('indikator_id')
            ->orderBy('batas_min')
            ->get()
            ->map(fn ($a) => [
                'kode'            => $a->indikator?->kode,
                'nama'            => $a->indikator?->nama,
                'satuan'          => $a->indikator?->satuan,
                'kategori'        => $a->kategori,
                'status'          => $a->status,
                'batas_min'       => $a->batas_min !== null ? (float) $a->batas_min : null,
                'batas_max'       => $a->batas_max !== null ? (float) $a->batas_max : null,
                'skor'            => (int) $a->skor,
                'memicu_rujukan'  => (bool) $a->memicu_rujukan,
                'jenis_gula_darah' => $a->jenis_gula_darah ?? null,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $data,
        ]);
    }
}
