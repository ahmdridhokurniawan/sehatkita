<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\KunjunganPosbindu;
use App\Models\Pengguna;
use App\Models\SesiPosbindu;
use App\Services\HealthCalculatorService;
use App\Services\RujukanOtomatisService;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// Controller pengelolaan sesi dan pencatatan kunjungan Posbindu
class PosbinduController extends Controller
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private RujukanOtomatisService $rujukanOtomatis,
        private TelegramService $telegram
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

        // Admin kelurahan melihat sesi kelurahannya; kader melihat sesi miliknya atau sesi kelurahannya yang belum ditugaskan ke kader lain (§10.1)
        if ($user->role === 'admin_kelurahan') {
            $query->where('wilayah_id', $user->wilayah_id);
        } elseif ($user->role === 'kader') {
            $query->where('wilayah_id', $user->wilayah_id)
                ->where(fn ($q) => $q->where('kader_id', $user->id)->orWhereNull('kader_id'));
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

        $this->validasiKaderWilayah($data['kader_id'] ?? null, (int) $data['wilayah_id']);

        $sesi = SesiPosbindu::create($data + ['status' => 'akan_datang']);

        $tanggalLabel = $sesi->tanggal?->format('d-m-Y') ?? (string) $data['tanggal'];
        $catatanTambahan = $sesi->catatan ? "\nCatatan: {$sesi->catatan}" : '';
        $this->telegram->siarkanKeWilayah(
            (int) $sesi->wilayah_id,
            'Jadwal Sesi Posbindu Baru',
            "Telah dijadwalkan pemeriksaan kesehatan Posbindu di kelurahan Anda.\n"
            . "Tanggal: {$tanggalLabel}\n"
            . "Lokasi: {$sesi->lokasi}{$catatanTambahan}\n\n"
            . 'Jangan lupa hadir untuk memantau tekanan darah, gula darah, dan kondisi kesehatan Anda!'
        );

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
            ->with(['kunjungan' => fn ($q) => $q->with('pengguna:id,name,kader_id,wilayah_id')])
            ->find($id);

        if (! $sesi) {
            return $this->responTidakDitemukan('Sesi Posbindu tidak ditemukan');
        }

        if ($user->role !== 'super_admin') {
            abort_unless((int) $sesi->wilayah_id === (int) $user->wilayah_id, 403, 'Sesi ini bukan wilayah Anda.');
        }

        // Kader tidak boleh melihat detail sesi milik kader lain dan daftar pesertanya disaring ke warga binaannya (§10.3)
        if ($user->role === 'kader' && $sesi->kader_id !== null && (int) $sesi->kader_id !== (int) $user->id) {
            return $this->responTidakDitemukan('Sesi Posbindu tidak ditemukan');
        }

        $daftarPeserta = $user->role === 'admin_kelurahan'
            ? collect()
            : $sesi->kunjungan
                ->filter(fn ($k) => $user->role !== 'kader' || ($k->pengguna && $this->dalamBinaan($user, $k->pengguna)))
                ->map(fn ($k) => [
                    'kunjungan_id' => $k->id,
                    'user_id'      => $k->user_id,
                    'name'         => $k->pengguna?->name,
                    'hadir'        => (bool) $k->hadir,
                    'dicatat'      => $k->catatan_kesehatan_id !== null,
                ])
                ->values();

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
                'peserta'        => $daftarPeserta,
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

        if (array_key_exists('kader_id', $data)) {
            $this->validasiKaderWilayah($data['kader_id'], (int) $sesi->wilayah_id);
        }

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
        // Sesuai kontrak §10.5 & §16, pencatatan peserta/pemeriksaan hanya boleh oleh kader atau super_admin
        $this->wajibPeran($user, ['kader', 'super_admin'], 'Hanya kader atau super admin yang boleh mencatat pemeriksaan peserta Posbindu.');

        $sesi = SesiPosbindu::find($id);
        if (! $sesi) {
            return $this->responTidakDitemukan('Sesi Posbindu tidak ditemukan');
        }

        if ($user->role === 'kader') {
            abort_unless((int) $sesi->wilayah_id === (int) $user->wilayah_id, 403, 'Sesi ini bukan wilayah Anda.');
            if ($sesi->kader_id !== null && (int) $sesi->kader_id !== (int) $user->id) {
                return $this->responTidakDitemukan('Sesi Posbindu tidak ditemukan');
            }
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
            $ukur  = ['bb_kg', 'sistol', 'diastol', 'gula_darah', 'kolesterol', 'asam_urat', 'lingkar_perut', 'tidur_jam'];
            if (! collect($ukur)->contains(fn ($k) => isset($rawCk[$k]) && $rawCk[$k] !== null)) {
                throw ValidationException::withMessages([
                    'catatan_kesehatan.pengukuran' => ['Minimal satu pengukuran harus diisi.'],
                ]);
            }
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

        $warga = Pengguna::with('profil')->find($data['user_id']);
        if ($user->role === 'kader') {
            abort_unless($warga && $warga->role === 'user' && $this->dalamBinaan($user, $warga), 404, 'Peserta tidak ditemukan di binaan Anda.');
        } else {
            abort_unless($warga && $warga->role === 'user', 404, 'Peserta tidak ditemukan.');
        }

        if (! empty($data['catatan_kesehatan']) && $warga->consent_at === null) {
            throw ValidationException::withMessages([
                'consent' => ['Persetujuan data belum diberikan.'],
            ]);
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
        $catatanRingkas = null;

        DB::transaction(function () use ($sesi, $user, $data, $warga, &$kunjunganId, &$catatanKesehatanId, &$catatanRingkas) {
            if ($data['hadir'] && ! empty($data['catatan_kesehatan'])) {
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
                $catatanRingkas = [
                    'status' => $ck->status_kesehatan,
                    'skor'   => $ck->skor_risiko,
                ];
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

        if ($data['hadir'] && $catatanRingkas !== null) {
            $statusLabel = ucwords(str_replace('_', ' ', (string) ($catatanRingkas['status'] ?? 'tercatat')));
            $skorInfo = $catatanRingkas['skor'] !== null ? "\nSkor risiko PTM: {$catatanRingkas['skor']}" : '';
            $tanggalSesi = $sesi->tanggal?->format('d-m-Y') ?? '-';

            $this->telegram->kirimNotifikasiUser(
                $warga,
                'Hasil Pemeriksaan Posbindu Tercatat',
                "Halo {$warga->name},\n"
                . "Hasil pemeriksaan Posbindu Anda ({$tanggalSesi} di {$sesi->lokasi}) sudah dicatat oleh kader.\n"
                . "Status kesehatan: {$statusLabel}{$skorInfo}\n\n"
                . 'Lihat rincian lengkapnya di menu Riwayat Kesehatan pada aplikasi SehatKita.'
            );
        }

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

    // Tampilkan riwayat kunjungan Posbindu sesuai peran dan binaan pengguna (§10.6)
    public function indexKunjungan(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user', 'kader', 'super_admin'], 'Admin kelurahan tidak memiliki akses ke riwayat kunjungan individu.');

        $query = KunjunganPosbindu::query()
            ->with(['sesi:id,tanggal,lokasi,wilayah_id', 'pengguna:id,name']);

        if ($user->role === 'user') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'kader') {
            if ($request->filled('user_id')) {
                $target = Pengguna::find($request->user_id);
                abort_unless($target && $this->dalamBinaan($user, $target), 404, 'Warga tidak ditemukan.');
                $query->where('user_id', $target->id);
            } else {
                $query->whereHas('pengguna', fn ($q) => $this->scopeBinaan($q, $user));
            }
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
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

    // Pastikan kader_id pada sesi benar-benar akun ber-role kader aktif di wilayah sesi
    private function validasiKaderWilayah(mixed $kaderId, int $wilayahId): void
    {
        if ($kaderId === null || $kaderId === '') {
            return;
        }

        $kader = Pengguna::find($kaderId);
        if (! $kader || $kader->role !== 'kader' || ! $kader->aktif || (int) $kader->wilayah_id !== $wilayahId) {
            throw ValidationException::withMessages([
                'kader_id' => ['Kader harus aktif, berperan kader, dan berada di wilayah yang sama dengan sesi.'],
            ]);
        }
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
        $this->wajibPeran($user, ['kader', 'super_admin'], 'Hanya kader atau super admin yang dapat mencari warga berdasarkan NIK.');

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
            ->when($user->role === 'kader', fn ($q) => $this->scopeBinaan($q, $user))
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