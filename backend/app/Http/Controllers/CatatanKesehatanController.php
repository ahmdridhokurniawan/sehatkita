<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\Pengguna;
use App\Models\Rujukan;
use App\Services\HealthCalculatorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CatatanKesehatanController extends Controller
{
    public function __construct(private HealthCalculatorService $kalkulator) {}

    // Daftar catatan kesehatan
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = CatatanKesehatan::with(['pengguna.profil', 'pengguna.wilayah:id,nama', 'pencatat']);

        if ($user->role === 'user') {
            // Warga hanya dapat melihat catatannya sendiri
            if ($request->filled('user_id') && (int) $request->user_id !== $user->id) {
                abort(404, 'Catatan tidak ditemukan');
            }
            $query->where('user_id', $user->id);

        } elseif ($user->role === 'kader') {
            // Kader hanya dapat melihat warga binaan atau wilayah kerjanya
            if ($request->filled('user_id')) {
                $target = Pengguna::find($request->user_id);
                abort_unless($target && $this->dalamBinaan($user, $target), 404, 'Catatan tidak ditemukan');
                $query->where('user_id', $target->id);
            } else {
                $query->whereHas('pengguna', fn ($q) => $this->scopeBinaan($q, $user));
            }

        } elseif ($user->role === 'admin_kelurahan') {
            // Admin kelurahan melihat catatan warga kelurahannya (read-only)
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));

        } elseif ($user->role === 'super_admin') {
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }
        } else {
            abort(403, 'Akses ditolak');
        }

        if ($request->filled('sumber')) {
            $query->where('sumber', $request->sumber);
        }

        // Filter tanggal §7.3
        if ($request->filled('dari')) {
            $query->whereDate('dicatat_pada', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $query->whereDate('dicatat_pada', '<=', $request->sampai);
        }

        // `indikator` boleh multi; imt turunan bb_kg + tinggi snapshot.
        if ($request->filled('indikator')) {
            $diminta = array_map('trim', explode(',', $request->indikator));

            if (in_array('imt', $diminta, true)) {
                $diminta = [...$diminta, 'bb_kg'];
            }

            $boleh = ['bb_kg', 'sistol', 'diastol', 'gula_darah', 'kolesterol', 'asam_urat', 'lingkar_perut', 'tidur_jam'];
            $indikator = array_values(array_intersect($diminta, $boleh));

            if ($indikator !== []) {
                $query->where(function ($q) use ($indikator) {
                    foreach ($indikator as $ind) {
                        $q->orWhereNotNull($ind);
                    }
                });
            }
        }

        // `search` pada kolom teks yang ada.
        $this->saringCari($query, ['catatan', 'sumber'], $request);

        $query->orderBy('dicatat_pada', 'desc')->orderBy('id', 'desc');
        $catatan = $query->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'Daftar catatan kesehatan',
            'data'    => collect($catatan->items())->map(fn ($c) => $this->bentukResponse($c))->values(),
            'meta'    => $this->metaPaginasi($catatan),
        ]);
    }

    // Simpan catatan kesehatan baru
    public function store(Request $request)
    {
        $user = $request->user();

        // Validasi input
        $data = $request->validate([
            'dicatat_pada'     => 'required|date|before_or_equal:today',
            'sumber'           => 'required|in:mandiri,kader,puskesmas',
            'bb_kg'            => 'nullable|numeric|gt:0|max:500',
            'tinggi_cm'        => 'nullable|numeric|min:50|max:250',
            'sistol'           => 'nullable|integer|gt:0|max:400',
            'diastol'          => 'nullable|integer|gt:0|max:300',
            'gula_darah'       => 'nullable|integer|gt:0|max:1500',
            'jenis_gula_darah' => 'nullable|in:puasa,2jam_pp',
            'kolesterol'       => 'nullable|integer|gt:0|max:1500',
            'asam_urat'        => 'nullable|numeric|gt:0|max:50',
            'lingkar_perut'    => 'nullable|numeric|gt:0|max:300',
            'tidur_jam'        => 'nullable|numeric|min:0|max:24',
            'merokok'          => 'nullable|boolean',
            'konsumsi_manis'   => 'nullable|in:jarang,sering,setiap_hari',
            'catatan'          => 'nullable|string',
            'user_id'          => 'sometimes|integer|exists:pengguna,id',
            'sesi_posbindu_id' => 'sometimes|integer|exists:sesi_posbindu,id',
        ]);

        // Cek kelengkapan indikator
        $this->validasiKelengkapan($data);

        // Validasi persetujuan pengguna
        $pemilik = $this->tentukanPemilik($user, $data);

        if ($data['sumber'] !== 'puskesmas' && $pemilik->consent_at === null) {
            throw ValidationException::withMessages([
                'consent' => ['Persetujuan data belum diberikan.'],
            ]);
        }

        // Tentukan tinggi badan efektif
        $profil = $pemilik->profil;
        $tinggiEfektif = $profil?->tinggi_cm !== null
            ? (float) $profil->tinggi_cm
            : (isset($data['tinggi_cm']) ? (float) $data['tinggi_cm'] : null);

        // Snapshot kategori saat penyimpanan
        $snapshot = $this->kalkulator->snapshot($data, $tinggiEfektif);

        $isi = array_merge($data, $snapshot, [
            'user_id'      => $pemilik->id,
            'wilayah_id'   => $pemilik->wilayah_id,
            'dicatat_oleh' => $user->id,
        ]);

        if ($profil?->tinggi_cm !== null) {
            unset($isi['tinggi_cm']);
        }

        $isi['perlu_verifikasi'] = $this->kalkulator->perluVerifikasi($data);

        $catatan = DB::transaction(function () use ($isi, $data, $pemilik) {
            $baris = CatatanKesehatan::create($isi);

            $baris->status_kesehatan = $this->kalkulator->statusKesehatan($baris);
            $baris->skor_risiko      = $this->kalkulator->skorRisiko($baris);
            $baris->save();

            // Rujukan otomatis untuk data wajar
            if (! $baris->perlu_verifikasi) {
                $this->buatRujukanOtomatis($baris, $pemilik);
            }

            return $baris;
        });

        return response()->json([
            'success' => true,
            'message' => 'Catatan kesehatan berhasil disimpan',
            'data'    => $this->bentukResponse($catatan->fresh(['pencatat', 'pengguna.profil', 'pengguna.wilayah:id,nama'])),
        ], 201);
    }

    // Detail catatan kesehatan
    public function show(Request $request, $id)
    {
        $user = $request->user();

        $catatan = CatatanKesehatan::with(['pengguna.profil', 'pengguna.wilayah:id,nama', 'pencatat'])->find($id);
        abort_unless($catatan, 404, 'Catatan tidak ditemukan');

        $boleh = match ($user->role) {
            'user'            => $catatan->user_id === $user->id,
            'kader'           => $catatan->pengguna && $this->dalamBinaan($user, $catatan->pengguna),
            'admin_kelurahan' => $catatan->pengguna && (int) $catatan->pengguna->wilayah_id === (int) $user->wilayah_id,
            'super_admin'     => true,
            default           => false,
        };

        abort_unless($boleh, 404, 'Catatan tidak ditemukan');

        return response()->json([
            'success' => true,
            'message' => 'Detail catatan kesehatan',
            'data'    => $this->bentukResponse($catatan),
        ]);
    }

    // Hapus catatan kesehatan (soft delete)
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $catatan = CatatanKesehatan::with('pengguna')->find($id);
        abort_unless($catatan, 404, 'Catatan tidak ditemukan');

        $boleh = match ($user->role) {
            'user'        => $catatan->user_id === $user->id,
            'kader'       => $catatan->pengguna && $this->dalamBinaan($user, $catatan->pengguna),
            'super_admin' => true,
            default       => false,
        };

        abort_unless($boleh, 404, 'Catatan tidak ditemukan');

        $catatan->delete();

        return response()->json(['success' => true, 'message' => 'Catatan berhasil dihapus', 'data' => null]);
    }

    // Daftar catatan yang membutuhkan verifikasi super admin
    public function perluVerifikasiList(Request $request)
    {
        abort_unless($request->user()->role === 'super_admin', 403, 'Hanya super admin.');

        $query = CatatanKesehatan::with(['pengguna:id,name,email,wilayah_id', 'pengguna.wilayah:id,nama'])
            ->where('perlu_verifikasi', true);

        if ($request->filled('wilayah_id')) {
            $wilayahId = (int) $request->query('wilayah_id');
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $wilayahId));
        }

        $list = $query->orderByDesc('dicatat_pada')
            ->paginate((int) $request->query('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => collect($list->items())->map(fn ($c) => $this->bentukResponse($c))->values(),
            'meta'    => [
                'current_page' => $list->currentPage(),
                'last_page'    => $list->lastPage(),
                'per_page'     => $list->perPage(),
                'total'        => $list->total(),
            ],
        ]);
    }

    // Tindak lanjut verifikasi catatan kesehatan oleh super admin
    public function verifikasi(Request $request, $id)
    {
        abort_unless($request->user()->role === 'super_admin', 403, 'Hanya super admin.');

        $data = $request->validate(['setuju' => 'required|boolean']);

        $catatan = CatatanKesehatan::find($id);
        abort_unless($catatan, 404, 'Catatan tidak ditemukan');

        if ($data['setuju']) {
            $catatan->update(['perlu_verifikasi' => false]);
            $pesan = 'Catatan diverifikasi dan masuk agregat.';
        } else {
            $catatan->delete();
            $pesan = 'Catatan ditolak dan dihapus.';
        }

        return response()->json([
            'success' => true,
            'message' => $pesan,
            'data'    => null,
        ]);
    }

    // Validasi kelengkapan indikator pengukuran
    private function validasiKelengkapan(array $data): void
    {
        $ukur = ['bb_kg', 'sistol', 'diastol', 'gula_darah', 'kolesterol', 'asam_urat', 'lingkar_perut', 'tidur_jam'];

        $ada = collect($ukur)->contains(fn ($k) => isset($data[$k]) && $data[$k] !== null);

        if (! $ada) {
            throw ValidationException::withMessages([
                'pengukuran' => ['Minimal satu pengukuran harus diisi.'],
            ]);
        }

        $sistol  = $data['sistol'] ?? null;
        $diastol = $data['diastol'] ?? null;

        if (($sistol === null) !== ($diastol === null)) {
            throw ValidationException::withMessages([
                'sistol' => ['Sistol dan diastol harus diisi berpasangan.'],
            ]);
        }

        if (($data['gula_darah'] ?? null) !== null && ($data['jenis_gula_darah'] ?? null) === null) {
            throw ValidationException::withMessages([
                'jenis_gula_darah' => ['Jenis gula darah wajib diisi bila gula darah diukur.'],
            ]);
        }
    }

    /** Siapa pemilik catatan (user sendiri / warga binaan / pilihan super_admin). */
    private function tentukanPemilik($user, array $data): Pengguna
    {
        if ($data['sumber'] === 'mandiri') {
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

            return $pemilik;
        }

        return $user;
    }

    /** Scope kader: binaan langsung (kader_id) atau satu wilayah kerja. */
    private function scopeBinaan($query, Pengguna $kader)
    {
        return $query->where('role', 'user')
            ->where(function ($q) use ($kader) {
                $q->where('kader_id', $kader->id)
                  ->orWhereNull('kader_id');   // belum ditetapkan → wilayah kerja
            })
            ->where('wilayah_id', $kader->wilayah_id);
    }

    private function dalamBinaan(Pengguna $kader, Pengguna $warga): bool
    {
        if ($warga->kader_id !== null) {
            return (int) $warga->kader_id === (int) $kader->id;
        }

        return (int) $warga->wilayah_id === (int) $kader->wilayah_id;
    }

    // Buat rujukan otomatis jika indikator memenuhi ambang batas rujukan
    private function buatRujukanOtomatis(CatatanKesehatan $catatan, Pengguna $pemilik): void
    {
        $pemicu = $this->kalkulator->indikatorMemicuRujukan($catatan);

        if ($pemicu === []) {
            return;
        }

        $faskesId = $this->cariPuskesmas($pemilik);

        if (! $faskesId) {
            return;
        }

        foreach ($pemicu as $indikator) {
            $nama = in_array($indikator, ['sistol', 'diastol'], true) ? 'tensi' : $indikator;

            $sudahAda = Rujukan::where('user_id', $pemilik->id)
                ->where('indikator', $nama)
                ->whereIn('status', ['baru', 'dihubungi'])
                ->exists();

            if ($sudahAda) {
                continue;
            }

            Rujukan::create([
                'user_id'     => $pemilik->id,
                'faskes_id'   => $faskesId,
                'alasan'      => 'Rujukan ini saran sistem, bukan diagnosis medis.',
                'dibuat_oleh' => null,
                'status'      => 'baru',
                'otomatis'    => true,
                'indikator'   => $nama,
            ]);
        }
    }

    // Cari puskesmas di wilayah pengguna atau wilayah induk kecamatan
    private function cariPuskesmas(Pengguna $pemilik): ?int
    {
        if (! $pemilik->wilayah_id) {
            return null;
        }

        $puskesmas = Faskes::where('wilayah_id', $pemilik->wilayah_id)
            ->where('jenis', 'puskesmas')
            ->orderBy('id')
            ->value('id');

        if ($puskesmas) {
            return (int) $puskesmas;
        }

        $induk = DB::table('wilayah')->where('id', $pemilik->wilayah_id)->value('parent_id');

        if (! $induk) {
            return null;
        }

        $id = Faskes::where('wilayah_id', $induk)->where('jenis', 'puskesmas')->orderBy('id')->value('id');

        return $id ? (int) $id : null;
    }

    // Format response catatan kesehatan
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
