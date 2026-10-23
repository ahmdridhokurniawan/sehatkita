<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use App\Models\Wilayah;
use App\Models\Program;
use Illuminate\Http\Request;

/**
 * Landing Page (kontrak 19)
 * ---------------------------------
 * Menyajikan data‑ringkasan yang dipakai halaman depan
 * – hero (logo & tagline)  
 * – statistik utama (jumlah user, wilayah, program aktif)  
 * – info singkat tentang kategori IMT (dari seeder)
 * Response dibungkus dalam envelope standar API.
 */
class LandingPageController extends Controller
{
    /**
     * GET /api/v1/landing-page
     */
    public function index(Request $request)
    {
        // 1️⃣ Hero & judul – dapat di‑hard‑code atau di‑ambil dari config.
        $hero = [
            'logo_url'   => url('/assets/logo.svg'),               // sesuaikan path bila berbeda
            'title'     => 'Sistem Monitoring Kesehatan PTM',
            'subtitle'  => 'Pantau kesehatan, tingkatkan kesejahteraan',
        ];

        // 2️⃣ Statistik global
        $totalPengguna   = Pengguna::count();      // semua user terdaftar
        $totalWilayah    = Wilayah::count();       // semua kelurahan
        $totalProgram    = Program::where('status', 'berjalan')->count();

        // 3️⃣ Kategori IMT – ambil dari tabel `ambang_kategori` (seeded)
        //    (asumsi model AmbangKategori sudah ada)
        $imtKategori = \DB::table('ambang_kategori')
            ->select('kategori', 'batas_bawah', 'batas_atas')
            ->orderBy('batas_bawah')
            ->get()
            ->map(function ($row) {
                return [
                    'kategori'    => $row->kategori,
                    'rentang'     => $row->batas_bawah . ' – ' . ($row->batas_atas ?? '∞'),
                ];
            });

        // 4️⃣ Payload akhir
        $payload = [
            'hero'        => $hero,
            'statistics'  => [
                'pengguna' => $totalPengguna,
                'wilayah'  => $totalWilayah,
                'program'  => $totalProgram,
            ],
            'imt_kategori' => $imtKategori,
        ];

        // 5️⃣ Envelope standar
        return response()->json([
            'success' => true,
            'message' => 'Landing page data',
            'data'    => $payload,
        ]);
    }
}