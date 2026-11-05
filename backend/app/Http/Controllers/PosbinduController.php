<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\KunjunganPosbindu;
use App\Models\Pengguna;
use App\Models\SesiPosbindu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PosbinduController extends Controller
{
    private const ROLE_ADMIN = ['admin_kelurahan', 'super_admin'];
    private const ROLE_PETUGAS = ['kader', 'admin_kelurahan', 'super_admin'];

    // Daftar sesi Posbindu
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

        // Filter wilayah kerja
        if ($user->role !== 'super_admin') {
            $query->where('wilayah_id', $user->wilayah_id);
        }
        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }
        if ($request->filled('dari')) {
            $query->where('tanggal', '>=', $request->dari);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $list = $query->orderByDesc('tanggal')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->getCollection()->map(fn ($s) => $this->bentukSesi($s))->values(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // Buat sesi Posbindu baru
    public function storeSesi(Request $request)
    {
        $this->hanyaAdmin($request->user());

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

    // Detail sesi Posbindu
    public function showSesi(Request $request, int $id)
    {
        // Kontrak 10.3 cukup login; tidak dibatasi role.
        $sesi = SesiPosbindu::with('kader:id,name')
            ->with(['kunjungan' => fn ($q) => $q->with('pengguna:id,name')])
            ->find($id);

        if (! $sesi) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi Posbindu tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'id'      => $sesi->id,
                'tanggal' => $sesi->tanggal?->toDateString(),
                'lokasi'  => $sesi->lokasi,
                'kader'   => $sesi->kader
                    ? ['id' => $sesi->kader->id, 'name' => $sesi->kader->name]
                    : null,
                'peserta' => $sesi->kunjungan->map(fn ($k) => [
                    'kunjungan_id' => $k->id,
                    'user_id'      => $k->user_id,
                    'name'         => $k->pengguna?->name,
                    'hadir'        => (bool) $k->hadir,
                    'dicatat'      => $k->catatan_kesehatan_id !== null,
                ])->values(),
            ],
        ]);
    }

    // Ubah data sesi Posbindu
    public function updateSesi(Request $request, int $id)
    {
        $this->hanyaAdmin($request->user());

        $sesi = SesiPosbindu::find($id);
        if (! $sesi) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi Posbindu tidak ditemukan',
            ], 404);
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

    // Catat kehadiran dan data kesehatan peserta Posbindu
    public function storePeserta(Request $request, int $id)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $sesi = SesiPosbindu::find($id);
        if (! $sesi) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi Posbindu tidak ditemukan',
            ], 404);
        }

        $data = $request->validate([
            'user_id' => 'required|exists:pengguna,id',
            'hadir'   => 'required|boolean',
            'catatan_kesehatan' => 'nullable|array',
            'catatan_kesehatan.bb_kg'      => 'nullable|numeric',
            'catatan_kesehatan.sistol'     => 'nullable|integer',
            'catatan_kesehatan.diastol'    => 'nullable|integer',
            'catatan_kesehatan.gula_darah' => 'nullable|integer',
            'catatan_kesehatan.jenis_gula_darah' => 'nullable|in:puasa,2jam_pp',
        ]);

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
                $ck = CatatanKesehatan::create([
                    'user_id'          => $data['user_id'],
                    'dicatat_oleh'     => $user->id,
                    'dicatat_pada'     => $sesi->tanggal,
                    'sumber'           => 'kader',
                    'sesi_posbindu_id' => $sesi->id,
                    'bb_kg'            => $data['catatan_kesehatan']['bb_kg'] ?? null,
                    'sistol'           => $data['catatan_kesehatan']['sistol'] ?? null,
                    'diastol'          => $data['catatan_kesehatan']['diastol'] ?? null,
                    'gula_darah'       => $data['catatan_kesehatan']['gula_darah'] ?? null,
                    'jenis_gula_darah' => $data['catatan_kesehatan']['jenis_gula_darah'] ?? null,
                ]);
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

    // Riwayat kunjungan Posbindu
    public function indexKunjungan(Request $request)
    {
        $user = $request->user();

        $query = KunjunganPosbindu::query()
            ->with(['sesi:id,tanggal,lokasi', 'pengguna:id,name']);

        if ($user->role === 'user') {
            $query->where('user_id', $user->id);
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

    // Hapus sesi Posbindu
    public function destroySesi(Request $request, int $id)
    {
        $this->hanyaAdmin($request->user());

        $sesi = SesiPosbindu::find($id);
        if (! $sesi) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi Posbindu tidak ditemukan',
            ], 404);
        }

        if ($request->user()->role === 'admin_kelurahan') {
            abort_unless(
                (int) $sesi->wilayah_id === (int) $request->user()->wilayah_id,
                403,
                'Sesi ini bukan wilayah Anda.'
            );
        }

        $sesi->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesi Posbindu dihapus',
            'data'    => null,
        ]);
    }

    // Format data sesi Posbindu
    private function bentukSesi(SesiPosbindu $s): array
    {
        return [
            'id'             => $s->id,
            'wilayah_id'     => $s->wilayah_id,
            'tanggal'        => $s->tanggal?->toDateString(),
            'lokasi'         => $s->lokasi,
            'kader'          => $s->kader
                ? ['id' => $s->kader->id, 'name' => $s->kader->name]
                : null,
            'catatan'        => $s->catatan,
            'jumlah_peserta' => (int) ($s->jumlah_peserta ?? 0),
            'hadir'          => (int) ($s->hadir ?? 0),
        ];
    }

    private function hanyaAdmin($user): void
    {
        abort_unless(
            in_array($user->role, self::ROLE_ADMIN, true),
            403,
            'Hanya admin kelurahan atau super admin yang boleh mengelola sesi Posbindu.'
        );
    }

    private function hanyaPetugas($user): void
    {
        abort_unless(
            in_array($user->role, self::ROLE_PETUGAS, true),
            403,
            'Hanya kader atau admin kelurahan yang berhak mengelola Posbindu.'
        );
    }

    /**
     * Cari warga/pengguna berdasarkan awalan NIK untuk dropdown autocomplete.
     * Hanya dapat diakses oleh kader, admin kelurahan, dan super admin.
     */
    public function cariNik(Request $request)
    {
        $this->hanyaPetugas($request->user());

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
            ->where('aktif', true)
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