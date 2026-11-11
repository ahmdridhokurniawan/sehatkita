<?php

namespace App\Http\Controllers;

use App\Models\BadgePengguna;
use App\Models\PesertaProgram;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Modul Program Kesehatan — kontrak 12.
 * 12.1 GET    /program              -> daftar program
 * 12.2 POST   /program              -> buat program (admin_kelurahan, super_admin)
 * 12.3 POST   /program/{id}/peserta -> ikut program (user)
 * 12.4 PATCH  /program/{id}/peserta -> ubah status keikutsertaan
 */
class ProgramController extends Controller
{
    // GET /program — kontrak 12.1
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Program::withCount([
            'peserta as jumlah_peserta' => fn ($q) => $q->where('status', '!=', 'berhenti'),
        ]);

        // `status` dihitung dari mulai/selesai (kontrak 12.1), bukan kolom DB.
        $statusFilter = $request->query('status');
        $hariIni = now()->toDateString();

        if (in_array($statusFilter, ['akan_datang', 'berjalan', 'selesai'], true)) {
            $this->saringStatus($query, $statusFilter, $hariIni);
        }

        // User & admin kelurahan melihat program kota dan kelurahannya
        if ($user->role !== 'super_admin' && $user->wilayah_id) {
            $query->where(fn ($q) => $q->whereNull('wilayah_id')->orWhere('wilayah_id', $user->wilayah_id));
        } elseif ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->query('wilayah_id'));
        }

        if ($request->filled('jenis')) {
            $query->where('jenis', $request->query('jenis'));
        }

        $this->saringCari($query, ['judul'], $request);

        $list = $query->orderBy('mulai')->paginate($this->perHalaman($request));

        $milikSaya = PesertaProgram::whereIn('program_id', $list->pluck('id'))
            ->where('user_id', $user->id)
            ->pluck('status', 'program_id');

        $data = collect($list->items())->map(function (Program $p) use ($milikSaya, $user, $hariIni) {
            $statusSaya = $milikSaya[$p->id] ?? null;
            $ikut = $statusSaya !== null && $statusSaya !== 'berhenti';

            return [
                'id'                 => $p->id,
                'judul'              => $p->judul,
                'jenis'              => $p->jenis,
                'kategori_aktivitas' => $p->kategori_aktivitas,
                'target_peserta'     => $p->target_peserta,
                'jumlah_peserta'     => (int) $p->jumlah_peserta,
                'mulai'              => $p->mulai?->toDateString(),
                'selesai'            => $p->selesai?->toDateString(),
                'status'             => $this->statusProgram($p, $hariIni),
                'exp_reward'         => (int) $p->exp_reward,
                'badge_reward'       => $p->badge_reward,
                'exp'                => (int) $p->exp_reward,
                'badge'              => $p->badge_reward,

                // Hanya bermakna untuk role user (kontrak 12.1).
                'diikuti'            => $user->role === 'user' ? $ikut : false,
                'status_saya'        => $user->role === 'user' ? $statusSaya : null,
            ];
        })->all();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $data,
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // POST /program — kontrak 12.2
    public function store(Request $request)
    {
        $user = $request->user();

        abort_unless(in_array($user->role, ['admin_kelurahan', 'super_admin'], true),
            403, 'Hanya admin kelurahan atau super admin yang boleh membuat program.');

        // Normalisasi wilayah 0 menjadi null untuk super admin
        if ((int) $request->input('wilayah_id') === 0) {
            $request->merge(['wilayah_id' => null]);
        }

        // Dukungan alias exp & badge dari frontend
        if (! $request->has('exp_reward') && $request->has('exp')) {
            $request->merge(['exp_reward' => $request->input('exp')]);
        }
        if (! $request->has('badge_reward') && $request->has('badge')) {
            $request->merge(['badge_reward' => $request->input('badge')]);
        }

        // Validasi wilayah_id fleksibel (null untuk cakupan kota)
        $data = $request->validate([
            'wilayah_id'         => 'nullable|exists:wilayah,id',
            'judul'              => 'required|string|max:150',
            'jenis'              => ['required', Rule::in(['olahraga', 'edukasi', 'pemeriksaan', 'lainnya'])],
            'kategori_aktivitas' => 'nullable|string|max:50',
            'target_peserta'     => 'nullable|integer|min:1',
            'mulai'              => 'required|date',
            'selesai'            => 'nullable|date|after_or_equal:mulai',
            'exp_reward'         => 'nullable|integer|min:0|max:10000',
            'badge_reward'       => 'nullable|string|max:100',
        ], [
            'judul.required' => 'Judul program wajib diisi.',
            'mulai.required' => 'Tanggal mulai wajib diisi.',
        ]);

        // Admin kelurahan terkunci ke wilayahnya, super admin null (se-kota) jika kosong/0
        if ($user->role === 'admin_kelurahan') {
            $data['wilayah_id'] = $user->wilayah_id;
        } else {
            $wId = $request->input('wilayah_id');
            $data['wilayah_id'] = ($wId && (int) $wId > 0) ? (int) $wId : null;
        }

        // Kontrak: exp_reward default 50; status TIDAK diterima dari body.
        $data['exp_reward'] = $data['exp_reward'] ?? 50;
        unset($data['status']);

        $program = Program::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Program berhasil dibuat',
            'data'    => $this->baris($program->fresh(), null),
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $program = Program::findOrFail($id);

        $statusSaya = null;
        if ($user->role === 'user') {
            $statusSaya = PesertaProgram::where('program_id', $program->id)
                ->where('user_id', $user->id)
                ->value('status');
        }

        $detail = $this->baris($program, $statusSaya);

        if (in_array($user->role, ['kader', 'admin_kelurahan', 'super_admin'], true)) {
            $detail['peserta'] = PesertaProgram::with('pengguna:id,name,email')
                ->where('program_id', $program->id)
                ->orderBy('id', 'desc')
                ->get()
                ->map(fn ($p) => [
                    'id'             => $p->id,
                    'user_id'        => $p->user_id,
                    'name'           => $p->pengguna?->name,
                    'email'          => $p->pengguna?->email,
                    'status'         => $p->status,
                    'terdaftar_pada' => $p->created_at?->toIso8601String(),
                    'selesai_pada'   => $p->selesai_pada?->toIso8601String(),
                ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail program',
            'data'    => $detail,
        ]);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['admin_kelurahan', 'super_admin'], true), 403, 'Akses ditolak.');

        $program = Program::findOrFail($id);

        if ($user->role === 'admin_kelurahan') {
            abort_unless((int) $program->wilayah_id === (int) $user->wilayah_id, 403, 'Anda hanya dapat mengedit program kelurahan Anda.');
        }

        if ($request->has('wilayah_id') && (int) $request->input('wilayah_id') === 0) {
            $request->merge(['wilayah_id' => null]);
        }

        // Dukungan alias exp & badge dari frontend
        if (! $request->has('exp_reward') && $request->has('exp')) {
            $request->merge(['exp_reward' => $request->input('exp')]);
        }
        if (! $request->has('badge_reward') && $request->has('badge')) {
            $request->merge(['badge_reward' => $request->input('badge')]);
        }

        $data = $request->validate([
            'wilayah_id'         => 'sometimes|nullable|exists:wilayah,id',
            'judul'              => 'sometimes|string|max:150',
            'jenis'              => ['sometimes', Rule::in(['olahraga', 'edukasi', 'pemeriksaan', 'lainnya'])],
            'kategori_aktivitas' => 'sometimes|nullable|string|max:50',
            'target_peserta'     => 'sometimes|nullable|integer|min:1',
            'mulai'              => 'sometimes|date',
            'selesai'            => 'sometimes|nullable|date|after_or_equal:mulai',
            'status'             => ['sometimes', Rule::in(['akan_datang', 'berjalan', 'selesai'])],
            'exp_reward'         => 'sometimes|nullable|integer|min:0|max:10000',
            'badge_reward'       => 'sometimes|nullable|string|max:100',
        ]);

        if ($user->role === 'admin_kelurahan') {
            unset($data['wilayah_id']);
        }

        // Jika status diubah menjadi selesai tapi tanggal selesai tidak ditentukan
        if (isset($data['status']) && $data['status'] === 'selesai' && ! isset($data['selesai'])) {
            $hariIni = now()->toDateString();
            $data['selesai'] = ($program->mulai && $program->mulai->toDateString() > $hariIni)
                ? $program->mulai->toDateString()
                : $hariIni;
        }

        $program->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Program berhasil diperbarui',
            'data'    => $this->baris($program->fresh(), null),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['admin_kelurahan', 'super_admin'], true), 403, 'Akses ditolak.');

        $program = Program::findOrFail($id);

        if ($user->role === 'admin_kelurahan') {
            abort_unless((int) $program->wilayah_id === (int) $user->wilayah_id, 403, 'Anda hanya dapat menghapus program kelurahan Anda.');
        }

        $program->delete();

        return response()->json([
            'success' => true,
            'message' => 'Program berhasil dihapus',
            'data'    => null,
        ]);
    }

    // GET /program/{id}/peserta
    public function peserta(Request $request, int $id)
    {
        $user    = $request->user();
        $program = Program::findOrFail($id);

        if ($user->role === 'admin_kelurahan' && $program->wilayah_id) {
            abort_unless((int) $program->wilayah_id === (int) $user->wilayah_id, 403, 'Akses ditolak.');
        }

        $query = PesertaProgram::with('pengguna:id,name,email,wilayah_id')
            ->where('program_id', $program->id);

        if ($user->role === 'kader') {
            $query->whereHas('pengguna', function ($q) use ($user) {
                $q->where('wilayah_id', $user->wilayah_id);
            });
        }

        $list = $query->orderBy('id', 'desc')->get();

        $data = $list->map(fn ($p) => [
            'id'             => $p->id,
            'user_id'        => $p->user_id,
            'name'           => $p->pengguna?->name,
            'email'          => $p->pengguna?->email,
            'status'         => $p->status,
            'terdaftar_pada' => $p->created_at?->toIso8601String(),
            'selesai_pada'   => $p->selesai_pada?->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar peserta program',
            'data'    => $data,
        ]);
    }

    // POST /program/{id}/peserta — kontrak 12.3
    public function ikut(Request $request, int $id)
    {
        $user = $request->user();

        abort_unless($user->role === 'user', 403, 'Hanya user yang dapat mengikuti program.');

        $program = Program::findOrFail($id);

        if ($program->selesai && $program->selesai->isPast() && ! $program->selesai->isToday()) {
            throw ValidationException::withMessages([
                'program' => ['Program sudah berakhir.'],
            ]);
        }

        $sudah = PesertaProgram::where('program_id', $program->id)
            ->where('user_id', $user->id)
            ->first();

        // Kontrak 12.3: sudah terdaftar → 422.
        if ($sudah && $sudah->status !== 'berhenti') {
            throw ValidationException::withMessages([
                'program' => ['Anda sudah terdaftar pada program ini.'],
            ]);
        }

        if ($sudah) {
            // Berhenti lalu ikut lagi → aktifkan kembali.
            $sudah->update(['status' => 'terdaftar', 'selesai_pada' => null]);
        } else {
            PesertaProgram::create([
                'program_id' => $program->id,
                'user_id'    => $user->id,
                'status'     => 'terdaftar',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Berhasil mengikuti program',
            'data'    => ['status' => 'terdaftar'],
        ], 201);
    }

    // PATCH /program/{id}/peserta — kontrak 12.4
    public function ubahStatusPeserta(Request $request, int $id)
    {
        $user    = $request->user();
        $program = Program::findOrFail($id);

        $data = $request->validate([
            'status'  => ['required', Rule::in(['selesai', 'berhenti'])],
            'user_id' => 'nullable|integer|exists:pengguna,id',
        ]);

        $targetId = $user->id;

        // Aturan hak (kontrak 12.4).
        if ($data['status'] === 'selesai') {
            abort_unless(
                in_array($user->role, ['kader', 'admin_kelurahan', 'super_admin'], true),
                403,
                'Hanya kader/admin yang dapat menandai program selesai.'
            );

            if ($user->role === 'admin_kelurahan') {
                abort_unless((int) $program->wilayah_id === (int) $user->wilayah_id, 403,
                    'Program ini bukan wilayah Anda.');
            }

            if ($request->filled('user_id')) {
                $targetId = (int) $data['user_id'];
            }
        } else {
            // `berhenti`: user hanya untuk dirinya; staf boleh untuk warga.
            if ($request->filled('user_id') && (int) $data['user_id'] !== (int) $user->id) {
                abort_unless(
                    in_array($user->role, ['kader', 'admin_kelurahan', 'super_admin'], true),
                    403,
                    'Akses ditolak.'
                );
                $targetId = (int) $data['user_id'];
            }
        }

        $peserta = PesertaProgram::where('program_id', $program->id)
            ->where('user_id', $targetId)
            ->first();

        abort_unless($peserta, 404, 'Peserta belum terdaftar pada program ini.');

        // Idempoten: exp hanya diberikan sekali (kontrak 12.4).
        $sudahSelesai = $peserta->status === 'selesai';

        $peserta->status = $data['status'];
        if ($data['status'] === 'selesai') {
            $peserta->selesai_pada = $peserta->selesai_pada ?? now();
        }
        $peserta->save();

        $hasil = [
            'status'           => $peserta->status,
            'exp_didapat'      => 0,
            'exp_total'        => (int) $peserta->pengguna?->exp_total,
            'level_gamifikasi' => (int) $peserta->pengguna?->level_gamifikasi,
            'badge_baru'       => null,
        ];

        if ($data['status'] === 'selesai' && ! $sudahSelesai) {
            $hasil = DB::transaction(function () use ($peserta, $program) {
                $warga = $peserta->pengguna;

                $expLama   = (int) $warga->exp_total;
                $expDapat  = (int) $program->exp_reward;
                $expTotal  = $expLama + $expDapat;

                $warga->exp_total        = $expTotal;
                $warga->level_gamifikasi = $this->levelDariExp($expTotal);
                $warga->save();

                $badgeBaru = null;
                if ($program->badge_reward) {
                    $ada = BadgePengguna::where('user_id', $warga->id)
                        ->where('badge', $program->badge_reward)
                        ->exists();

                    if (! $ada) {
                        BadgePengguna::create([
                            'user_id'    => $warga->id,
                            'badge'      => $program->badge_reward,
                            'program_id' => $program->id,
                        ]);
                        $badgeBaru = $program->badge_reward;
                    }
                }

                return [
                    'status'           => 'selesai',
                    'exp_didapat'      => $expDapat,
                    'exp_total'        => $expTotal,
                    'level_gamifikasi' => $warga->level_gamifikasi,
                    'badge_baru'       => $badgeBaru,
                ];
            });
        }

        return response()->json([
            'success' => true,
            'message' => 'Status peserta diperbarui',
            'data'    => $hasil,
        ]);
    }

    /*
    |------------------------------------------------------------------
    | Helper
    |------------------------------------------------------------------
    */

    /** Satu baris program sesuai bentuk kontrak 12.1. */
    private function baris(Program $p, ?string $statusSaya): array
    {
        $ikut = $statusSaya !== null && $statusSaya !== 'berhenti';

        return [
            'id'                 => $p->id,
            'judul'              => $p->judul,
            'jenis'              => $p->jenis,
            'kategori_aktivitas' => $p->kategori_aktivitas,
            'target_peserta'     => $p->target_peserta,
            'jumlah_peserta'     => (int) ($p->jumlah_peserta ?? $p->peserta()->where('status', '!=', 'berhenti')->count()),
            'mulai'              => $p->mulai?->toDateString(),
            'selesai'            => $p->selesai?->toDateString(),
            'status'             => $this->statusProgram($p, now()->toDateString()),
            'exp_reward'         => (int) $p->exp_reward,
            'badge_reward'       => $p->badge_reward,
            'exp'                => (int) $p->exp_reward,
            'badge'              => $p->badge_reward,
            'diikuti'            => $ikut,
            'status_saya'        => $statusSaya,
        ];
    }

    /** status dihitung dari tanggal atau kolom status (kontrak 12.1). */
    private function statusProgram(Program $p, string $hariIni): string
    {
        if ($p->status === 'selesai') {
            return 'selesai';
        }

        $mulai   = $p->mulai?->toDateString();
        $selesai = $p->selesai?->toDateString();

        if ($mulai && $hariIni < $mulai) {
            return 'akan_datang';
        }

        if ($selesai && $hariIni > $selesai) {
            return 'selesai';
        }

        return 'berjalan';
    }

    private function saringStatus($query, string $status, string $hariIni): void
    {
        match ($status) {
            'akan_datang' => $query->where('status', '!=', 'selesai')->whereDate('mulai', '>', $hariIni),
            'selesai'     => $query->where(fn ($q) => $q->where('status', 'selesai')->orWhere(fn ($sub) => $sub->whereNotNull('selesai')->whereDate('selesai', '<', $hariIni))),
            default       => $query->where('status', '!=', 'selesai')
                                    ->whereDate('mulai', '<=', $hariIni)
                                    ->where(fn ($q) => $q->whereNull('selesai')->orWhereDate('selesai', '>=', $hariIni)),
        };
    }

    /** Level gamifikasi dari total EXP (kontrak 12.4; ambang 100 per level). */
    private function levelDariExp(int $exp): int
    {
        return max(1, (int) floor($exp / 100) + 1);
    }
}
