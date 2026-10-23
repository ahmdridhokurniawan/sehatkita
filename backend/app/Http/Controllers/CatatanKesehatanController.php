<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\Pengguna;
use App\Models\Rujukan;
use App\Services\HealthCalculatorService;
use App\Services\InsightService;
use Illuminate\Http\Request;

class CatatanKesehatanController extends Controller
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private InsightService $insight
    ) {}

    // GET /api/v1/catatan-kesehatan (Kontrak 7.3)
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = CatatanKesehatan::with('pengguna.profil');

        if ($user->role === 'user') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'kader') {
            // Kader: hanya wilayah kerjanya, boleh pilih user_id di wilayah itu.
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }
        } else {
            abort(403, 'Akses ditolak');
        }

        if ($request->filled('sumber')) {
            $query->where('sumber', $request->sumber);
        }

        if ($request->filled('indikator')) {
            // Hanya kolom yang benar-benar ada; nama lain dibuang supaya
            // tidak menghasilkan "Unknown column" di SQL.
            $boleh = ['bb_kg', 'sistol', 'diastol', 'gula_darah', 'kolesterol', 'asam_urat', 'lingkar_perut', 'tidur_jam'];
            $diminta = array_map('trim', explode(',', $request->indikator));

            // imt tidak disimpan di tabel; sumbernya bb_kg + tinggi profil.
            if (in_array('imt', $diminta, true)) {
                $diminta[] = 'bb_kg';
            }

            $indikator = array_values(array_intersect($diminta, $boleh));

            if ($indikator !== []) {
                $query->where(function ($q) use ($indikator) {
                    foreach ($indikator as $ind) {
                        $q->orWhereNotNull($ind);
                    }
                });
            }
        }

        $query->orderBy('dicatat_pada', 'desc');
        $catatan = $query->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'Daftar catatan kesehatan',
            'data'    => $catatan->items(),
            'meta'    => $this->metaPaginasi($catatan),
        ]);
    }

    // POST /api/v1/catatan-kesehatan (Kontrak 7.2)
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'dicatat_pada'  => 'required|date',
            'sumber'        => 'required|in:mandiri,kader',
            'bb_kg'         => 'nullable|numeric|min:10|max:300',
            'sistol'        => 'nullable|integer|min:50|max:250',
            'diastol'       => 'nullable|integer|min:30|max:150',
            'gula_darah'    => 'nullable|integer|min:30|max:600',
            'jenis_gula_darah' => 'nullable|in:puasa,2jam_pp',
            'kolesterol'    => 'nullable|integer|min:50|max:600',
            'asam_urat'     => 'nullable|numeric|min:1|max:30',
            'lingkar_perut' => 'nullable|numeric|min:30|max:200',
            'tidur_jam'     => 'nullable|numeric|min:0|max:24',
            'konsumsi_manis' => 'nullable|in:rendah,sedang,tinggi',
            'catatan'       => 'nullable|string',
        ]);

        if ($data['sumber'] === 'mandiri') {
            $data['user_id']      = $user->id;
            $data['dicatat_oleh'] = $user->id;
        } else {
            // sumber = kader
            abort_unless(in_array($user->role, ['kader', 'admin_kelurahan', 'super_admin']), 403, 'Hanya kader yang dapat memilih sumber kader');

            $tambahan = $request->validate([
                'user_id'          => 'required|exists:pengguna,id',
                'sesi_posbindu_id' => 'required|exists:sesi_posbindu,id',
            ]);

            $data['user_id']          = $tambahan['user_id'];
            $data['sesi_posbindu_id'] = $tambahan['sesi_posbindu_id'];
            $data['dicatat_oleh']     = $user->id;
        }

        // Cek Verifikasi & Outlier
        $data['perlu_verifikasi'] = $this->kalkulator->perluVerifikasi($data);

        $catatan = CatatanKesehatan::create($data);

        // Auto rujukan bila ada insight level bahaya.
        // Insight dihitung untuk PEMILIK catatan, bukan petugas pencatat.
        $pemilik  = Pengguna::find($data['user_id']) ?? $user;
        $insights = $this->insight->untukUser($pemilik);

        // Faskes sedekat mungkin: utamakan wilayah pemilik, lalu faskes mana pun.
        $faskesId = Faskes::query()
            ->when($pemilik->wilayah_id, fn ($q, $w) => $q->where('wilayah_id', $w))
            ->orderBy('id')
            ->value('id') ?? Faskes::orderBy('id')->value('id');

        foreach ($insights as $i) {
            if ($i['level'] !== 'bahaya' || ! $faskesId) {
                continue;
            }

            // firstOrCreate mencegah rujukan ganda untuk orang yang sama.
            Rujukan::firstOrCreate(
                [
                    'user_id'   => $data['user_id'],
                    'faskes_id' => $faskesId,
                    'status'    => 'baru',
                ],
                [
                    'alasan'      => $i['teks'],
                    'dibuat_oleh' => $user->id,
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Catatan kesehatan berhasil disimpan',
            'data'    => $catatan,
        ], 201);
    }

    // GET /api/v1/catatan-kesehatan/{id} (Kontrak 7.4)
    public function show(Request $request, $id)
    {
        $user = $request->user();

        $catatan = CatatanKesehatan::with(['pengguna.profil', 'pencatat'])->find($id);
        abort_unless($catatan, 404, 'Catatan tidak ditemukan');

        // Di luar scope = 404, bukan 403 (kontrak 7.4).
        if ($user->role === 'user' && $catatan->user_id !== $user->id) {
            abort(404, 'Catatan tidak ditemukan');
        }

        if ($user->role === 'kader'
            && $catatan->pengguna?->wilayah_id !== $user->wilayah_id) {
            abort(404, 'Catatan tidak ditemukan');
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail catatan kesehatan',
            'data'    => $catatan,
        ]);
    }

    // DELETE /api/v1/catatan-kesehatan/{id} (Kontrak 7.5)
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $catatan = CatatanKesehatan::find($id);
        abort_unless($catatan, 404, 'Catatan tidak ditemukan');

        // Matriks 16: hapus hanya super_admin atau pemilik catatan.
        $boleh = $user->role === 'super_admin'
            || ($user->role === 'user' && $catatan->user_id === $user->id);

        abort_unless($boleh, 403, 'Akses ditolak');

        $catatan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Catatan berhasil dihapus',
        ]);
    }
}