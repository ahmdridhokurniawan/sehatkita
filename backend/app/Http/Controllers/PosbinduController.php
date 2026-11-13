<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\KunjunganPosbindu;
use App\Models\Pengguna;
use App\Models\SesiPosbindu;
use App\Services\HealthCalculatorService;
use App\Services\RujukanOtomatisService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// Controller pengelolaan sesi dan pencatatan kunjungan Posbindu
class PosbinduController extends Controller
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private RujukanOtomatisService $rujukanOtomatis
    ) {}

    private const ROLE_ADMIN = ['admin_kelurahan', 'super_admin'];
    private const ROLE_PETUGAS = ['kader', 'admin_kelurahan', 'super_admin'];

    // Ambil daftar sesi Posbindu sesuai wilayah tugas petugas
    public function indexSesi(Request $request)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $query = SesiPosbindu::query()
            ->with('kader:id,name')
            ->withCount([
                'kunjungan as jumlah_peserta',
                'kunjungan as hadir' => fn ($q) => $q->where('hadir', true),
            ]);

        // Petugas non-super admin terkunci pada wilayah kerjanya
        if ($user->role !== 'super_admin') {
            $query->where('wilayah_id', $user->wilayah_id);
        } elseif ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }

        if ($request->filled('dari')) {
            $query->whereDate('tanggal', '>=', $request->dari);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->saringCari($query, ['lokasi', 'catatan'], $request);

        $list = $query->orderByDesc('tanggal')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->getCollection()->map(fn ($s) => $this->bentukSesi($s))->values(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // Buat jadwal sesi Posbindu baru sesuai wilayah admin
    public function storeSesi(Request $request)
    {
        $user = $request->user();
        $this->hanyaAdmin($user);

        // Admin kelurahan otomatis dikunci ke kelurahannya sendiri
        if ($user->role === 'admin_kelurahan') {
            $request->merge(['wilayah_id' => $user->wilayah_id]);
        }

        $data = $request->validate([
            'wilayah_id' => 'required|exists:wilayah,id',
            'tanggal'    => 'required|date',
            'lokasi'     => 'required|string|max:150',
            'kader_id'   => 'nullable|exists:pengguna,id',
            'catatan'    => 'nullable|string',
        ]);

        $sesi = SesiPosbindu::create($data + ['status' => 'akan_datang']);

        return response()->json([
            'success' => true,
            'message' => 'Sesi Posbindu berhasil dibuat',
            'data'    => $this->bentukSesi($sesi->load('kader:id,name')),
        ], 201);
    }

    // Tampilkan detail sesi beserta daftar hadir peserta Posbindu
    public function showSesi(Request $request, int $id)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $sesi = SesiPosbindu::with('kader:id,name')
            ->with(['kunjungan' => fn ($q) => $q->with('pengguna:id,name')])
            ->find($id);

        if (! $sesi) {
            return $this->responTidakDitemukan('Sesi Posbindu tidak ditemukan');
        }

        if ($user->role !== 'super_admin') {
            abort_unless((int) $sesi->wilayah_id === (int) $user->wilayah_id, 403, 'Sesi ini bukan wilayah Anda.');
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'id'             => $sesi->id,
                'wilayah_id'     => $sesi->wilayah_id,
                'tanggal'        => $sesi->tanggal?->toDateString(),
                'lokasi'         => $sesi->lokasi,
                'catatan'        => $sesi->catatan,
                'status'         => $sesi->status,
                'jumlah_peserta' => $sesi->kunjungan->count(),
                'hadir'          => $sesi->kunjungan->where('hadir', true)->count(),
                'kader'          => $sesi->kader
                    ? ['id' => $sesi->kader->id, 'name' => $sesi->kader->name]
                    : null,
                'peserta'        => $user->role === 'admin_kelurahan'
                    ? []
                    : $sesi->kunjungan->map(fn ($k) => [
                        'kunjungan_id' => $k->id,
                        'user_id'      => $k->user_id,
                        'name'         => $k->pengguna?->name,
                        'hadir'        => (bool) $k->hadir,
                        'dicatat'      => $k->catatan_kesehatan_id !== null,
                    ])->values(),
            ],
        ]);
    }

    // Perbarui jadwal atau status sesi Posbindu di wilayah admin
    public function updateSesi(Request $request, int $id)
    {
        $user = $request->user();
        $this->hanyaAdmin($user);

        $sesi = SesiPosbindu::find($id);
        if (! $sesi) {
            return $this->responTidakDitemukan('Sesi Posbindu tidak ditemukan');
        }

        if ($user->role === 'admin_kelurahan') {
            abort_unless((int) $sesi->wilayah_id === (int) $user->wilayah_id, 403, 'Sesi ini bukan wilayah Anda.');
        }

        $data = $request->validate([
            'tanggal'  => 'sometimes|date',
            'lokasi'   => 'sometimes|string|max:150',
            'kader_id' => 'sometimes|nullable|exists:pengguna,id',
            'catatan'  => 'sometimes|nullable|string',
            'status'   => ['sometimes', Rule::in(['akan_datang', 'berjalan', 'selesai'])],
        ]);

        $sesi->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Sesi Posbindu diubah',
            'data'    => $this->bentukSesi($sesi->load('kader:id,name')),
        ]);
    }

    // Catat kehadiran dan hasil pemeriksaan peserta Posbindu
    public function storePeserta(Request $request, int $id)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $sesi = SesiPosbindu::find($id);
        if (! $sesi) {
            return $this->responTidakDitemukan('Sesi Posbindu tidak ditemukan');
        }

        if ($user->role !== 'super_admin') {
            abort_unless((int) $sesi->wilayah_id === (int) $user->wilayah_id, 403, 'Sesi ini bukan wilayah Anda.');
        }

        $data = $request->validate([
            'user_id' => 'required|exists:pengguna,id',
            'hadir'   => 'required|boolean',
            'catatan_kesehatan'                  => 'nullable|array',
            'catatan_kesehatan.bb_kg'            => 'nullable|numeric|gt:0|max:500',
            'catatan_kesehatan.tinggi_cm'        => 'nullable|numeric|min:50|max:250',
            'catatan_kesehatan.sistol'           => 'nullable|integer|gt:0|max:400',
            'catatan_kesehatan.diastol'          => 'nullable|integer|gt:0|max:300',
            'catatan_kesehatan.gula_darah'       => 'nullable|integer|gt:0|max:1500',
            'catatan_kesehatan.jenis_gula_darah' => 'nullable|in:puasa,2jam_pp',
            'catatan_kesehatan.kolesterol'       => 'nullable|integer|gt:0|max:1500',
            'catatan_kesehatan.asam_urat'        => 'nullable|numeric|gt:0|max:50',
            'catatan_kesehatan.lingkar_perut'    => 'nullable|numeric|gt:0|max:300',
            'catatan_kesehatan.tidur_jam'        => 'nullable|numeric|min:0|max:24',
            'catatan_kesehatan.merokok'          => 'nullable|boolean',
            'catatan_kesehatan.konsumsi_manis'   => 'nullable|in:jarang,sering,setiap_hari',
            'catatan_kesehatan.catatan'          => 'nullable|string',
        ]);

        if (! empty($data['catatan_kesehatan'])) {
            $rawCk = $data['catatan_kesehatan'];
            $sistol = $rawCk['sistol'] ?? null;
            $diastol = $rawCk['diastol'] ?? null;
            if (($sistol === null) !== ($diastol === null)) {
                throw ValidationException::withMessages([
                    'catatan_kesehatan.sistol' => ['Sistol dan diastol harus diisi berpasangan.'],
                ]);
            }
            if (($rawCk['gula_darah'] ?? null) !== null && ($rawCk['jenis_gula_darah'] ?? null) === null) {
                throw ValidationException::withMessages([
                    'catatan_kesehatan.jenis_gula_darah' => ['Jenis gula darah wajib diisi bila gula darah diukur.'],
                ]);
            }
            if (($rawCk['gula_darah'] ?? null) === null) {
                $data['catatan_kesehatan']['jenis_gula_darah'] = null;
            }
        }

        if ($user->role !== 'super_admin') {
            $wargaSah = Pengguna::whereKey($data['user_id'])
                ->where('role', 'user')
                ->where('wilayah_id', $sesi->wilayah_id)
                ->exists();
            abort_unless($wargaSah, 404, 'Peserta tidak ditemukan di wilayah sesi ini.');
        }

        if (! $data['hadir'] && ! empty($data['catatan_kesehatan'])) {
            return response()->json([
                'success' => false,
                'message' => 'Peserta tidak hadir, catatan kesehatan ditolak.',
            ], 422);
        }

        if (KunjunganPosbindu::where('sesi_id', $id)->where('user_id', $data['user_id'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Peserta sudah tercatat di sesi ini.',
            ], 422);
        }

        $kunjunganId = null;
        $catatanKesehatanId = null;

        DB::transaction(function () use ($sesi, $user, $data, &$kunjunganId, &$catatanKesehatanId) {
            if ($data['hadir'] && ! empty($data['catatan_kesehatan'])) {
                $warga = Pengguna::with('profil')->findOrFail($data['user_id']);
                $rawCk = $data['catatan_kesehatan'];

                $tinggiEfektif = $warga->profil?->tinggi_cm !== null
                    ? (float) $warga->profil->tinggi_cm
                    : (isset($rawCk['tinggi_cm']) ? (float) $rawCk['tinggi_cm'] : null);

                $snapshot = $this->kalkulator->snapshot($rawCk, $tinggiEfektif);

                $isi = array_merge($rawCk, $snapshot, [
                    'user_id'          => $warga->id,
                    'wilayah_id'       => $warga->wilayah_id ?? $sesi->wilayah_id,
                    'dicatat_oleh'     => $user->id,
                    'dicatat_pada'     => $sesi->tanggal,
                    'sumber'           => 'kader',
                    'sesi_posbindu_id' => $sesi->id,
                    'perlu_verifikasi' => $this->kalkulator->perluVerifikasi($rawCk),
                ]);

                $ck = CatatanKesehatan::create($isi);
                $ck->status_kesehatan = $this->kalkulator->statusKesehatan($ck);
                $ck->skor_risiko      = $this->kalkulator->skorRisiko($ck);
                $ck->save();

                // Buat rujukan faskes otomatis jika nilai terverifikasi wajar namun berisiko kritis
                if (! $ck->perlu_verifikasi) {
                    $this->rujukanOtomatis->buatDariCatatan($ck, $warga);
                }

                $catatanKesehatanId = $ck->id;
            }

            $kunjungan = KunjunganPosbindu::create([
                'sesi_id'              => $sesi->id,
                'user_id'              => $data['user_id'],
                'hadir'                => $data['hadir'],
                'dicatat_oleh'         => $user->id,
                'catatan_kesehatan_id' => $catatanKesehatanId,
            ]);
            $kunjunganId = $kunjungan->id;
        });

        return response()->json([
            'success' => true,
            'message' => 'Peserta ditambahkan',
            'data'    => [
                'kunjungan_id'         => $kunjunganId,
                'user_id'              => $data['user_id'],
                'hadir'                => (bool) $data['hadir'],
                'catatan_kesehatan_id' => $catatanKesehatanId,
            ],
        ], 201);
    }

    // Tampilkan riwayat kunjungan Posbindu sesuai peran dan wilayah pengguna
    public function indexKunjungan(Request $request)
    {
        $user = $request->user();

        $query = KunjunganPosbindu::query()
            ->with(['sesi:id,tanggal,lokasi,wilayah_id', 'pengguna:id,name']);

        if ($user->role === 'user') {
            $query->where('user_id', $user->id);
        } else {
            if ($user->role !== 'super_admin') {
                $query->whereHas('sesi', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
            }
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }
        }

        if ($request->filled('sesi_id')) {
            $query->where('sesi_id', $request->sesi_id);
        }

        $list = $query->latest()->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->getCollection()->map(fn ($k) => [
                'kunjungan_id'         => $k->id,
                'sesi_id'              => $k->sesi_id,
                'tanggal'              => $k->sesi?->tanggal?->toDateString(),
                'lokasi'               => $k->sesi?->lokasi,
                'hadir'                => (bool) $k->hadir,
                'catatan_kesehatan_id' => $k->catatan_kesehatan_id,
            ])->values(),
            'meta' => $this->metaPaginasi($list),
        ]);
    }

    // Hapus jadwal sesi Posbindu jika berada di wilayah tugas admin
    public function destroySesi(Request $request, int $id)
    {
        $this->hanyaAdmin($request->user());

        $sesi = SesiPosbindu::find($id);
        if (! $sesi) {
            return $this->responTidakDitemukan('Sesi Posbindu tidak ditemukan');
        }

        if ($request->user()->role === 'admin_kelurahan') {
            abort_unless(
                (int) $sesi->wilayah_id === (int) $request->user()->wilayah_id,
                403,
                'Sesi ini bukan wilayah Anda.'
            );
        }

        if ($sesi->kunjungan()->whereNotNull('catatan_kesehatan_id')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi yang sudah memiliki catatan kesehatan tidak dapat dihapus.',
            ], 422);
        }

        $sesi->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesi Posbindu dihapus',
            'data'    => null,
        ]);
    }

    // Format ringkasan satu sesi Posbindu untuk daftar maupun detail
    private function bentukSesi(SesiPosbindu $s): array
    {
        return [
            'id'             => $s->id,
            'wilayah_id'     => $s->wilayah_id,
            'tanggal'        => $s->tanggal?->toDateString(),
            'lokasi'         => $s->lokasi,
            'status'         => $s->status ?? 'akan_datang',
            'kader'          => $s->kader
                ? ['id' => $s->kader->id, 'name' => $s->kader->name]
                : null,
            'catatan'        => $s->catatan,
            'jumlah_peserta' => (int) ($s->jumlah_peserta ?? 0),
            'hadir'          => (int) ($s->hadir ?? 0),
        ];
    }

    // Batasi pengelolaan jadwal sesi hanya untuk admin kelurahan atau super admin
    private function hanyaAdmin($user): void
    {
        $this->wajibPeran($user, self::ROLE_ADMIN, 'Hanya admin kelurahan atau super admin yang boleh mengelola sesi Posbindu.');
    }

    // Batasi akses Posbindu hanya untuk kader atau admin
    private function hanyaPetugas($user): void
    {
        $this->wajibPeran($user, self::ROLE_PETUGAS, 'Hanya kader atau admin kelurahan yang berhak mengelola Posbindu.');
    }

    // Cari warga aktif berdasarkan awalan NIK minimal 3 digit untuk autocomplete
    public function cariNik(Request $request)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $nik = trim((string) ($request->query('nik') ?? $request->query('q') ?? ''));
        $nikBersih = preg_replace('/[^0-9]/', '', $nik);

        if (strlen($nikBersih) < 3) {
            return response()->json([
                'success' => true,
                'message' => 'Ketik minimal 3 digit NIK',
                'data'    => [],
            ]);
        }

        $hasil = Pengguna::query()
            ->select('id', 'name', 'nik', 'wilayah_id')
            ->with('wilayah:id,nama')
            ->where('role', 'user')
            ->where('aktif', true)
            ->when($user->role !== 'super_admin', fn ($q) => $q->where('wilayah_id', $user->wilayah_id))
            ->whereNotNull('nik')
            ->where('nik', 'like', "{$nikBersih}%")
            ->orderBy('nik', 'asc')
            ->limit(10)
            ->get()
            ->map(fn ($p) => [
                'id'         => $p->id,
                'name'       => $p->name,
                'nik'        => $p->nik,
                'wilayah_id' => $p->wilayah_id,
                'wilayah'    => $p->wilayah?->nama,
            ]);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $hasil,
        ]);
    }
}