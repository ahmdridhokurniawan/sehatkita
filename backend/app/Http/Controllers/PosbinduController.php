<?php

namespace App\Http\Controllers;

use App\Models\SesiPosbindu;
use App\Models\KunjunganPosbindu;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Modul Posbindu — Kontrak §10
 * Menangani sesi pemeriksaan Posbindu di kelurahan/wilayah dan kunjungan warga.
 */
class PosbinduController extends Controller
{
    private const ROLE_PETUGAS = ['kader', 'admin_kelurahan', 'super_admin'];

    /**
     * GET /api/v1/posbindu/sesi — Daftar sesi posbindu (Kontrak §10.1)
     */
    public function indexSesi(Request $request)
    {
        $user = $request->user();
        $query = SesiPosbindu::with(['wilayah', 'pencatat']);

        // Jika bukan super_admin, batasi hanya wilayah kerjanya
        if ($user->role !== 'super_admin') {
            $query->where('wilayah_id', $user->wilayah_id);
        }

        // Filter opsional berdasarkan wilayah atau status sesi
        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status); // mis: akan_datang, berjalan, selesai
        }

        // Fitur pencarian teks & paginasi standar
        $this->saringCari($query, ['nama_kegiatan', 'lokasi'], $request);
        $list = $query->orderByDesc('tanggal')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $list->items(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    /**
     * POST /api/v1/posbindu/sesi — Buat sesi posbindu baru (Kontrak §10.2)
     */
    public function storeSesi(Request $request)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $data = $request->validate([
            'wilayah_id'    => 'required|exists:wilayah,id',
            'nama_kegiatan' => 'required|string|max:150',
            'tanggal'       => 'required|date',
            'lokasi'        => 'required|string|max:200',
            'status'        => ['required', Rule::in(['akan_datang', 'berjalan', 'selesai'])],
        ]);

        $data['dibuat_oleh'] = $user->id;

        $sesi = SesiPosbindu::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Sesi Posbindu berhasil dibuat',
            'data'    => $sesi->load(['wilayah', 'pencatat']),
        ], 201);
    }

    /**
     * GET /api/v1/posbindu/sesi/{id} — Detail sesi & daftar peserta (Kontrak §10.3)
     */
    public function showSesi(Request $request, int $id)
    {
        $sesi = SesiPosbindu::with(['wilayah', 'pencatat', 'kunjungan.pengguna.profil'])->find($id);

        if (!$sesi) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi Posbindu tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $sesi,
        ]);
    }

    /**
     * Helper: Batasi hanya petugas posbindu / kader / admin
     */
    private function hanyaPetugas($user): void
    {
        abort_unless(
            in_array($user->role, self::ROLE_PETUGAS, true),
            403,
            'Hanya kader atau admin kelurahan yang berhak mengelola sesi Posbindu.'
        );
    }
}