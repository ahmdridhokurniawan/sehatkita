<?php

namespace App\Http\Controllers;

use App\Models\BadgePengguna;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// Controller pengelolaan program kesehatan dan keikutsertaan warga
class ProgramController extends Controller
{
    // Tampilkan daftar program kesehatan sesuai peran dan status berjalan
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Program::withCount([
            'peserta as jumlah_peserta' => fn ($q) => $q->where('status', '!=', 'berhenti'),
        ]);

        $statusFilter = $request->query('status');
        $hariIni      = now()->toDateString();

        if (in_array($statusFilter, ['akan_datang', 'berjalan', 'selesai'], true)) {
            $this->saringStatus($query, $statusFilter, $hariIni);
        }

        // Warga dan admin kelurahan hanya melihat program kelurahannya dan tingkat kota
        if ($user->role !== 'super_admin' && $user->wilayah_id) {
            $query->where(fn ($q) => $q->whereNull('wilayah_id')->orWhere('wilayah_id', $user->wilayah_id));
        } elseif ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->query('wilayah_id'));
        }

        if ($request->filled('jenis')) {
            $query->where('jenis', $request->query('jenis'));
        }

        $this->saringCari($query, ['judul', 'kategori_aktivitas'], $request);

        $list = $query->orderBy('mulai')->paginate($this->perHalaman($request));

        $milikSaya = PesertaProgram::whereIn('program_id', $list->pluck('id'))
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('program_id');

        $isWarga = $user->role === 'user';
        $data    = collect($list->items())->map(function (Program $p) use ($milikSaya, $isWarga, $hariIni) {
            $pSaya = $isWarga ? $milikSaya->get($p->id) : null;

            return $this->baris($p, $pSaya?->status, $hariIni) + [
                'peserta_saya' => $isWarga ? $this->ringkasanPesertaSaya($pSaya, $p->id) : null,
            ];
        })->all();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $data,
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // Buat program kesehatan baru oleh admin kelurahan atau super admin
    public function store(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['admin_kelurahan', 'super_admin'], 'Hanya admin kelurahan atau super admin yang boleh membuat program.');

        $this->normalisasiAlias($request);

        $data = $request->validate([
            'wilayah_id'         => 'nullable|exists:wilayah,id',
            'judul'              => 'required|string|max:150',
            'deskripsi'          => 'nullable|string|max:2000',
            'kriteria_misi'      => 'nullable|string|max:500',
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

        // Kunci program admin kelurahan ke wilayahnya sendiri dan se-kota bila kosong
        if ($user->role === 'admin_kelurahan') {
            abort_unless($user->wilayah_id, 422, 'Akun admin kelurahan belum memiliki wilayah penugasan.');
            $data['wilayah_id'] = $user->wilayah_id;
        } else {
            $wId = $request->input('wilayah_id');
            $data['wilayah_id'] = ($wId && (int) $wId > 0) ? (int) $wId : null;
        }

        $data['exp_reward'] = $data['exp_reward'] ?? 50;
        // Setel status awal di DB selaras dengan rentang tanggal mulai dan selesai program
        $hariIni = now()->toDateString();
        $data['status'] = match (true) {
            $data['mulai'] > $hariIni                             => 'akan_datang',
            ! empty($data['selesai']) && $data['selesai'] < $hariIni => 'selesai',
            default                                               => 'berjalan',
        };

        $program = Program::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Program berhasil dibuat',
            'data'    => $this->baris($program->fresh(), null),
        ], 201);
    }

    // Ambil detail program beserta daftar peserta sesuai hak akses petugas
    public function show(Request $request, int $id)
    {
        $user    = $request->user();
        $program = Program::findOrFail($id);

        $pesertaSaya = null;
        if ($user->role === 'user') {
            $pesertaSaya = PesertaProgram::where('program_id', $program->id)
                ->where('user_id', $user->id)
                ->first();
        }

        $detail = $this->baris($program, $pesertaSaya?->status);
        $detail['peserta_saya'] = $user->role === 'user'
            ? $this->ringkasanPesertaSaya($pesertaSaya, $program->id)
            : null;

        if (in_array($user->role, ['kader', 'admin_kelurahan', 'super_admin'], true)) {
            $bolehLihat = $user->role === 'super_admin'
                || ! $program->wilayah_id
                || (int) $program->wilayah_id === (int) $user->wilayah_id;

            $detail['peserta'] = $bolehLihat ? $this->ambilDaftarPeserta($program, $user) : [];
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail program',
            'data'    => $detail,
        ]);
    }

    // Perbarui informasi atau status program oleh pengelola wilayah
    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['admin_kelurahan', 'super_admin']);

        $program = Program::findOrFail($id);

        if ($user->role === 'admin_kelurahan') {
            abort_unless((int) $program->wilayah_id === (int) $user->wilayah_id, 403, 'Anda hanya dapat mengedit program kelurahan Anda.');
        }

        $this->normalisasiAlias($request);

        $data = $request->validate([
            'wilayah_id'         => 'sometimes|nullable|exists:wilayah,id',
            'judul'              => 'sometimes|string|max:150',
            'deskripsi'          => 'sometimes|nullable|string|max:2000',
            'kriteria_misi'      => 'sometimes|nullable|string|max:500',
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

    // Hapus program kesehatan oleh pengelola wilayah yang berwenang
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['admin_kelurahan', 'super_admin']);

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

    // Tampilkan daftar peserta program sesuai cakupan wilayah petugas
    public function peserta(Request $request, int $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['kader', 'admin_kelurahan', 'super_admin'], 'Hanya kader atau admin yang dapat melihat daftar peserta.');

        $program = Program::findOrFail($id);

        if ($user->role !== 'super_admin' && $program->wilayah_id) {
            abort_unless((int) $program->wilayah_id === (int) $user->wilayah_id, 403, 'Akses ditolak.');
        }

        return response()->json([
            'success' => true,
            'message' => 'Daftar peserta program',
            'data'    => $this->ambilDaftarPeserta($program, $user),
        ]);
    }

    // POST /program/{id}/peserta — kontrak 12.3
    public function ikut(Request $request, int $id)
    {
        $user = $request->user();

        abort_unless($user->role === 'user', 403, 'Hanya user yang dapat mengikuti program.');

        $program = Program::findOrFail($id);

        if ($program->wilayah_id && (int) $program->wilayah_id !== (int) $user->wilayah_id) {
            abort(403, 'Program ini hanya untuk warga kelurahan terkait.');
        }

        if ($program->selesai && $program->selesai->isPast() && ! $program->selesai->isToday()) {
            throw ValidationException::withMessages([
                'program' => ['Program sudah berakhir.'],
            ]);
        }

        if ($program->target_peserta !== null
            && $program->peserta()->where('status', '!=', 'berhenti')->count() >= $program->target_peserta) {
            throw ValidationException::withMessages([
                'program' => ['Kuota peserta program sudah penuh.'],
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
            // Berhenti lalu ikut lagi → aktifkan kembali & bersihkan riwayat lama.
            $sudah->update([
                'status'             => 'terdaftar',
                'selesai_pada'       => null,
                'catatan_bukti'      => null,
                'dikirim_pada'       => null,
                'catatan_verifikasi' => null,
                'diverifikasi_oleh'  => null,
                'diverifikasi_pada'  => null,
            ]);
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

    // POST /program/{id}/bukti — unggah foto dokumentasi penyelesaian misi
    public function kirimBukti(Request $request, int $id)
    {
        $user = $request->user();
        abort_unless($user->role === 'user', 403, 'Hanya warga peserta yang dapat mengirim bukti tantangan.');

        $program = Program::findOrFail($id);

        $peserta = PesertaProgram::where('program_id', $program->id)
            ->where('user_id', $user->id)
            ->first();

        abort_unless($peserta && $peserta->status !== 'berhenti', 404, 'Anda belum terdaftar pada tantangan ini.');

        if ($peserta->status === 'selesai') {
            throw ValidationException::withMessages([
                'program' => ['Tantangan ini sudah terverifikasi selesai.'],
            ]);
        }

        $validated = $request->validate([
            'foto'          => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'catatan_bukti' => 'nullable|string|max:500',
        ], [
            'foto.required' => 'Foto dokumentasi penyelesaian tantangan wajib diunggah.',
            'foto.image'    => 'File dokumentasi harus berupa gambar (JPG, PNG, atau WebP).',
            'foto.max'      => 'Ukuran foto maksimal 5 MB.',
        ]);

        if ($peserta->bukti_foto) {
            foreach (['local', 'public'] as $disk) {
                if (Storage::disk($disk)->exists($peserta->bukti_foto)) {
                    Storage::disk($disk)->delete($peserta->bukti_foto);
                }
            }
        }

        $path = $request->file('foto')->store("program-bukti/{$program->id}", 'local');

        $peserta->update([
            'bukti_foto'         => $path,
            'catatan_bukti'      => $validated['catatan_bukti'] ?? null,
            'dikirim_pada'       => now(),
            'status'             => 'menunggu_verifikasi',
            'catatan_verifikasi' => null,
            'diverifikasi_oleh'  => null,
            'diverifikasi_pada'  => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dokumentasi berhasil dikirim dan menunggu verifikasi kader/admin.',
            'data'    => $this->ringkasanPesertaSaya($peserta->fresh(), $program->id),
        ]);
    }

    // GET /program/{id}/bukti/{pesertaId} — tampilkan foto dokumentasi bukti
    public function lihatBukti(Request $request, int $id, int $pesertaId)
    {
        $user = $request->user();
        $program = Program::findOrFail($id);
        $peserta = PesertaProgram::with('pengguna:id,wilayah_id')
            ->where('program_id', $program->id)
            ->where('id', $pesertaId)
            ->firstOrFail();

        $programSamaWilayah = ! $program->wilayah_id || (int) $program->wilayah_id === (int) $user->wilayah_id;
        $wargaSamaWilayah = $peserta->pengguna?->wilayah_id !== null
            && (int) $peserta->pengguna->wilayah_id === (int) $user->wilayah_id;

        $boleh = (int) $peserta->user_id === (int) $user->id
            || $user->role === 'super_admin'
            || ($user->role === 'admin_kelurahan' && $programSamaWilayah)
            || ($user->role === 'kader' && $programSamaWilayah && $wargaSamaWilayah);

        abort_unless($boleh, 403, 'Anda tidak memiliki akses melihat dokumentasi ini.');
        abort_unless($peserta->bukti_foto, 404, 'Foto bukti tidak ditemukan.');

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($peserta->bukti_foto)) {
                return Storage::disk($disk)->response($peserta->bukti_foto);
            }
        }

        abort(404, 'Foto bukti tidak ditemukan.');
    }

    // PATCH /program/{id}/peserta — kontrak 12.4 + verifikasi bukti (selesai/ditolak)
    public function ubahStatusPeserta(Request $request, int $id)
    {
        $user    = $request->user();
        $program = Program::findOrFail($id);

        $data = $request->validate([
            'status'             => ['required', Rule::in(['selesai', 'ditolak', 'berhenti'])],
            'user_id'            => 'nullable|integer|exists:pengguna,id',
            'catatan_verifikasi' => 'nullable|string|max:500',
        ]);

        $targetId = $user->id;

        // Aturan hak (kontrak 12.4).
        if (in_array($data['status'], ['selesai', 'ditolak'], true)) {
            abort_unless(
                in_array($user->role, ['kader', 'admin_kelurahan', 'super_admin'], true),
                403,
                'Hanya kader/admin yang dapat memverifikasi penyelesaian tantangan.'
            );

            if ($user->role !== 'super_admin' && $program->wilayah_id) {
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

        $peserta = PesertaProgram::with('pengguna:id,wilayah_id,exp_total,level_gamifikasi')
            ->where('program_id', $program->id)
            ->where('user_id', $targetId)
            ->first();

        abort_unless($peserta, 404, 'Peserta belum terdaftar pada program ini.');

        if ($user->role === 'kader' && $targetId !== (int) $user->id) {
            abort_unless(
                $peserta->pengguna && (int) $peserta->pengguna->wilayah_id === (int) $user->wilayah_id,
                403,
                'Peserta ini bukan warga wilayah Anda.'
            );
        }

        // Bungkus pembaruan status dan pemberian EXP/badge dalam satu transaksi atomik agar idempoten tanpa celah gagal parsial
        $hasil = DB::transaction(function () use ($peserta, $program, $data, $user, $request) {
            $terkunci     = PesertaProgram::whereKey($peserta->id)->lockForUpdate()->firstOrFail();
            $sudahSelesai = $terkunci->status === 'selesai';

            $terkunci->status = $data['status'];
            if ($data['status'] === 'selesai') {
                $terkunci->selesai_pada      = $terkunci->selesai_pada ?? now();
                $terkunci->diverifikasi_oleh = $user->id;
                $terkunci->diverifikasi_pada = now();
                if ($request->filled('catatan_verifikasi')) {
                    $terkunci->catatan_verifikasi = $data['catatan_verifikasi'];
                }
            } elseif ($data['status'] === 'ditolak') {
                $terkunci->selesai_pada       = null;
                $terkunci->diverifikasi_oleh  = $user->id;
                $terkunci->diverifikasi_pada  = now();
                $terkunci->catatan_verifikasi = $data['catatan_verifikasi'] ?: 'Foto bukti belum sesuai kriteria misi. Silakan kirim ulang.';
            }
            $terkunci->save();

            $warga = Pengguna::whereKey($terkunci->user_id)->lockForUpdate()->firstOrFail();

            if ($data['status'] !== 'selesai' || $sudahSelesai) {
                return [
                    'status'           => $terkunci->status,
                    'exp_didapat'      => 0,
                    'exp_total'        => (int) $warga->exp_total,
                    'level_gamifikasi' => (int) $warga->level_gamifikasi,
                    'badge_baru'       => null,
                ];
            }

            $expLama  = (int) $warga->exp_total;
            $expDapat = (int) $program->exp_reward;
            $expTotal = $expLama + $expDapat;

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

        return response()->json([
            'success' => true,
            'message' => 'Status peserta diperbarui',
            'data'    => $hasil,
        ]);
    }

    // ================= HELPER =================

    // Samakan alias exp/badge dan nilai wilayah 0 menjadi format resmi backend
    private function normalisasiAlias(Request $request): void
    {
        if ($request->has('wilayah_id') && (int) $request->input('wilayah_id') === 0) {
            $request->merge(['wilayah_id' => null]);
        }
        if (! $request->has('exp_reward') && $request->has('exp')) {
            $request->merge(['exp_reward' => $request->input('exp')]);
        }
        if (! $request->has('badge_reward') && $request->has('badge')) {
            $request->merge(['badge_reward' => $request->input('badge')]);
        }
    }

    // Ambil dan format daftar peserta program sesuai prioritas verifikasi dan wilayah petugas
    private function ambilDaftarPeserta(Program $program, Pengguna $user)
    {
        $query = PesertaProgram::with('pengguna:id,name,email,wilayah_id')
            ->where('program_id', $program->id);

        if ($user->role === 'kader') {
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
        }

        return $query
            ->orderByRaw("CASE status WHEN 'menunggu_verifikasi' THEN 0 WHEN 'terdaftar' THEN 1 WHEN 'ditolak' THEN 2 WHEN 'selesai' THEN 3 ELSE 4 END")
            ->orderBy('id', 'desc')
            ->get()
            ->map(fn ($p) => $this->barisPeserta($p, $program->id));
    }

    // Format satu baris program beserta status berjalan dan keikutsertaan pengguna
    private function baris(Program $p, ?string $statusSaya, ?string $hariIni = null): array
    {
        $ikut = $statusSaya !== null && $statusSaya !== 'berhenti';

        return [
            'id'                 => $p->id,
            'judul'              => $p->judul,
            'deskripsi'          => $p->deskripsi,
            'kriteria_misi'      => $p->kriteria_misi,
            'jenis'              => $p->jenis,
            'kategori_aktivitas' => $p->kategori_aktivitas,
            'target_peserta'     => $p->target_peserta,
            'jumlah_peserta'     => (int) ($p->jumlah_peserta ?? $p->peserta()->where('status', '!=', 'berhenti')->count()),
            'mulai'              => $p->mulai?->toDateString(),
            'selesai'            => $p->selesai?->toDateString(),
            'status'             => $this->statusProgram($p, $hariIni ?? now()->toDateString()),
            'exp_reward'         => (int) $p->exp_reward,
            'badge_reward'       => $p->badge_reward,
            'exp'                => (int) $p->exp_reward,
            'badge'              => $p->badge_reward,
            'diikuti'            => $ikut,
            'status_saya'        => $statusSaya,
        ];
    }

    // Format baris data peserta beserta tautan foto bukti dan catatan verifikasi
    private function barisPeserta(PesertaProgram $p, int $programId): array
    {
        return [
            'id'                 => $p->id,
            'user_id'            => $p->user_id,
            'name'               => $p->pengguna?->name,
            'email'              => $p->pengguna?->email,
            'status'             => $p->status,
            'bukti_foto_url'     => $p->bukti_foto ? "/api/v1/program/{$programId}/bukti/{$p->id}" : null,
            'catatan_bukti'      => $p->catatan_bukti,
            'dikirim_pada'       => $p->dikirim_pada?->toIso8601String(),
            'catatan_verifikasi' => $p->catatan_verifikasi,
            'diverifikasi_pada'  => $p->diverifikasi_pada?->toIso8601String(),
            'terdaftar_pada'     => $p->created_at?->toIso8601String(),
            'selesai_pada'       => $p->selesai_pada?->toIso8601String(),
        ];
    }

    // Format ringkasan keikutsertaan dan status bukti milik pengguna sendiri
    private function ringkasanPesertaSaya(?PesertaProgram $p, int $programId): ?array
    {
        if (! $p) {
            return null;
        }

        return [
            'id'                 => $p->id,
            'status'             => $p->status,
            'bukti_foto_url'     => $p->bukti_foto ? "/api/v1/program/{$programId}/bukti/{$p->id}" : null,
            'catatan_bukti'      => $p->catatan_bukti,
            'dikirim_pada'       => $p->dikirim_pada?->toIso8601String(),
            'catatan_verifikasi' => $p->catatan_verifikasi,
            'diverifikasi_pada'  => $p->diverifikasi_pada?->toIso8601String(),
            'selesai_pada'       => $p->selesai_pada?->toIso8601String(),
        ];
    }

    // Hitung status program secara dinamis berdasarkan rentang tanggal pelaksanaan
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

    // Terapkan filter status program langsung pada query SQL
    private function saringStatus($query, string $status, string $hariIni): void
    {
        match ($status) {
            'akan_datang' => $query->where('status', '!=', 'selesai')->whereDate('mulai', '>', $hariIni),
            'selesai'     => $query->where(fn ($q) => $q->where('status', 'selesai')->orWhere(fn ($sub) => $sub->whereNotNull('selesai')->whereDate('selesai', '<', $hariIni))),
            default       => $query->sedangBerjalan($hariIni),
        };
    }

    // Hitung level gamifikasi dengan kenaikan tiap kelipatan 100 EXP
    private function levelDariExp(int $exp): int
    {
        return max(1, (int) floor($exp / 100) + 1);
    }
}
