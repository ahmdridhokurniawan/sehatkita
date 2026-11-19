<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Models\SesiPosbindu;
use App\Services\BadgeKeaktifanService;
use App\Services\HealthCalculatorService;
use App\Services\RujukanOtomatisService;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// Mengurus pencatatan pemeriksaan kesehatan warga, riwayatnya, dan pengecekan data yang tidak wajar.
class CatatanKesehatanController extends Controller
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private RujukanOtomatisService $rujukanOtomatis,
        private TelegramService $telegram,
        private BadgeKeaktifanService $badges
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = CatatanKesehatan::with(['pengguna.profil', 'pengguna.wilayah:id,nama', 'pencatat']);

        if ($user->role === 'user') {

            if ($request->filled('user_id') && (int) $request->user_id !== $user->id) {
                abort(404, 'Catatan tidak ditemukan');
            }
            $query->where('user_id', $user->id);

        } elseif ($user->role === 'kader') {

            if ($request->filled('user_id')) {
                $target = Pengguna::find($request->user_id);
                abort_unless($target && $this->dalamBinaan($user, $target), 404, 'Catatan tidak ditemukan');
                $query->where('user_id', $target->id);
            } else {
                $query->whereHas('pengguna', fn ($q) => $this->scopeBinaan($q, $user));
            }

        } elseif ($user->role === 'admin_kelurahan') {

            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));

        } elseif ($user->role === 'super_admin') {
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            $this->catatAudit(
                $user,
                'baca_data_individu',
                CatatanKesehatan::class,
                $request->filled('user_id') ? (int) $request->user_id : null
            );
        } else {
            abort(403, 'Akses ditolak');
        }

        if ($request->filled('sumber')) {
            $query->where('sumber', $request->sumber);
        }

        if ($request->filled('dari')) {
            $query->whereDate('dicatat_pada', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $query->whereDate('dicatat_pada', '<=', $request->sampai);
        }

        if ($request->filled('indikator')) {
            $diminta = array_map('trim', explode(',', $request->indikator));
            $cariImt = in_array('imt', $diminta, true);
            $boleh = ['bb_kg', 'sistol', 'diastol', 'gula_darah', 'kolesterol', 'asam_urat', 'lingkar_perut', 'tidur_jam'];
            $indikator = array_values(array_intersect($diminta, $boleh));

            if ($cariImt || $indikator !== []) {
                $query->where(function ($q) use ($indikator, $cariImt) {
                    foreach ($indikator as $ind) {
                        $q->orWhereNotNull($ind);
                    }
                    if ($cariImt) {
                        $q->orWhere(function ($sub) {
                            $sub->whereNotNull('bb_kg')
                                ->whereNotNull('tinggi_cm')
                                ->where('tinggi_cm', '>', 0);
                        });
                    }
                });
            }
        }

        $this->saringCari($query, ['catatan', 'sumber'], $request);

        $query->orderBy('dicatat_pada', 'desc')->orderBy('id', 'desc');
        $catatan = $query->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'Daftar catatan kesehatan',
            'data' => collect($catatan->items())->map(fn ($c) => $this->bentukResponse($c))->values(),
            'meta' => $this->metaPaginasi($catatan),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $fieldReadOnly = [
            'imt', 'kategori_imt', 'kategori_tensi', 'kategori_gula_darah',
            'kategori_kolesterol', 'kategori_asam_urat', 'skor_imt', 'skor_tensi',
            'skor_gula_darah', 'skor_kolesterol', 'skor_asam_urat', 'skor_risiko',
            'status_kesehatan', 'perlu_verifikasi', 'dicatat_oleh', 'created_at',
        ];
        foreach ($fieldReadOnly as $field) {
            if ($request->has($field)) {
                throw ValidationException::withMessages([
                    $field => ["Field {$field} dihitung oleh server dan tidak boleh dikirim."],
                ]);
            }
        }

        $batasHariIni = now()->endOfDay()->format('Y-m-d H:i:s');
        $data = $request->validate([
            'dicatat_pada' => ['required', 'date', 'before_or_equal:'.$batasHariIni],
            'sumber' => 'required|in:mandiri,kader,puskesmas',
            'bb_kg' => 'nullable|numeric|gt:0|max:500',
            'tinggi_cm' => 'nullable|numeric|min:50|max:250',
            'sistol' => 'nullable|integer|gt:0|max:400',
            'diastol' => 'nullable|integer|gt:0|max:300',
            'gula_darah' => 'nullable|numeric|gt:0|max:1500',
            'jenis_gula_darah' => 'nullable|in:puasa,sewaktu,2jam_pp,hba1c',
            'kolesterol' => 'nullable|integer|gt:0|max:1500',
            'asam_urat' => 'nullable|numeric|gt:0|max:50',
            'lingkar_perut' => 'nullable|numeric|gt:0|max:300',
            'tidur_jam' => 'nullable|numeric|min:0|max:24',
            'merokok' => 'nullable|boolean',
            'konsumsi_manis' => 'nullable|in:jarang,sering,setiap_hari',
            'catatan' => 'nullable|string',
            'user_id' => 'sometimes|integer|exists:pengguna,id',
            'sesi_posbindu_id' => 'sometimes|integer|exists:sesi_posbindu,id',
        ], [
            'dicatat_pada.before_or_equal' => 'Tanggal pencatatan tidak boleh melebihi hari ini.',
        ]);

        $this->validasiKelengkapan($data);
        if (($data['gula_darah'] ?? null) === null) {
            $data['jenis_gula_darah'] = null;
        }

        $pemilik = $this->tentukanPemilik($user, $data);

        if ($data['sumber'] !== 'puskesmas' && $pemilik->consent_at === null) {
            throw ValidationException::withMessages([
                'consent' => ['Persetujuan data belum diberikan.'],
            ]);
        }

        $profil = $pemilik->profil;
        if (($data['tinggi_cm'] ?? null) !== null && $profil?->tinggi_cm !== null) {
            throw ValidationException::withMessages([
                'tinggi_cm' => ['Tinggi badan sudah tersimpan di profil warga dan tidak boleh dikirim ulang.'],
            ]);
        }

        $tinggiEfektif = $profil?->tinggi_cm !== null
            ? (float) $profil->tinggi_cm
            : (isset($data['tinggi_cm']) ? (float) $data['tinggi_cm'] : null);

        $snapshot = $this->kalkulator->snapshot($data, $tinggiEfektif);

        $isi = array_merge($data, $snapshot, [
            'user_id' => $pemilik->id,
            'wilayah_id' => $pemilik->wilayah_id,
            'dicatat_oleh' => $user->id,
        ]);

        $isi['perlu_verifikasi'] = $this->kalkulator->perluVerifikasi($data);

        $catatan = DB::transaction(function () use ($isi, $pemilik) {
            $baris = CatatanKesehatan::create($isi);

            $baris->status_kesehatan = $this->kalkulator->statusKesehatan($baris);
            $baris->skor_risiko = $this->kalkulator->skorRisiko($baris);
            $baris->save();

            if (! $baris->perlu_verifikasi) {
                $this->rujukanOtomatis->buatDariCatatan($baris, $pemilik);
            }

            return $baris;
        });

        if (! $catatan->perlu_verifikasi) {
            $this->badges->evaluasiUntukUser($pemilik);
        }

        if (! $catatan->perlu_verifikasi && in_array($catatan->status_kesehatan, ['perlu_perhatian', 'berisiko'], true)) {
            $statusLabel = ucwords(str_replace('_', ' ', (string) $catatan->status_kesehatan));
            $skorInfo = $catatan->skor_risiko !== null ? "\nSkor risiko PTM: {$catatan->skor_risiko}" : '';

            $this->telegram->kirimNotifikasiUser(
                $pemilik,
                'Peringatan Dini Hasil Pemeriksaan',
                "Halo {$pemilik->name},\n"
                ."Catatan kesehatan terbaru Anda menunjukkan status: {$statusLabel}{$skorInfo}.\n\n"
                .'Pantau pola makan, aktivitas fisik, dan pertimbangkan berkonsultasi ke Puskesmas/Posbindu terdekat.'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Catatan kesehatan berhasil disimpan',
            'data' => $this->bentukResponse($catatan->fresh(['pencatat', 'pengguna.profil', 'pengguna.wilayah:id,nama'])),
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();

        $catatan = CatatanKesehatan::with(['pengguna.profil', 'pengguna.wilayah:id,nama', 'pencatat'])->find($id);
        abort_unless($catatan, 404, 'Catatan tidak ditemukan');

        $boleh = match ($user->role) {
            'user' => $catatan->user_id === $user->id,
            'kader' => $catatan->pengguna && $this->dalamBinaan($user, $catatan->pengguna),
            'admin_kelurahan' => $catatan->pengguna && (int) $catatan->pengguna->wilayah_id === (int) $user->wilayah_id,
            'super_admin' => true,
            default => false,
        };

        abort_unless($boleh, 404, 'Catatan tidak ditemukan');

        if ($user->role === 'super_admin' && $catatan->user_id !== $user->id) {
            $this->catatAudit($user, 'baca_data_individu', CatatanKesehatan::class, $catatan->id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail catatan kesehatan',
            'data' => $this->bentukResponse($catatan),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $catatan = CatatanKesehatan::with('pengguna')->find($id);
        abort_unless($catatan, 404, 'Catatan tidak ditemukan');

        $boleh = match ($user->role) {
            'user' => $catatan->user_id === $user->id,
            'kader' => $catatan->pengguna && $this->dalamBinaan($user, $catatan->pengguna),
            'super_admin' => true,
            default => false,
        };

        abort_unless($boleh, 404, 'Catatan tidak ditemukan');

        $catatan->delete();

        if ($user->role === 'super_admin' && $catatan->user_id !== $user->id) {
            $this->catatAudit($user, 'ubah_data_individu', CatatanKesehatan::class, $catatan->id);
        }

        return response()->json(['success' => true, 'message' => 'Catatan berhasil dihapus', 'data' => null]);
    }

    public function perluVerifikasiList(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['super_admin', 'admin_kelurahan'], 'Hanya admin yang dapat mengakses antrean verifikasi.');

        $query = CatatanKesehatan::with(['pengguna:id,name,email,wilayah_id', 'pengguna.wilayah:id,nama'])
            ->where('perlu_verifikasi', true);

        if ($user->role === 'admin_kelurahan') {
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
        } elseif ($request->filled('wilayah_id')) {
            $wilayahId = (int) $request->query('wilayah_id');
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $wilayahId));
        }

        $list = $query->orderByDesc('dicatat_pada')
            ->orderByDesc('id')
            ->paginate($this->perHalaman($request, 20));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => collect($list->items())->map(fn ($c) => $this->bentukResponse($c))->values(),
            'meta' => $this->metaPaginasi($list),
        ]);
    }

    public function verifikasi(Request $request, $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['super_admin', 'admin_kelurahan'], 'Hanya admin yang dapat memverifikasi catatan.');

        $data = $request->validate(['setuju' => 'required|boolean']);

        $catatan = CatatanKesehatan::with('pengguna:id,wilayah_id')->find($id);
        abort_unless($catatan, 404, 'Catatan tidak ditemukan');

        if ($user->role === 'admin_kelurahan' && $catatan->pengguna?->wilayah_id !== $user->wilayah_id) {
            abort(404, 'Catatan tidak ditemukan');
        }

        if ($data['setuju']) {
            $catatan->update(['perlu_verifikasi' => false]);
            $this->catatAudit($user, 'verifikasi_setujui_catatan', CatatanKesehatan::class, $catatan->id);
            $pesan = 'Catatan diverifikasi dan masuk agregat.';
        } else {
            $catatan->delete();
            $this->catatAudit($user, 'verifikasi_tolak_catatan', CatatanKesehatan::class, $catatan->id);
            $pesan = 'Catatan ditolak dan dihapus.';
        }

        return response()->json([
            'success' => true,
            'message' => $pesan,
            'data' => null,
        ]);
    }

    private function validasiKelengkapan(array $data): void
    {
        $ukur = ['bb_kg', 'sistol', 'diastol', 'gula_darah', 'kolesterol', 'asam_urat', 'lingkar_perut', 'tidur_jam'];

        $ada = collect($ukur)->contains(fn ($k) => isset($data[$k]) && $data[$k] !== null);

        if (! $ada) {
            throw ValidationException::withMessages([
                'pengukuran' => ['Minimal satu pengukuran harus diisi.'],
            ]);
        }

        $sistol = $data['sistol'] ?? null;
        $diastol = $data['diastol'] ?? null;

        if (($sistol === null) !== ($diastol === null)) {
            throw ValidationException::withMessages([
                'sistol' => ['Sistol dan diastol harus diisi berpasangan.'],
            ]);
        }

        if (($data['gula_darah'] ?? null) !== null && ($data['jenis_gula_darah'] ?? null) === null) {
            throw ValidationException::withMessages([
                'jenis_gula_darah' => ['Jenis pemeriksaan gula darah wajib diisi bila gula darah diukur.'],
            ]);
        }

        if (($data['jenis_gula_darah'] ?? null) === 'hba1c' && ($data['gula_darah'] ?? null) !== null && (float) $data['gula_darah'] > 25) {
            throw ValidationException::withMessages([
                'gula_darah' => ['Nilai HbA1c harus antara 0,1% hingga 25%.'],
            ]);
        }
    }

    private function tentukanPemilik($user, array $data): Pengguna
    {
        if ($data['sumber'] === 'mandiri') {
            abort_unless($user->role === 'user', 403, 'Hanya warga yang dapat membuat catatan mandiri.');

            return $user;
        }

        if ($data['sumber'] === 'puskesmas') {
            abort_unless($user->role === 'super_admin', 403, 'Hanya super_admin dapat mencatat sumber puskesmas');

            if (isset($data['user_id'])) {
                return Pengguna::findOrFail($data['user_id']);
            }

            return $user;
        }

        if ($data['sumber'] === 'kader') {
            abort_unless(in_array($user->role, ['kader', 'super_admin'], true), 403, 'Akses ditolak');

            if (! isset($data['user_id'])) {
                throw ValidationException::withMessages([
                    'user_id' => ['user_id wajib untuk sumber kader.'],
                ]);
            }

            $pemilik = Pengguna::findOrFail($data['user_id']);

            if ($user->role === 'kader') {
                abort_unless($this->dalamBinaan($user, $pemilik), 404, 'Warga tidak ditemukan');
            }

            if (! isset($data['sesi_posbindu_id'])) {
                throw ValidationException::withMessages([
                    'sesi_posbindu_id' => ['sesi_posbindu_id wajib untuk sumber kader.'],
                ]);
            }

            $sesi = SesiPosbindu::find($data['sesi_posbindu_id']);
            if (! $sesi || (int) $sesi->wilayah_id !== (int) $pemilik->wilayah_id) {
                throw ValidationException::withMessages([
                    'sesi_posbindu_id' => ['Sesi Posbindu tidak sesuai dengan wilayah warga.'],
                ]);
            }
            if ($user->role === 'kader' && $sesi->kader_id !== null && (int) $sesi->kader_id !== (int) $user->id) {
                abort(404, 'Sesi Posbindu tidak ditemukan');
            }

            return $pemilik;
        }

        return $user;
    }

    private function bentukResponse(CatatanKesehatan $c): array
    {
        return array_merge(
            $c->toArray(),
            $this->kalkulator->rangkum($c),
            [
                'dicatat_oleh' => $c->pencatat
                    ? ['id' => $c->pencatat->id, 'name' => $c->pencatat->name]
                    : null,
            ]
        );
    }
}
