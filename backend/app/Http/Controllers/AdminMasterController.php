<?php

namespace App\Http\Controllers;

use App\Models\AmbangKategori;
use App\Models\Faskes;
use App\Models\Indikator;
use App\Models\LogAudit;
use App\Models\Pengguna;
use App\Models\RiwayatWilayah;
use App\Services\HealthCalculatorService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AdminMasterController extends Controller
{
    public function __construct(private HealthCalculatorService $kalkulator) {}

    // ================= INDIKATOR =================

    // Daftar master indikator kesehatan
    public function indexIndikator(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        $query = Indikator::query();
        $this->saringCari($query, ['kode', 'nama', 'kelompok'], $request);

        if ($request->filled('kelompok')) {
            $query->where('kelompok', $request->kelompok);
        }

        $list = $query->orderBy('kode')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->items(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    public function storeIndikator(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        $data = $request->validate([
            'kode'                   => 'required|string|max:30|unique:indikator,kode',
            'nama'                   => 'required|string|max:100',
            'satuan'                 => 'nullable|string|max:20',
            'kelompok'               => 'nullable|string|max:50',
            'interval_skrining_hari' => 'nullable|integer|min:1|max:365',
        ]);

        $indikator = Indikator::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Indikator ditambahkan',
            'data'    => $indikator,
        ], 201);
    }

    public function updateIndikator(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $indikator = Indikator::find($id);
        if (! $indikator) {
            return $this->tidakDitemukan('Indikator tidak ditemukan');
        }

        $data = $request->validate([
            'kode'                   => ['sometimes', 'string', 'max:30', Rule::unique('indikator', 'kode')->ignore($id)],
            'nama'                   => 'sometimes|string|max:100',
            'satuan'                 => 'sometimes|nullable|string|max:20',
            'kelompok'               => 'sometimes|nullable|string|max:50',
            'interval_skrining_hari' => 'sometimes|nullable|integer|min:1|max:365',
        ]);

        $indikator->update($data);
        // Bersihkan cache kalkulator agar perubahan kode/interval indikator langsung aktif
        $this->kalkulator->lupakanCache();

        return response()->json([
            'success' => true,
            'message' => 'Indikator diubah',
            'data'    => $indikator,
        ]);
    }

    public function destroyIndikator(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $indikator = Indikator::find($id);
        if (! $indikator) {
            return $this->tidakDitemukan('Indikator tidak ditemukan');
        }

        // ambang_kategori cascadeOnDelete -> ikut terhapus.
        $indikator->delete();
        $this->kalkulator->lupakanCache();

        return response()->json([
            'success' => true,
            'message' => 'Indikator dihapus',
            'data'    => null,
        ]);
    }

    // ================= AMBANG KATEGORI =================

    // Daftar ambang batas kategori indikator
    public function indexAmbang(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        $query = AmbangKategori::with('indikator:id,kode,nama,satuan');

        if ($request->filled('indikator_id')) {
            $query->where('indikator_id', $request->indikator_id);
        }
        if ($request->filled('kode')) {
            $query->whereHas('indikator', fn ($q) => $q->where('kode', $request->kode));
        }

        $list = $query->orderBy('indikator_id')->orderBy('batas_min')
            ->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->getCollection()->map(fn ($a) => $this->bentukAmbang($a))->values(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    public function storeAmbang(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        $data = $request->validate($this->aturanAmbang());
        $this->pastikanAmbangTidakTumpangTindih(
            (int) $data['indikator_id'],
            $data['jenis_gula_darah'] ?? null,
            (float) $data['batas_min'],
            isset($data['batas_max']) ? (float) $data['batas_max'] : null
        );

        $ambang = AmbangKategori::create($data);
        $ambang->load('indikator:id,kode,nama,satuan');
        $this->kalkulator->lupakanCache();

        return response()->json([
            'success' => true,
            'message' => 'Ambang kategori ditambahkan',
            'data'    => $this->bentukAmbang($ambang),
        ], 201);
    }

    public function updateAmbang(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $ambang = AmbangKategori::find($id);
        if (! $ambang) {
            return $this->tidakDitemukan('Ambang kategori tidak ditemukan');
        }

        // Semua opsional saat update: "required" -> "sometimes".
        $aturan = $this->aturanAmbang();
        foreach ($aturan as $field => $rule) {
            $aturan[$field] = is_string($rule)
                ? preg_replace('/^required\|/', 'sometimes|', $rule)
                : array_merge(['sometimes'], (array) $rule);
        }

        $data = $request->validate($aturan);
        $minBaru = array_key_exists('batas_min', $data) ? (float) $data['batas_min'] : (float) $ambang->batas_min;
        $maxBaru = array_key_exists('batas_max', $data)
            ? ($data['batas_max'] === null ? null : (float) $data['batas_max'])
            : ($ambang->batas_max === null ? null : (float) $ambang->batas_max);

        if ($maxBaru !== null && $maxBaru < $minBaru) {
            throw ValidationException::withMessages([
                'batas_max' => ['Batas maksimum harus lebih besar atau sama dengan batas minimum.'],
            ]);
        }

        $this->pastikanAmbangTidakTumpangTindih(
            (int) ($data['indikator_id'] ?? $ambang->indikator_id),
            array_key_exists('jenis_gula_darah', $data) ? $data['jenis_gula_darah'] : $ambang->jenis_gula_darah,
            $minBaru,
            $maxBaru,
            $ambang->id
        );

        $ambang->update($data);
        $ambang->load('indikator:id,kode,nama,satuan');
        $this->kalkulator->lupakanCache();

        return response()->json([
            'success' => true,
            'message' => 'Ambang kategori diubah',
            'data'    => $this->bentukAmbang($ambang),
        ]);
    }

    public function destroyAmbang(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $ambang = AmbangKategori::find($id);
        if (! $ambang) {
            return $this->tidakDitemukan('Ambang kategori tidak ditemukan');
        }

        $ambang->delete();
        $this->kalkulator->lupakanCache();

        return response()->json([
            'success' => true,
            'message' => 'Ambang kategori dihapus',
            'data'    => null,
        ]);
    }

    // ================= PENGGUNA =================

    // Daftar pengguna sistem
    public function indexPengguna(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        $query = Pengguna::with('wilayah:id,nama,tipe');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }

        $this->saringCari($query, ['name', 'email', 'nik'], $request);

        $list = $query->orderBy('name')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->items(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // Tambah akun pengguna baru
    public function storePengguna(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        if ($request->filled('email')) {
            $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        }

        $data = $request->validate([
            'name'       => 'required|string|max:100',
            'nik'        => 'nullable|string|size:16|regex:/^[0-9]+$/|unique:pengguna,nik',
            'email'      => 'required|email|max:150|unique:pengguna,email',
            'password'   => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'role'       => ['required', Rule::in(['super_admin', 'admin_kelurahan', 'kader', 'user'])],
            'wilayah_id' => 'nullable|exists:wilayah,id',
            'kader_id'   => 'nullable|exists:pengguna,id',
        ]);

        $this->pastikanKaderSah($data['kader_id'] ?? null, isset($data['wilayah_id']) ? (int) $data['wilayah_id'] : null);

        $pengguna = Pengguna::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Akun dibuat',
            'data'    => $pengguna->load('wilayah:id,nama,tipe'),
        ], 201);
    }

    // Ubah data pengguna
    public function updatePengguna(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $pengguna = Pengguna::find($id);
        if (! $pengguna) {
            return $this->tidakDitemukan('Pengguna tidak ditemukan');
        }

        if ($request->filled('email')) {
            $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        }

        $data = $request->validate([
            'name'       => 'sometimes|string|max:100',
            'nik'        => ['sometimes', 'nullable', 'string', 'size:16', 'regex:/^[0-9]+$/', Rule::unique('pengguna', 'nik')->ignore($id)],
            'email'      => ['sometimes', 'email', 'max:150', Rule::unique('pengguna', 'email')->ignore($id)],
            'password'   => ['sometimes', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'role'       => ['sometimes', Rule::in(['super_admin', 'admin_kelurahan', 'kader', 'user'])],
            'wilayah_id' => 'sometimes|nullable|exists:wilayah,id',
            'kader_id'   => 'sometimes|nullable|exists:pengguna,id',
            'aktif'      => 'sometimes|boolean',
        ]);

        // Catat riwayat perpindahan wilayah dan lepas kader lama bila warga mutasi kelurahan (U12)
        if ($request->has('wilayah_id') && (int) $request->wilayah_id !== (int) $pengguna->wilayah_id) {
            if ($request->filled('wilayah_id')) {
                RiwayatWilayah::create([
                    'user_id'           => $pengguna->id,
                    'wilayah_asal_id'   => $pengguna->wilayah_id,
                    'wilayah_tujuan_id' => (int) $data['wilayah_id'],
                    'alasan'            => $request->input('alasan_mutasi', 'Mutasi domisili warga'),
                    'diubah_oleh'       => $request->user()->id,
                ]);
            }
            $data['kader_id'] = null;
        }

        if (array_key_exists('kader_id', $data) && $data['kader_id'] !== null) {
            $wilayahEfektif = array_key_exists('wilayah_id', $data)
                ? ($data['wilayah_id'] === null ? null : (int) $data['wilayah_id'])
                : ($pengguna->wilayah_id === null ? null : (int) $pengguna->wilayah_id);
            $this->pastikanKaderSah((int) $data['kader_id'], $wilayahEfektif);
        }

        $pengguna->update($data);

        // Cabut token saat akun dinonaktifkan atau sandi diubah
        if (($request->has('aktif') && ! $request->boolean('aktif')) || $request->filled('password')) {
            $pengguna->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pengguna diubah',
            'data'    => $pengguna->load('wilayah:id,nama,tipe'),
        ]);
    }

    // Ambil riwayat perpindahan wilayah warga (U12)
    public function riwayatWilayahPengguna(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $pengguna = Pengguna::find($id);
        if (! $pengguna) {
            return $this->tidakDitemukan('Pengguna tidak ditemukan');
        }

        $riwayat = RiwayatWilayah::with([
            'wilayahAsal:id,nama,tipe',
            'wilayahTujuan:id,nama,tipe',
            'pengubah:id,name,role',
        ])
            ->where('user_id', $pengguna->id)
            ->latest('id')
            ->get()
            ->map(function ($r) {
                $item = $r->toArray();
                $item['wilayahAsal'] = $r->wilayahAsal ? [
                    'id'   => $r->wilayahAsal->id,
                    'nama' => $r->wilayahAsal->nama,
                    'tipe' => $r->wilayahAsal->tipe,
                ] : null;
                $item['wilayahTujuan'] = $r->wilayahTujuan ? [
                    'id'   => $r->wilayahTujuan->id,
                    'nama' => $r->wilayahTujuan->nama,
                    'tipe' => $r->wilayahTujuan->tipe,
                ] : null;
                return $item;
            });

        return response()->json([
            'success' => true,
            'message' => 'Riwayat wilayah pengguna',
            'data'    => $riwayat,
        ]);
    }

    // Nonaktifkan akun pengguna
    public function destroyPengguna(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $pengguna = Pengguna::find($id);
        if (! $pengguna) {
            return $this->tidakDitemukan('Pengguna tidak ditemukan');
        }

        if ($pengguna->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak boleh menonaktifkan akun sendiri',
            ], 422);
        }

        $pengguna->update(['aktif' => false]);
        $pengguna->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengguna dinonaktifkan',
            'data'    => null,
        ]);
    }

    // ================= FASKES =================

    // Daftar fasilitas kesehatan
    public function indexFaskes(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        $query = Faskes::with('wilayah:id,nama,tipe');

        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }
        if ($request->filled('jenis')) {
            $query->where('jenis', $request->jenis);
        }

        $this->saringCari($query, ['nama', 'alamat'], $request);

        $list = $query->orderBy('nama')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->items(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // Tambah faskes baru
    public function storeFaskes(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        $faskes = Faskes::create($request->validate($this->aturanFaskes()));

        return response()->json([
            'success' => true,
            'message' => 'Faskes ditambahkan',
            'data'    => $faskes->load('wilayah:id,nama,tipe'),
        ], 201);
    }

    // Ubah data faskes
    public function updateFaskes(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $faskes = Faskes::find($id);
        if (! $faskes) {
            return $this->tidakDitemukan('Faskes tidak ditemukan');
        }

        $aturan = $this->aturanFaskes();
        foreach ($aturan as $field => $rule) {
            $aturan[$field] = is_string($rule)
                ? preg_replace('/^required\|/', 'sometimes|', $rule)
                : array_map(fn ($r) => $r === 'required' ? 'sometimes' : $r, (array) $rule);
        }

        $faskes->update($request->validate($aturan));

        return response()->json([
            'success' => true,
            'message' => 'Faskes diubah',
            'data'    => $faskes->load('wilayah:id,nama,tipe'),
        ]);
    }

    // Hapus faskes
    public function destroyFaskes(Request $request, int $id)
    {
        $this->hanyaSuperAdmin($request->user());

        $faskes = Faskes::find($id);
        if (! $faskes) {
            return $this->tidakDitemukan('Faskes tidak ditemukan');
        }

        try {
            $faskes->delete();
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Faskes masih dipakai rujukan, tidak bisa dihapus',
            ], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'Faskes dihapus',
            'data'    => null,
        ]);
    }

    // ================= LOG AUDIT =================

    // Tampilkan daftar log audit dengan filter pengguna, model, dan rentang tanggal inklusif
    public function indexLogAudit(Request $request)
    {
        $this->hanyaSuperAdmin($request->user());

        $query = LogAudit::with('pengguna:id,name,email');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('aksi')) {
            $query->where('aksi', 'like', '%'.$request->aksi.'%');
        }
        if ($request->filled('model')) {
            $query->where('model', $request->model);
        }
        $this->saringRentangTanggal($query, $request);
        $this->saringCari($query, ['aksi', 'model'], $request);

        $list = $query->latest('created_at')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->items(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // ================= HELPER =================

    // Batasi akses endpoint hanya untuk peran super admin
    private function hanyaSuperAdmin($user): void
    {
        $this->wajibPeran($user, ['super_admin'], 'Endpoint ini hanya untuk super admin.');
    }

    // Kembalikan response JSON 404 saat data master tidak ditemukan
    private function tidakDitemukan(string $pesan)
    {
        return $this->responTidakDitemukan($pesan);
    }

    private function bentukAmbang(AmbangKategori $a): array
    {
        return [
            'id'         => $a->id,
            'indikator'  => $a->indikator
                ? [
                    'kode'   => $a->indikator->kode,
                    'nama'   => $a->indikator->nama,
                    'satuan' => $a->indikator->satuan,
                ]
                : null,
            'jenis_gula_darah' => $a->jenis_gula_darah,
            'memicu_rujukan'   => (bool) $a->memicu_rujukan,
            'batas_min'  => $a->batas_min === null ? null : (float) $a->batas_min,
            'batas_max'  => $a->batas_max === null ? null : (float) $a->batas_max,
            'kategori'   => $a->kategori,
            'status'     => $a->status,
            'skor'       => (int) $a->skor,
        ];
    }

    private function aturanAmbang(): array
    {
        return [
            'indikator_id'     => 'required|exists:indikator,id',
            'jenis_gula_darah' => 'nullable|in:puasa,2jam_pp',
            'memicu_rujukan'   => 'sometimes|boolean',
            'batas_min'    => 'required|numeric',
            'batas_max'    => 'nullable|numeric|gte:batas_min',
            'kategori'     => 'required|string|max:50',
            'status'       => ['required', Rule::in(['normal', 'perlu_perhatian', 'berisiko'])],
            'skor'         => 'nullable|integer|min:0|max:255',
        ];
    }

    private function aturanFaskes(): array
    {
        return [
            'wilayah_id' => 'nullable|exists:wilayah,id',
            'nama'       => 'required|string|max:150',
            'jenis'      => ['required', Rule::in(['puskesmas', 'klinik', 'rumah_sakit', 'lainnya'])],
            'alamat'     => 'nullable|string',
            'telepon'    => 'nullable|string|max:30',
            'lat'        => 'nullable|numeric|between:-90,90',
            'lng'        => 'nullable|numeric|between:-180,180',
        ];
    }

    // Tolak interval ambang batas [batas_min, batas_max) yang tumpang tindih pada indikator dan jenis gula sama
    private function pastikanAmbangTidakTumpangTindih(
        int $indikatorId,
        ?string $jenisGula,
        float $min,
        ?float $max,
        ?int $abaikanId = null
    ): void {
        $lain = AmbangKategori::where('indikator_id', $indikatorId)
            ->when($jenisGula === null, fn ($q) => $q->whereNull('jenis_gula_darah'), fn ($q) => $q->where('jenis_gula_darah', $jenisGula))
            ->when($abaikanId !== null, fn ($q) => $q->where('id', '!=', $abaikanId))
            ->get(['id', 'batas_min', 'batas_max']);

        foreach ($lain as $row) {
            $rMin = (float) $row->batas_min;
            $rMax = $row->batas_max === null ? null : (float) $row->batas_max;
            $tumpangTindih = ($max === null || $rMin < $max) && ($rMax === null || $min < $rMax);
            if ($tumpangTindih) {
                throw ValidationException::withMessages([
                    'batas_min' => ['Rentang ambang kategori tumpang tindih dengan aturan yang sudah ada.'],
                ]);
            }
        }
    }

    // Pastikan kader_id yang ditugaskan benar-benar akun kader aktif di wilayah warga
    private function pastikanKaderSah(?int $kaderId, ?int $wilayahId): void
    {
        if ($kaderId === null) {
            return;
        }

        $kader = Pengguna::find($kaderId);
        if (! $kader || $kader->role !== 'kader' || ! $kader->aktif) {
            throw ValidationException::withMessages([
                'kader_id' => ['Kader pembina harus merupakan akun kader yang aktif.'],
            ]);
        }

        if ($wilayahId !== null && (int) $kader->wilayah_id !== $wilayahId) {
            throw ValidationException::withMessages([
                'kader_id' => ['Kader pembina harus berada di kelurahan yang sama dengan warga.'],
            ]);
        }
    }
}