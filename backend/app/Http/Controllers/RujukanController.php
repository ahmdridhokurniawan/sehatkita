<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use App\Models\Rujukan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Modul rujukan — kontrak 11.
 * 11.1 POST   /rujukan             -> buat rujukan (kader/admin)
 * 11.2 GET    /rujukan             -> daftar (user: miliknya, petugas: wilayahnya)
 * 11.3 PATCH  /rujukan/{id}/status -> ubah status tindak lanjut
 */
class RujukanController extends Controller
{
    private const ROLE_PETUGAS = ['kader', 'admin_kelurahan', 'super_admin'];
    private const STATUS       = ['baru', 'dihubungi', 'tertangani', 'ditolak'];

    // POST /rujukan
    public function store(Request $request)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $data = $request->validate([
            'user_id'   => 'required|exists:pengguna,id',
            'faskes_id' => 'required|exists:faskes,id',
            'alasan'    => 'required|string|max:255',
        ]);

        // Kader/admin_kelurahan hanya boleh merujuk warganya sendiri.
        if ($user->role !== 'super_admin') {
            $pemilik = Pengguna::query()
                ->whereKey($data['user_id'])
                ->where('wilayah_id', $user->wilayah_id)
                ->exists();

            abort_unless($pemilik, 404, 'Peserta tidak ditemukan di wilayah Anda.');
        }

        $rujukan = Rujukan::create([
            'user_id'     => $data['user_id'],
            'faskes_id'   => $data['faskes_id'],
            'alasan'      => $data['alasan'],
            'dibuat_oleh' => $user->id,
            'status'      => 'baru',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rujukan dibuat',
            'data'    => $this->bentuk($rujukan->load(['faskes', 'pembuat', 'penangan'])),
        ], 201);
    }

    // GET /rujukan?status=&wilayah_id=&dari=&sampai=&search=&per_page=
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Rujukan::with(['faskes', 'pembuat', 'penangan']);

        if (! in_array($user->role, self::ROLE_PETUGAS, true)) {
            $query->where('user_id', $user->id);           // user: milik sendiri
        } else {
            if ($user->role !== 'super_admin') {
                $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
            }
            if ($request->filled('wilayah_id')) {
                $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $request->wilayah_id));
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('dari')) {
            $query->whereDate('created_at', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $query->whereDate('created_at', '<=', $request->sampai);
        }

        $this->saringCari($query, ['alasan', 'catatan'], $request);

        $list = $query->orderByDesc('created_at')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => collect($list->items())->map(fn ($r) => $this->bentuk($r))->values(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // PATCH /rujukan/{id}/status
    public function updateStatus(Request $request, int $id)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $data = $request->validate([
            'status'  => ['required', Rule::in(self::STATUS)],
            'catatan' => 'nullable|string|max:500',
        ]);

        // Data di luar scope wilayah = 404 (bukan 403); kader kelurahan A
        // tidak boleh mengubah rujukan kelurahan B hanya dengan menebak id.
        $query = Rujukan::query();
        if ($user->role !== 'super_admin') {
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
        }
        $rujukan = $query->findOrFail($id);

        $rujukan->update([
            'status'         => $data['status'],
            'catatan'        => $data['catatan'] ?? $rujukan->catatan,
            'ditangani_oleh' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status rujukan diperbarui',
            'data'    => $this->bentuk($rujukan->fresh(['faskes', 'pembuat', 'penangan'])),
        ]);
    }

    private function bentuk(Rujukan $r): array
    {
        return [
            'id'             => $r->id,
            'user_id'        => $r->user_id,
            'faskes'         => ['id' => $r->faskes?->id, 'nama' => $r->faskes?->nama],
            'alasan'         => $r->alasan,
            'status'         => $r->status,
            'dibuat_oleh'    => ['id' => $r->pembuat?->id, 'name' => $r->pembuat?->name],
            'ditangani_oleh' => $r->penangan
                ? ['id' => $r->penangan->id, 'name' => $r->penangan->name]
                : null,
            'catatan'        => $r->catatan,
            'created_at'     => $r->created_at?->toIso8601String(),
            'updated_at'     => $r->updated_at?->toDateTimeString(),
        ];
    }

    private function hanyaPetugas(Pengguna $user): void
    {
        abort_unless(
            in_array($user->role, self::ROLE_PETUGAS, true),
            403,
            'Hanya kader atau admin kelurahan yang boleh membuat rujukan.'
        );
    }
}