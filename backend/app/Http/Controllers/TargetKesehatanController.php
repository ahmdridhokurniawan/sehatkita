<?php

namespace App\Http\Controllers;

use App\Models\TargetKesehatan;
use Illuminate\Http\Request;

// Controller CRUD target kesehatan dinamis dan motivasi warga
class TargetKesehatanController extends Controller
{
    public function index(Request $request)
    {
        $query = TargetKesehatan::where('user_id', $request->user()->id);

        if ($request->has('tercapai')) {
            $query->where('tercapai', $request->boolean('tercapai'));
        }

        $list = $query->orderBy('tercapai')->orderBy('tenggat_waktu')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar target kesehatan',
            'data'    => $list,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'judul'            => 'required|string|max:100',
            'jenis_target'     => 'required|string|max:50',
            'nilai_awal'       => 'nullable|numeric',
            'nilai_target'     => 'required|numeric',
            'satuan'           => 'required|string|max:20',
            'tenggat_waktu'    => 'nullable|date',
            'catatan_motivasi' => 'nullable|string|max:255',
        ]);

        $data['user_id'] = $request->user()->id;
        $data['catatan_motivasi'] = $data['catatan_motivasi'] ?? 'Luar biasa! Target kesehatanmu tercapai, terus pertahankan!';

        $target = TargetKesehatan::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Target kesehatan berhasil dibuat',
            'data'    => $target,
        ], 201);
    }

    // Perbarui detail target kesehatan milik warga yang sedang login
    public function update(Request $request, int $id)
    {
        $target = $this->cariTargetMilik($request, $id);

        $data = $request->validate([
            'judul'            => 'sometimes|string|max:100',
            'jenis_target'     => 'sometimes|string|max:50',
            'nilai_awal'       => 'sometimes|nullable|numeric',
            'nilai_target'     => 'sometimes|numeric',
            'satuan'           => 'sometimes|string|max:20',
            'tenggat_waktu'    => 'sometimes|nullable|date',
            'catatan_motivasi' => 'sometimes|nullable|string|max:255',
        ]);

        $target->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Target berhasil diperbarui',
            'data'    => $target,
        ]);
    }

    // Ubah status ketercapaian target sekaligus kirimkan pesan motivasi
    public function capai(Request $request, int $id)
    {
        $target = $this->cariTargetMilik($request, $id);

        $tercapai = $request->has('tercapai') ? $request->boolean('tercapai') : ! $target->tercapai;

        $target->update([
            'tercapai'      => $tercapai,
            'tercapai_pada' => $tercapai ? now() : null,
        ]);

        $motivasi = $tercapai
            ? ($target->catatan_motivasi ?: 'Selamat! Target kesehatan tercapai, pertahankan gaya hidup sehatmu!')
            : 'Target dikembalikan ke status aktif. Semangat berjuang kembali!';

        return response()->json([
            'success'  => true,
            'message'  => $motivasi,
            'data'     => $target,
            'motivasi' => $motivasi,
        ]);
    }

    // Hapus target kesehatan milik warga
    public function destroy(Request $request, int $id)
    {
        $target = $this->cariTargetMilik($request, $id);
        $target->delete();

        return response()->json([
            'success' => true,
            'message' => 'Target berhasil dihapus',
            'data'    => null,
        ]);
    }

    // Cari target kesehatan berdasarkan ID atau gagalkan dengan 404 jika bukan miliknya
    private function cariTargetMilik(Request $request, int $id): TargetKesehatan
    {
        $target = TargetKesehatan::where('user_id', $request->user()->id)->find($id);
        abort_unless($target, 404, 'Target tidak ditemukan.');

        return $target;
    }
}
