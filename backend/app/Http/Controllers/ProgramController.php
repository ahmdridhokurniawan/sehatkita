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

        foreach (['jenis', 'wilayah_id'] as $kolom) {
            if ($request->filled($kolom)) {
                $query->where($kolom, $request->query($kolom));
            }
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

        $data = $request->validate([
            'wilayah_id'         => 'required|exists:wilayah,id',
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

        // admin_kelurahan tidak boleh membuat program untuk kelurahan lain.
        if ($user->role === 'admin_kelurahan') {
            $data['wilayah_id'] = $user->wilayah_id;
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
            'diikuti'            => $ikut,
            'status_saya'        => $statusSaya,
        ];
    }

    /** status dihitung dari tanggal (kontrak 12.1). */
    private function statusProgram(Program $p, string $hariIni): string
    {
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
            'akan_datang' => $query->whereDate('mulai', '>', $hariIni),
            'selesai'     => $query->whereNotNull('selesai')->whereDate('selesai', '<', $hariIni),
            default       => $query->whereDate('mulai', '<=', $hariIni)
                                    ->where(fn ($q) => $q->whereNull('selesai')->orWhereDate('selesai', '>=', $hariIni)),
        };
    }

    /** Level gamifikasi dari total EXP (kontrak 12.4; ambang 100 per level). */
    private function levelDariExp(int $exp): int
    {
        return max(1, (int) floor($exp / 100) + 1);
    }
}
