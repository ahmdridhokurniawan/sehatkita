<?php

namespace App\Http\Controllers;

use App\Models\PesertaProgram;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Modul Program Kesehatan — kontrak 12 & 30.
 * 12.1 GET    /program              -> daftar program
 * 12.2 POST   /program              -> buat program (admin_kelurahan, super_admin)
 * 12.3 POST   /program/{id}/peserta -> ikut program (user)
 * 12.4 PATCH  /program/{id}/peserta -> ubah status keikutsertaan
 */
class ProgramController extends Controller
{
    // GET /program
    public function index(Request $request)
    {
        $user = $request->user();

        // withCount menghitung peserta dalam satu query (hindari N+1).
        $query = Program::withCount('peserta')->with('wilayah');

        foreach (['status', 'jenis', 'wilayah_id'] as $kolom) {
            if ($request->filled($kolom)) {
                $query->where($kolom, $request->query($kolom));
            }
        }

        $this->saringCari($query, ['judul'], $request);

        $list = $query->orderBy('mulai')->paginate($this->perHalaman($request));

        // Tandai `diikuti` untuk semua baris halaman ini (lebih hemat dari exists).
        $diikuti = PesertaProgram::whereIn('program_id', $list->pluck('id'))
            ->where('user_id', $user->id)
            ->pluck('program_id');

        $data = collect($list->items())->map(function (Program $p) use ($diikuti) {
            return [
                'id'              => $p->id,
                'judul'           => $p->judul,
                'jenis'           => $p->jenis,
                'target_peserta'  => $p->target_peserta,
                'jumlah_peserta'  => (int) $p->peserta_count,
                'mulai'           => $p->mulai?->toDateString(),
                'selesai'         => $p->selesai?->toDateString(),
                'status'          => $p->status,
                'diikuti'         => $diikuti->contains($p->id),

                // 4 field reward, kontrak 30.
                'badge'           => $p->badge,
                'exp'             => (int) $p->exp,
                'level'           => (int) $p->level,
                'label_level'     => $p->labelLevel(),
                'rank_kelurahan'  => $p->rank_kelurahan,
            ];
        })->all();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $data,
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // POST /program
    public function store(Request $request)
    {
        $user = $request->user();

        abort_unless(in_array($user->role, ['admin_kelurahan', 'super_admin'], true),
            403, 'Hanya admin kelurahan atau super admin yang boleh membuat program.');

        $data = $request->validate([
            'wilayah_id'     => 'required|exists:wilayah,id',
            'judul'          => 'required|string|max:150',
            'jenis'          => ['required', Rule::in(['olahraga', 'edukasi', 'pemeriksaan', 'lainnya'])],
            'target_peserta' => 'nullable|integer|min:1',
            'mulai'          => 'required|date',
            'selesai'        => 'nullable|after_or_equal:mulai',
            'status'         => ['nullable', Rule::in(['akan_datang', 'berjalan', 'selesai'])],
        ], [
            'judul.required' => 'Judul program wajib diisi.',
            'mulai.required' => 'Tanggal mulai wajib diisi.',
        ]);

        // admin_kelurahan tidak boleh membuat program untuk kelurahan lain.
        if ($user->role === 'admin_kelurahan') {
            $data['wilayah_id'] = $user->wilayah_id;
        }

        $program = Program::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Program berhasil dibuat',
            'data'    => [
                'id' => $program->id,
                'judul' => $program->judul,
                'jenis' => $program->jenis,
                'target_peserta' => $program->target_peserta,
                'jumlah_peserta' => 0,
                'mulai' => $program->mulai?->toDateString(),
                'selesai' => $program->selesai?->toDateString(),
                'status' => $program->status,
                'diikuti' => false,
                'badge' => $program->badge,
                'exp' => (int) $program->exp,
                'level' => (int) $program->level,
                'rank_kelurahan' => $program->rank_kelurahan,
            ],
        ], 201);
    }

    // POST /program/{id}/peserta — user ikut program
    public function ikut(Request $request, int $id)
    {
        $user = $request->user();

        // Matriks 16: hanya user (dan admin sesuai scope) yang ikut program.
        abort_unless(in_array($user->role, ['user', 'admin_kelurahan', 'super_admin'], true), 403, 'Hanya user yang dapat mengikuti program.');

        $program = Program::findOrFail($id);

        // firstOrCreate = aman dari duplikat (unique program_id+user_id di DB).
        $peserta = PesertaProgram::firstOrCreate(
            ['program_id' => $program->id, 'user_id' => $user->id],
            ['status' => 'terdaftar']
        );

        return response()->json([
            'success' => true,
            'message' => 'Berhasil mengikuti program',
            'data'    => ['status' => $peserta->status],
        ], 201);
    }

    // PATCH /program/{id}/peserta — ubah status keikutsertaan
    public function ubahStatusPeserta(Request $request, int $id)
    {
        $user    = $request->user();
        $program = Program::findOrFail($id);

        $data = $request->validate([
            'status'  => ['required', Rule::in(['terdaftar', 'selesai', 'berhenti'])],
            'user_id' => 'nullable|exists:pengguna,id',
        ]);

        // Default: ubah keikutsertaan diri sendiri.
        $targetId = $user->id;

        // Admin boleh mengubah peserta lain, wajib kirim user_id.
        if (in_array($user->role, ['admin_kelurahan', 'super_admin'], true)) {
            abort_unless($request->filled('user_id'), 422, 'user_id wajib diisi admin.');

            if ($user->role === 'admin_kelurahan') {
                abort_unless(
                    $program->wilayah_id === $user->wilayah_id,
                    403,
                    'Program ini bukan wilayah Anda.'
                );
            }

            $targetId = (int) $data['user_id'];
        }

        $peserta = PesertaProgram::where('program_id', $program->id)
            ->where('user_id', $targetId)
            ->first();

        abort_unless($peserta, 404, 'Peserta belum terdaftar pada program ini.');

        $peserta->status = $data['status'];
        if ($data['status'] === 'selesai') {
            $peserta->selesai_pada = now();
        }
        $peserta->save();

        return response()->json([
            'success' => true,
            'message' => 'Status peserta diperbarui',
            'data'    => [
                'status'       => $peserta->status,
                'selesai_pada' => $peserta->selesai_pada?->toIso8601String(),
            ],
        ]);
    }
}