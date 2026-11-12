<?php

namespace App\Http\Controllers;

use App\Models\AmbangKategori;
use App\Models\Pengguna;
use App\Models\Program;
use App\Models\Wilayah;
use Illuminate\Http\Request;

// Controller penyaji data ringkas dan statistik halaman depan aplikasi
class LandingPageController extends Controller
{
    // Ambil statistik global pengguna, kelurahan, program aktif, dan rentang IMT
    public function index(Request $request)
    {
        $hero = [
            'logo_url' => url('/assets/logo.svg'),
            'title'    => 'Sistem Monitoring Kesehatan PTM',
            'subtitle' => 'Pantau kesehatan, tingkatkan kesejahteraan',
        ];

        $totalPengguna = Pengguna::count();
        $totalWilayah  = Wilayah::count();
        $totalProgram  = Program::sedangBerjalan()->count();

        // Ambil batas kategori IMT langsung dari tabel ambang resmi
        $imtKategori = AmbangKategori::with('indikator:id,kode')
            ->whereHas('indikator', fn ($q) => $q->where('kode', 'imt'))
            ->orderBy('batas_min')
            ->get()
            ->map(fn ($row) => [
                'kategori' => $row->kategori,
                'rentang'  => $row->batas_min . ' – ' . ($row->batas_max ?? '∞'),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Landing page data',
            'data'    => [
                'hero'         => $hero,
                'statistics'   => [
                    'pengguna' => $totalPengguna,
                    'wilayah'  => $totalWilayah,
                    'program'  => $totalProgram,
                ],
                'imt_kategori' => $imtKategori,
            ],
        ]);
    }
}
