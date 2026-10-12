<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Services\HealthCalculatorService;
use Illuminate\Http\Request;

class CatatanKesehatanController extends Controller
{
    // Inject service lewat constructor (Laravel auto-resolve).
    public function __construct(
        private HealthCalculatorService $kalkulator
    ) {}

    // POST /api/catatan-kesehatan - simpan data baru
    public function store(Request $request)
    {
        // 1. Validasi tipe saja, BUKAN rentang.
        //    Nilai di luar rentang wajar tetap disimpan, tapi ditandai
        //    perlu_verifikasi (kontrak §7.2 + aturan privasi plan).
        $data = $request->validate([
            'dicatat_pada'   => 'required|date',
            'sumber'         => 'required|in:mandiri,kader,puskesmas',
            'bb_kg'          => 'nullable|numeric',
            'sistol'         => 'nullable|integer',
            'diastol'        => 'nullable|integer',
            'gula_darah'     => 'nullable|integer',
            'kolesterol'     => 'nullable|integer',
            'asam_urat'      => 'nullable|numeric',
            'lingkar_perut'  => 'nullable|numeric',
            'tidur_jam'      => 'nullable|integer',
            'merokok'        => 'nullable|boolean',
            'konsumsi_manis' => 'nullable|in:jarang,sering,setiap_hari',
            'catatan'        => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        // 2. Tentukan pemilik & pencatat sesuai sumber (kontrak §7.2).
        //    mandiri     → data milik sendiri, tanpa pencatat
        //    kader/faskes→ milik anggota yang diukur, dicatat oleh user token
        if ($data['sumber'] === 'mandiri') {
            $data['user_id']    = $user->id;
            $data['dicatat_oleh'] = null;
        } else {
            $validasiTambahan = $request->validate([
                'user_id'          => 'required|exists:pengguna,id',
                'sesi_posbindu_id' => 'nullable|exists:sesi_posbindu,id',
            ]);

            $data['user_id']    = $validasiTambahan['user_id'];
            $data['dicatat_oleh'] = $user->id;
            $data['sesi_posbindu_id'] = $validasiTambahan['sesi_posbindu_id'] ?? null;
        }

        // 3. Tandai nilai tidak wajar (dihitung service, bukan di validator).
        $data['perlu_verifikasi'] = $this->kalkulator->perluVerifikasi($data);

        // 4. Simpan. IMT & kategori_* dihitung otomatis lewat accessor model.
        $catatan = CatatanKesehatan::create($data);

        // 5. Eager load relasi: pengguna.profil (untuk imt) & pencatat (§7.2).
        $catatan->load(['pengguna.profil', 'pencatat']);

        return response()->json([
            'success' => true,
            'message' => 'Data kesehatan tersimpan',
            'data'    => $catatan,
        ], 201);
    }

    // GET /api/catatan-kesehatan - riwayat milik sendiri + paginasi
    public function index(Request $request)
    {
        $query = CatatanKesehatan::with('pengguna.profil')
            ->where('user_id', $request->user()->id);

        // Filter opsional: indikator + rentang tanggal (kontrak §7.3)
        if ($request->filled('dari')) {
            $query->where('dicatat_pada', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $query->where('dicatat_pada', '<=', $request->sampai);
        }

        $list = $query->latest('dicatat_pada')->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->items(),
            'meta'    => [
                'page'      => $list->currentPage(),
                'per_page'  => $list->perPage(),
                'total'     => $list->total(),
                'last_page' => $list->lastPage(),
            ],
        ]);
    }
}