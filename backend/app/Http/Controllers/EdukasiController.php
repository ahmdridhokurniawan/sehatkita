<?php

namespace App\Http\Controllers;

use App\Models\Edukasi;
use App\Models\Pengguna;
use App\Models\ProgresEdukasi;
use App\Services\BadgeKeaktifanService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Mengurus materi edukasi kesehatan PTM (terpisah dari tantangan) serta progres belajar mandiri warga.
class EdukasiController extends Controller
{
    public const KATEGORI = [
        'hipertensi',
        'diabetes',
        'gizi_imt',
        'aktivitas_fisik',
        'gaya_hidup',
        'rujukan',
        'umum',
    ];

    public function __construct(private BadgeKeaktifanService $badges) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $isPetugas = in_array($user->role, ['kader', 'admin_kelurahan', 'super_admin'], true);

        $query = Edukasi::query()->with('pembuat:id,name,role');

        if (! $isPetugas) {
            $query->where('aktif', true);
        }

        if ($user->role !== 'super_admin' && $user->wilayah_id) {
            $query->where(fn ($q) => $q->whereNull('wilayah_id')->orWhere('wilayah_id', $user->wilayah_id));
        } elseif ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', (int) $request->query('wilayah_id'));
        }

        if ($request->filled('kategori')) {
            $query->where('kategori', $request->query('kategori'));
        }

        $this->saringCari($query, ['judul', 'ringkasan', 'konten', 'kategori'], $request);

        $statusBaca = $request->query('status_baca');
        if ($user->role === 'user' && in_array($statusBaca, ['selesai', 'berjalan', 'belum'], true)) {
            if ($statusBaca === 'selesai') {
                $query->whereHas('progres', fn ($q) => $q->where('user_id', $user->id)->where('sudah_dibaca', true));
            } elseif ($statusBaca === 'berjalan') {
                $query->whereHas('progres', fn ($q) => $q->where('user_id', $user->id)->where('sudah_dibaca', false)->where('progres_persen', '>', 0));
            } else {
                $query->whereDoesntHave('progres', fn ($q) => $q->where('user_id', $user->id)->where('progres_persen', '>', 0));
            }
        }

        $list = $query->orderBy('urutan')->orderByDesc('id')->paginate($this->perHalaman($request, 9));

        $progresMap = ProgresEdukasi::where('user_id', $user->id)
            ->whereIn('edukasi_id', collect($list->items())->pluck('id'))
            ->get()
            ->keyBy('edukasi_id');

        $data = collect($list->items())
            ->map(fn (Edukasi $e) => $this->bentuk($e, $progresMap->get($e->id)))
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $data,
            'meta' => $this->metaPaginasi($list),
            'ringkasan_progres' => $user->role === 'user' ? $this->ringkasanProgres($user) : null,
        ]);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $edukasi = Edukasi::with('pembuat:id,name,role')->findOrFail($id);

        if ($user->role === 'user') {
            abort_unless($edukasi->aktif, 404, 'Materi edukasi tidak ditemukan.');
            if ($edukasi->wilayah_id && (int) $edukasi->wilayah_id !== (int) $user->wilayah_id) {
                abort(404, 'Materi edukasi tidak ditemukan.');
            }
        }

        $progres = $user->role === 'user'
            ? ProgresEdukasi::where('edukasi_id', $edukasi->id)->where('user_id', $user->id)->first()
            : null;

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $this->bentuk($edukasi, $progres),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['kader', 'admin_kelurahan', 'super_admin'], 'Hanya petugas yang boleh membuat materi edukasi.');

        $data = $request->validate([
            'wilayah_id' => 'nullable|exists:wilayah,id',
            'judul' => 'required|string|max:180',
            'ringkasan' => 'required|string|max:500',
            'konten' => 'required|string|max:10000',
            'kategori' => ['required', Rule::in(self::KATEGORI)],
            'estimasi_menit' => 'nullable|integer|min:1|max:120',
            'urutan' => 'nullable|integer|min:0|max:9999',
            'aktif' => 'sometimes|boolean',
        ]);

        if ($user->role !== 'super_admin') {
            abort_unless($user->wilayah_id, 422, 'Akun Anda belum memiliki wilayah penugasan.');
            $data['wilayah_id'] = $user->wilayah_id;
        } else {
            $wId = $request->input('wilayah_id');
            $data['wilayah_id'] = ($wId && (int) $wId > 0) ? (int) $wId : null;
        }

        $data['estimasi_menit'] = $data['estimasi_menit'] ?? 5;
        $data['urutan'] = $data['urutan'] ?? 0;
        $data['aktif'] = $data['aktif'] ?? true;
        $data['dibuat_oleh'] = $user->id;

        $edukasi = Edukasi::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Materi edukasi berhasil ditambahkan',
            'data' => $this->bentuk($edukasi->load('pembuat:id,name,role')),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['kader', 'admin_kelurahan', 'super_admin'], 'Hanya petugas yang boleh mengubah materi edukasi.');

        $edukasi = Edukasi::findOrFail($id);

        if ($user->role !== 'super_admin') {
            abort_unless((int) $edukasi->wilayah_id === (int) $user->wilayah_id, 403, 'Anda hanya dapat mengubah materi edukasi wilayah Anda.');
        }

        $data = $request->validate([
            'wilayah_id' => 'sometimes|nullable|exists:wilayah,id',
            'judul' => 'sometimes|string|max:180',
            'ringkasan' => 'sometimes|string|max:500',
            'konten' => 'sometimes|string|max:10000',
            'kategori' => ['sometimes', Rule::in(self::KATEGORI)],
            'estimasi_menit' => 'sometimes|integer|min:1|max:120',
            'urutan' => 'sometimes|integer|min:0|max:9999',
            'aktif' => 'sometimes|boolean',
        ]);

        if ($user->role !== 'super_admin') {
            unset($data['wilayah_id']);
        } elseif (array_key_exists('wilayah_id', $data)) {
            $data['wilayah_id'] = ($data['wilayah_id'] && (int) $data['wilayah_id'] > 0) ? (int) $data['wilayah_id'] : null;
        }

        $edukasi->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Materi edukasi diperbarui',
            'data' => $this->bentuk($edukasi->fresh('pembuat:id,name,role')),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['kader', 'admin_kelurahan', 'super_admin'], 'Hanya petugas yang boleh menghapus materi edukasi.');

        $edukasi = Edukasi::findOrFail($id);

        if ($user->role !== 'super_admin') {
            abort_unless((int) $edukasi->wilayah_id === (int) $user->wilayah_id, 403, 'Anda hanya dapat menghapus materi edukasi wilayah Anda.');
        }

        $edukasi->delete();

        return response()->json([
            'success' => true,
            'message' => 'Materi edukasi dihapus',
            'data' => null,
        ]);
    }

    public function simpanProgres(Request $request, int $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Hanya warga yang dapat mencatat progres belajar pribadi.');

        $edukasi = Edukasi::where('aktif', true)->findOrFail($id);
        if ($edukasi->wilayah_id && (int) $edukasi->wilayah_id !== (int) $user->wilayah_id) {
            abort(404, 'Materi edukasi tidak ditemukan.');
        }

        $data = $request->validate([
            'progres_persen' => 'sometimes|integer|min:0|max:100',
            'sudah_dibaca' => 'sometimes|boolean',
            'catatan_pribadi' => 'nullable|string|max:1000',
        ]);

        $lama = ProgresEdukasi::where('edukasi_id', $edukasi->id)
            ->where('user_id', $user->id)
            ->first();

        $selesai = (bool) ($data['sudah_dibaca'] ?? false)
            || ((int) ($data['progres_persen'] ?? ($lama?->progres_persen ?? 0)) >= 100);

        $persen = $selesai
            ? 100
            : (int) ($data['progres_persen'] ?? ($lama?->progres_persen ?? 0));

        $progres = ProgresEdukasi::updateOrCreate(
            ['edukasi_id' => $edukasi->id, 'user_id' => $user->id],
            [
                'progres_persen' => $persen,
                'sudah_dibaca' => $selesai,
                'catatan_pribadi' => array_key_exists('catatan_pribadi', $data)
                    ? $data['catatan_pribadi']
                    : $lama?->catatan_pribadi,
                'selesai_pada' => $selesai ? ($lama?->selesai_pada ?? now()) : null,
            ]
        );

        $badgeBaru = $this->badges->evaluasiUntukUser($user);

        return response()->json([
            'success' => true,
            'message' => $selesai ? 'Materi selesai dipahami!' : 'Progres belajar disimpan',
            'data' => [
                'edukasi_id' => $edukasi->id,
                'progres_persen' => (int) $progres->progres_persen,
                'sudah_dibaca' => (bool) $progres->sudah_dibaca,
                'catatan_pribadi' => $progres->catatan_pribadi,
                'selesai_pada' => $progres->selesai_pada?->toIso8601String(),
                'badge_baru' => $badgeBaru,
                'ringkasan_progres' => $this->ringkasanProgres($user),
            ],
        ]);
    }

    private function ringkasanProgres(Pengguna $user): array
    {
        $ids = Edukasi::query()
            ->where('aktif', true)
            ->when($user->wilayah_id, fn ($q) => $q->where(fn ($sub) => $sub->whereNull('wilayah_id')->orWhere('wilayah_id', $user->wilayah_id)))
            ->pluck('id');

        $total = $ids->count();
        if ($total === 0) {
            return ['total_materi' => 0, 'selesai' => 0, 'berjalan' => 0, 'belum' => 0, 'persen_keseluruhan' => 0];
        }

        $progresRows = ProgresEdukasi::where('user_id', $user->id)
            ->whereIn('edukasi_id', $ids)
            ->get();

        $selesai = $progresRows->where('sudah_dibaca', true)->count();
        $berjalan = $progresRows->where('sudah_dibaca', false)->where('progres_persen', '>', 0)->count();
        $jumlahPersen = (int) $progresRows->sum('progres_persen');

        return [
            'total_materi' => $total,
            'selesai' => $selesai,
            'berjalan' => $berjalan,
            'belum' => max(0, $total - $selesai - $berjalan),
            'persen_keseluruhan' => (int) round($jumlahPersen / $total),
        ];
    }

    private function bentuk(Edukasi $e, ?ProgresEdukasi $progres = null): array
    {
        return [
            'id' => $e->id,
            'wilayah_id' => $e->wilayah_id,
            'judul' => $e->judul,
            'ringkasan' => $e->ringkasan,
            'konten' => $e->konten,
            'kategori' => $e->kategori,
            'estimasi_menit' => (int) $e->estimasi_menit,
            'urutan' => (int) $e->urutan,
            'aktif' => (bool) $e->aktif,
            'pembuat' => $e->pembuat ? ['id' => $e->pembuat->id, 'name' => $e->pembuat->name, 'role' => $e->pembuat->role] : null,
            'progres_saya' => $progres ? [
                'progres_persen' => (int) $progres->progres_persen,
                'sudah_dibaca' => (bool) $progres->sudah_dibaca,
                'catatan_pribadi' => $progres->catatan_pribadi,
                'selesai_pada' => $progres->selesai_pada?->toIso8601String(),
                'updated_at' => $progres->updated_at?->toIso8601String(),
            ] : [
                'progres_persen' => 0,
                'sudah_dibaca' => false,
                'catatan_pribadi' => null,
                'selesai_pada' => null,
                'updated_at' => null,
            ],
            'created_at' => $e->created_at?->toIso8601String(),
            'updated_at' => $e->updated_at?->toIso8601String(),
        ];
    }
}
