<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Services\HealthCalculatorService;
use App\Services\InsightService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CatatanKesehatanController extends Controller
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private InsightService $insight
    ) {}

    // GET /api/v1/catatan-kesehatan
    public function index(Request $request)
    {
        $user = $request->user();
        $query = CatatanKesehatan::with('pengguna.profil');

        // hak akses berdasarkan role
        if ($user->role === 'user') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'kader') {
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }
        } else {
            abort(403, 'Akses ditolak');
        }

        // filter sumber
        if ($request->filled('sumber')) {
            $query->where('sumber', $request->sumber);
        }

        // filter indikator
        if ($request->filled('indikator')) {
            $allowed = ['bb_kg','sistol','diastol','gula_darah','kolesterol','asam_urat','lingkar_perut','tidur_jam'];
            $requested = array_map('trim', explode(',', $request->indikator));
            if (in_array('imt', $requested, true)) $requested[] = 'bb_kg';
            $indikator = array_values(array_intersect($requested, $allowed));
            if ($indikator !== []) {
                $query->where(function ($q) use ($indikator) {
                    foreach ($indikator as $ind) {
                        $q->orWhereNotNull($ind);
                    }
                });
            }
        }

        // pagination (max 100) – perHalaman() diwariskan dari base Controller
        $perPage = $this->perHalaman($request, 15);
        $list = $query->orderByDesc('dicatat_pada')->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Daftar catatan kesehatan',
            'data'    => [
                'catatan'  => $list->items(),
                'paginasi'=> $this->metaPaginasi($list),
            ],
        ]);
    }

    // POST /api/v1/catatan-kesehatan
    public function store(Request $request)
    {
        $user = $request->user();

        // validasi input (kontrak §7.2)
        $validated = $request->validate([
            'dicatat_pada'    => 'required|date',
            'sumber'          => 'required|in:mandiri,kader,puskesmas',
            'bb_kg'           => 'nullable|numeric|min:0',
            'lingkar_perut'   => 'nullable|numeric|min:0',
            'sistol'          => 'nullable|integer|min:0',
            'diastol'         => 'nullable|integer|min:0',
            'gula_darah'      => 'nullable|integer|min:0',
            'jenis_gula_darah'=> 'nullable|in:puasa,2jam_pp',
            'kolesterol'      => 'nullable|integer|min:0',
            'asam_urat'       => 'nullable|numeric|min:0',
            'tidur_jam'       => 'nullable|integer|min:0',
            'merokok'         => 'nullable|boolean',
            'konsumsi_manis'  => 'required|in:jarang,sering,setiap_hari',
        ]);

        // cek consent data
        if (is_null($user->consent_at)) {
            throw ValidationException::withMessages([
                'consent' => ['Persetujuan data belum diberikan.'],
            ]);
        }

        // simpan catatan dalam transaction
        $catatan = DB::transaction(fn () => CatatanKesehatan::create([
            'user_id'        => $user->id,
            'dicatat_oleh'   => $user->id,
            'dicatat_pada'   => $validated['dicatat_pada'],
            'sumber'         => $validated['sumber'],
            'bb_kg'          => $validated['bb_kg'] ?? null,
            'lingkar_perut'  => $validated['lingkar_perut'] ?? null,
            'sistol'         => $validated['sistol'] ?? null,
            'diastol'        => $validated['diastol'] ?? null,
            'gula_darah'     => $validated['gula_darah'] ?? null,
            'jenis_gula_darah'=> $validated['jenis_gula_darah'] ?? null,
            'kolesterol'     => $validated['kolesterol'] ?? null,
            'asam_urat'      => $validated['asam_urat'] ?? null,
            'tidur_jam'      => $validated['tidur_jam'] ?? null,
            'merokok'        => $validated['merokok'] ?? null,
            'konsumsi_manis' => $validated['konsumsi_manis'],
            'wilayah_id'     => $user->wilayah_id,
        ]));

        // hitung skor & risiko
        $catatan->imt  = $this->kalkulator->hitungIMT($catatan);
        $catatan->risk = $this->insight->analisaRisiko($catatan);
        $catatan->save();

        return response()->json([
            'success' => true,
            'message' => 'Catatan kesehatan berhasil disimpan',
            'data'    => $catatan,
        ], 201);
    }

    // GET /api/v1/catatan-kesehatan/{id}
    public function show(CatatanKesehatan $catatan)
    {
        $catatan->load('pengguna.profil');
        return response()->json([
            'success' => true,
            'message' => 'Detail catatan kesehatan',
            'data'    => $catatan,
        ]);
    }

    // DELETE /api/v1/catatan-kesehatan/{id}
    public function destroy(CatatanKesehatan $catatan)
    {
        $catatan->delete();
        return response()->json([
            'success' => true,
            'message' => 'Catatan kesehatan dihapus',
            'data'    => null,
        ]);
    }
}