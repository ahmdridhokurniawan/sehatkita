<?php

namespace App\Http\Controllers;

use App\Models\AmbangKategori;
use App\Models\Faskes;
use App\Models\Indikator;
use App\Models\LogAudit;
use App\Models\Pengguna;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminMasterController extends Controller
{
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
            'kode'     => 'required|string|max:30|unique:indikator,kode',
            'nama'     => 'required|string|max:100',
            'satuan'   => 'nullable|string|max:20',
            'kelompok' => 'nullable|string|max:50',
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
            'kode'     => ['sometimes', 'string', 'max:30', Rule::unique('indikator', 'kode')->ignore($id)],
            'nama'     => 'sometimes|string|max:100',
            'satuan'   => 'sometimes|nullable|string|max:20',
            'kelompok' => 'sometimes|nullable|string|max:50',
        ]);

        $indikator->update($data);

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

        $ambang = AmbangKategori::create($request->validate($this->aturanAmbang()));
        $ambang->load('indikator:id,kode,nama,satuan');

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

        $ambang->update($request->validate($aturan));
        $ambang->load('indikator:id,kode,nama,satuan');

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

        $data = $request->validate([
            'name'       => 'required|string|max:100',
            'nik'        => 'nullable|string|size:16|regex:/^[0-9]+$/|unique:pengguna,nik',
            'email'      => 'required|email|max:150|unique:pengguna,email',
            'password'   => ['required', Password::min(8)],
            'role'       => ['required', Rule::in(['super_admin', 'admin_kelurahan', 'kader', 'user'])],
            'wilayah_id' => 'nullable|exists:wilayah,id',
        ]);

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

        $data = $request->validate([
            'name'       => 'sometimes|string|max:100',
            'nik'        => ['sometimes', 'nullable', 'string', 'size:16', 'regex:/^[0-9]+$/', Rule::unique('pengguna', 'nik')->ignore($id)],
            'email'      => ['sometimes', 'email', 'max:150', Rule::unique('pengguna', 'email')->ignore($id)],
            'password'   => ['sometimes', Password::min(8)],
            'role'       => ['sometimes', Rule::in(['super_admin', 'admin_kelurahan', 'kader', 'user'])],
            'wilayah_id' => 'sometimes|nullable|exists:wilayah,id',
            'aktif'      => 'sometimes|boolean',
        ]);

        // Lepas kader lama bila warga mutasi kelurahan
        if ($request->has('wilayah_id') && (int) $request->wilayah_id !== (int) $pengguna->wilayah_id) {
            $data['kader_id'] = null;
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

        $faskes->update($request->validate($this->aturanFaskes()));

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

    // Riwayat log audit aktivitas sistem
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
        if ($request->filled('dari')) {
            $query->where('created_at', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $query->where('created_at', '<=', $request->sampai);
        }

        $list = $query->latest('created_at')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->items(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // ================= HELPER =================

    private function hanyaSuperAdmin($user): void
    {
        abort_unless($user->role === 'super_admin', 403, 'Endpoint ini hanya untuk super admin.');
    }

    private function tidakDitemukan(string $pesan)
    {
        return response()->json([
            'success' => false,
            'message' => $pesan,
        ], 404);
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
            'indikator_id' => 'required|exists:indikator,id',
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
}