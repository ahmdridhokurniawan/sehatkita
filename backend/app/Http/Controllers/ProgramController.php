<?php

namespace App\Http\Controllers;

use App\Models\BadgePengguna;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Program;
use App\Services\BadgeKeaktifanService;
use App\Services\PeringkatService;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// Mengurus tantangan hidup sehat, pendaftaran peserta, progres pribadi, foto bukti kegiatan, dan persetujuan petugas.
class ProgramController extends Controller
{
    private const MAKS_FOTO_BUKTI = 5;

    public function __construct(
        private TelegramService $telegram,
        private BadgeKeaktifanService $badges,
        private PeringkatService $peringkat
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();

        $query = Program::withCount([
            'peserta as jumlah_peserta' => fn ($q) => $q->where('status', '!=', 'berhenti'),
        ]);

        $statusFilter = $request->query('status');
        $hariIni = now()->toDateString();

        if (in_array($statusFilter, ['akan_datang', 'berjalan', 'selesai'], true)) {
            $this->saringStatus($query, $statusFilter, $hariIni);
        }

        if ($user->role !== 'super_admin' && $user->wilayah_id) {
            $query->where(fn ($q) => $q->whereNull('wilayah_id')->orWhere('wilayah_id', $user->wilayah_id));
        } elseif ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->query('wilayah_id'));
        }

        if ($request->filled('jenis')) {
            $query->where('jenis', $request->query('jenis'));
        }

        if ($request->filled('exclude_jenis')) {
            $kecuali = array_filter(array_map('trim', explode(',', (string) $request->query('exclude_jenis'))));
            if ($kecuali !== []) {
                $query->whereNotIn('jenis', $kecuali);
            }
        }

        $this->saringCari($query, ['judul', 'kategori_aktivitas'], $request);

        $isWarga = $user->role === 'user';
        $kondisiSelesai = "status = 'selesai' OR (selesai IS NOT NULL AND DATE(selesai) < ?)";
        $params = [$hariIni];

        if ($isWarga) {
            $kondisiSelesai .= " OR EXISTS (SELECT 1 FROM peserta_program WHERE peserta_program.program_id = program.id AND peserta_program.user_id = ? AND peserta_program.status = 'selesai')";
            $params[] = $user->id;
        }
        $params[] = $hariIni;

        $list = $query
            ->orderByRaw("CASE WHEN ({$kondisiSelesai}) THEN 2 WHEN DATE(mulai) > ? THEN 1 ELSE 0 END", $params)
            ->orderBy('mulai')
            ->paginate($this->perHalaman($request));

        $milikSaya = PesertaProgram::whereIn('program_id', $list->pluck('id'))
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('program_id');

        $data = collect($list->items())->map(function (Program $p) use ($milikSaya, $isWarga, $hariIni) {
            $pSaya = $isWarga ? $milikSaya->get($p->id) : null;

            return $this->baris($p, $pSaya?->status, $hariIni) + [
                'peserta_saya' => $isWarga ? $this->ringkasanPesertaSaya($pSaya, $p->id) : null,
            ];
        })->all();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $data,
            'meta' => $this->metaPaginasi($list),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['admin_kelurahan', 'super_admin'], 'Hanya admin kelurahan atau super admin yang boleh membuat program.');

        $this->normalisasiAlias($request);

        $data = $request->validate([
            'wilayah_id' => 'nullable|exists:wilayah,id',
            'judul' => 'required|string|max:150',
            'deskripsi' => 'nullable|string|max:2000',
            'kriteria_misi' => 'nullable|string|max:500',
            'jenis' => ['required', Rule::in(['olahraga', 'edukasi', 'pemeriksaan', 'lainnya'])],
            'kategori_aktivitas' => ['nullable', 'string', 'max:50', Rule::requiredIf(fn () => $request->input('jenis') === 'lainnya')],
            'target_peserta' => 'nullable|integer|min:1',
            'mulai' => 'required|date',
            'selesai' => 'required|date|after_or_equal:mulai',
            'exp_reward' => 'required|integer|min:1|max:10000',
            'badge_reward' => 'nullable|string|max:100',
        ], [
            'judul.required' => 'Judul program wajib diisi.',
            'mulai.required' => 'Tanggal mulai wajib diisi.',
            'selesai.required' => 'Tanggal selesai (tenggat) wajib diisi.',
            'selesai.after_or_equal' => 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
            'exp_reward.required' => 'Reward EXP wajib diisi.',
            'exp_reward.min' => 'Reward EXP minimal 1 poin.',
            'kategori_aktivitas.required' => 'Kategori aktivitas wajib diisi saat memilih jenis Lainnya.',
        ]);

        if ($user->role === 'admin_kelurahan') {
            abort_unless($user->wilayah_id, 422, 'Akun admin kelurahan belum memiliki wilayah penugasan.');
            $data['wilayah_id'] = $user->wilayah_id;
        } else {
            $wId = $request->input('wilayah_id');
            $data['wilayah_id'] = ($wId && (int) $wId > 0) ? (int) $wId : null;
        }

        $data['exp_reward'] = $data['exp_reward'] ?? 50;

        $hariIni = now()->toDateString();
        $data['status'] = match (true) {
            $data['mulai'] > $hariIni => 'akan_datang',
            ! empty($data['selesai']) && $data['selesai'] < $hariIni => 'selesai',
            default => 'berjalan',
        };

        $program = Program::create($data);

        if ($program->status !== 'selesai') {
            $periodeSelesai = $program->selesai ? " s.d. {$program->selesai}" : '';
            $this->telegram->siarkanKeWilayah(
                $program->wilayah_id ? (int) $program->wilayah_id : null,
                'Program & Tantangan Kesehatan Baru',
                "Ada program baru: {$program->judul}\n"
                ."Periode: {$program->mulai}{$periodeSelesai}\n"
                ."Reward: +{$program->exp_reward} EXP"
                .($program->badge_reward ? " & Badge {$program->badge_reward}" : '')."\n\n"
                .'Yuk daftar dan selesaikan misinya di aplikasi SehatKita!'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Program berhasil dibuat',
            'data' => $this->baris($program->fresh(), null),
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $user = $request->user();
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
            'data' => $detail,
        ]);
    }

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
            'wilayah_id' => 'sometimes|nullable|exists:wilayah,id',
            'judul' => 'sometimes|string|max:150',
            'deskripsi' => 'sometimes|nullable|string|max:2000',
            'kriteria_misi' => 'sometimes|nullable|string|max:500',
            'jenis' => ['sometimes', Rule::in(['olahraga', 'edukasi', 'pemeriksaan', 'lainnya'])],
            'kategori_aktivitas' => 'sometimes|nullable|string|max:50',
            'target_peserta' => 'sometimes|nullable|integer|min:1',
            'mulai' => 'sometimes|date',
            'selesai' => 'sometimes|required|date|after_or_equal:mulai',
            'status' => ['sometimes', Rule::in(['akan_datang', 'berjalan', 'selesai'])],
            'exp_reward' => 'sometimes|required|integer|min:1|max:10000',
            'badge_reward' => 'sometimes|nullable|string|max:100',
        ], [
            'selesai.required' => 'Tanggal selesai (tenggat) wajib diisi.',
            'selesai.after_or_equal' => 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
            'exp_reward.required' => 'Reward EXP wajib diisi.',
            'exp_reward.min' => 'Reward EXP minimal 1 poin.',
        ]);

        $jenisAkhir = $data['jenis'] ?? $program->jenis;
        $kategoriAkhir = array_key_exists('kategori_aktivitas', $data)
            ? $data['kategori_aktivitas']
            : $program->kategori_aktivitas;
        if ($jenisAkhir === 'lainnya' && trim((string) $kategoriAkhir) === '') {
            throw ValidationException::withMessages([
                'kategori_aktivitas' => ['Kategori aktivitas wajib diisi saat memilih jenis Lainnya.'],
            ]);
        }

        if ($user->role === 'admin_kelurahan') {
            unset($data['wilayah_id']);
        }

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
            'data' => $this->baris($program->fresh(), null),
        ]);
    }

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
            'data' => null,
        ]);
    }

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
            'data' => $this->ambilDaftarPeserta($program, $user),
        ]);
    }

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

        if ($sudah && $sudah->status !== 'berhenti') {
            throw ValidationException::withMessages([
                'program' => ['Anda sudah terdaftar pada program ini.'],
            ]);
        }

        if ($sudah) {

            $this->hapusSemuaFileBukti($this->daftarPathBukti($sudah));
            $sudah->update([
                'status' => 'terdaftar',
                'selesai_pada' => null,
                'bukti_foto' => null,
                'bukti_foto_daftar' => null,
                'catatan_bukti' => null,
                'dikirim_pada' => null,
                'catatan_verifikasi' => null,
                'diverifikasi_oleh' => null,
                'diverifikasi_pada' => null,
            ]);
        } else {
            PesertaProgram::create([
                'program_id' => $program->id,
                'user_id' => $user->id,
                'status' => 'terdaftar',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Berhasil mengikuti program',
            'data' => ['status' => 'terdaftar'],
        ], 201);
    }

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

        $fotoTunggalAtauArray = $request->file('foto');
        $rules = [
            'fotos' => 'nullable|array|max:'.self::MAKS_FOTO_BUKTI,
            'fotos.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'foto.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'catatan_bukti' => 'nullable|string|max:500',
        ];
        if ($request->hasFile('foto')) {
            $rules['foto'] = is_array($fotoTunggalAtauArray)
                ? 'array|max:'.self::MAKS_FOTO_BUKTI
                : 'image|mimes:jpg,jpeg,png,webp|max:5120';
        }

        $validated = $request->validate($rules, [
            'foto.image' => 'File dokumentasi harus berupa gambar (JPG, PNG, atau WebP).',
            'foto.max' => 'Ukuran foto maksimal 5 MB.',
            'foto.*.image' => 'Setiap file dokumentasi harus berupa gambar (JPG, PNG, atau WebP).',
            'foto.*.max' => 'Ukuran setiap foto maksimal 5 MB.',
            'fotos.*.image' => 'Setiap file dokumentasi harus berupa gambar (JPG, PNG, atau WebP).',
            'fotos.*.max' => 'Ukuran setiap foto maksimal 5 MB.',
        ]);

        $files = array_values(array_merge(
            is_array($fotoTunggalAtauArray) ? $fotoTunggalAtauArray : ($fotoTunggalAtauArray ? [$fotoTunggalAtauArray] : []),
            is_array($request->file('fotos')) ? $request->file('fotos') : []
        ));

        if ($files === []) {
            throw ValidationException::withMessages([
                'foto' => ['Foto dokumentasi penyelesaian tantangan wajib diunggah.'],
            ]);
        }

        $existing = $this->daftarPathBukti($peserta);
        if (count($existing) + count($files) > self::MAKS_FOTO_BUKTI) {
            throw ValidationException::withMessages([
                'foto' => ['Maksimal '.self::MAKS_FOTO_BUKTI.' foto dokumentasi per tantangan. Hapus foto lama terlebih dahulu bila ingin mengganti.'],
            ]);
        }

        $semua = $existing;
        foreach ($files as $file) {
            $semua[] = $file->store("program-bukti/{$program->id}", 'local');
        }

        $peserta->update([
            'bukti_foto' => $semua[0] ?? null,
            'bukti_foto_daftar' => $semua,
            'catatan_bukti' => $validated['catatan_bukti'] ?? $peserta->catatan_bukti,
            'dikirim_pada' => now(),
            'status' => 'menunggu_verifikasi',
            'catatan_verifikasi' => null,
            'diverifikasi_oleh' => null,
            'diverifikasi_pada' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dokumentasi berhasil dikirim dan menunggu verifikasi kader/admin.',
            'data' => $this->ringkasanPesertaSaya($peserta->fresh(), $program->id),
        ]);
    }

    public function hapusBukti(Request $request, int $id)
    {
        $user = $request->user();
        abort_unless($user->role === 'user', 403, 'Hanya warga peserta yang dapat menghapus foto bukti tantangan.');

        $program = Program::findOrFail($id);

        $peserta = PesertaProgram::where('program_id', $program->id)
            ->where('user_id', $user->id)
            ->first();

        abort_unless($peserta && $peserta->status !== 'berhenti', 404, 'Anda belum terdaftar pada tantangan ini.');

        if ($peserta->status === 'selesai') {
            throw ValidationException::withMessages([
                'program' => ['Foto dokumentasi tantangan yang sudah selesai diverifikasi tidak dapat dihapus.'],
            ]);
        }

        $daftar = $this->daftarPathBukti($peserta);
        abort_unless($daftar !== [], 404, 'Belum ada foto dokumentasi yang dapat dihapus.');

        $idxRaw = $request->query('index', $request->input('index'));
        $sisa = [];

        if ($idxRaw !== null && $idxRaw !== '') {
            if (! is_numeric($idxRaw) || (int) $idxRaw < 0 || (int) $idxRaw >= count($daftar)) {
                abort(404, 'Foto dokumentasi tidak ditemukan.');
            }
            $idx = (int) $idxRaw;
            $this->hapusFileBukti($daftar[$idx]);
            array_splice($daftar, $idx, 1);
            $sisa = array_values($daftar);
        } else {
            $this->hapusSemuaFileBukti($daftar);
        }

        $atribut = [
            'bukti_foto' => $sisa[0] ?? null,
            'bukti_foto_daftar' => $sisa !== [] ? $sisa : null,
        ];

        if ($sisa === []) {
            $atribut += [
                'catatan_bukti' => null,
                'dikirim_pada' => null,
                'status' => 'terdaftar',
                'catatan_verifikasi' => null,
                'diverifikasi_oleh' => null,
                'diverifikasi_pada' => null,
            ];
        }

        $peserta->update($atribut);

        return response()->json([
            'success' => true,
            'message' => $sisa === [] ? 'Semua foto dokumentasi berhasil dihapus.' : 'Foto dokumentasi terpilih berhasil dihapus.',
            'data' => $this->ringkasanPesertaSaya($peserta->fresh(), $program->id),
        ]);
    }

    private function daftarPathBukti(PesertaProgram $peserta): array
    {
        $daftar = $peserta->bukti_foto_daftar;
        if (is_array($daftar) && $daftar !== []) {
            return array_values(array_filter($daftar, fn ($p) => is_string($p) && $p !== ''));
        }

        return $peserta->bukti_foto ? [$peserta->bukti_foto] : [];
    }

    private function urlBuktiList(PesertaProgram $peserta, int $programId): array
    {
        $paths = $this->daftarPathBukti($peserta);

        return array_values(array_map(
            fn (int $idx) => "/api/v1/program/{$programId}/bukti/{$peserta->id}?index={$idx}",
            array_keys($paths)
        ));
    }

    private function hapusSemuaFileBukti(array $paths): void
    {
        foreach ($paths as $path) {
            $this->hapusFileBukti($path);
        }
    }

    private function hapusFileBukti(?string $path): void
    {
        if (! $path) {
            return;
        }

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($path)) {
                Storage::disk($disk)->delete($path);
            }
        }
    }

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
            || (in_array($user->role, ['admin_kelurahan', 'kader'], true) && $programSamaWilayah && $wargaSamaWilayah);

        abort_unless($boleh, 403, 'Anda tidak memiliki akses melihat dokumentasi ini.');

        $daftar = $this->daftarPathBukti($peserta);
        $idx = max(0, (int) $request->query('index', 0));
        $path = $daftar[$idx] ?? null;

        abort_unless($path, 404, 'Foto bukti tidak ditemukan.');

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($path)) {
                return Storage::disk($disk)->response($path);
            }
        }

        abort(404, 'Foto bukti tidak ditemukan.');
    }

    public function ubahStatusPeserta(Request $request, int $id)
    {
        $user = $request->user();
        $program = Program::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', Rule::in(['selesai', 'ditolak', 'berhenti'])],
            'user_id' => 'nullable|integer|exists:pengguna,id',
            'catatan_verifikasi' => 'nullable|string|max:500',
        ]);

        $targetId = $user->id;

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

        if (in_array($user->role, ['kader', 'admin_kelurahan'], true) && $targetId !== (int) $user->id) {
            abort_unless(
                $peserta->pengguna && (int) $peserta->pengguna->wilayah_id === (int) $user->wilayah_id,
                403,
                'Peserta ini bukan warga wilayah Anda.'
            );
        }

        $notifStatus = null;
        $catatanVerif = null;

        $hasil = DB::transaction(function () use ($peserta, $program, $data, $user, &$notifStatus, &$catatanVerif) {
            $terkunci = PesertaProgram::whereKey($peserta->id)->lockForUpdate()->firstOrFail();
            $sudahSelesai = $terkunci->status === 'selesai';

            if ($sudahSelesai && $data['status'] !== 'selesai') {
                throw ValidationException::withMessages([
                    'status' => ['Peserta yang sudah selesai tidak dapat diubah statusnya.'],
                ]);
            }

            $terkunci->status = $data['status'];
            if ($data['status'] === 'selesai') {
                $terkunci->selesai_pada = $terkunci->selesai_pada ?? now();
                $terkunci->progres_persen = 100;
                $terkunci->progres_diperbarui_pada = $terkunci->progres_diperbarui_pada ?? now();
                $terkunci->diverifikasi_oleh = $user->id;
                $terkunci->diverifikasi_pada = now();
                $terkunci->catatan_verifikasi = $data['catatan_verifikasi'] ?? null;
                if (! $sudahSelesai) {
                    $notifStatus = 'selesai';
                }
            } elseif ($data['status'] === 'ditolak') {
                $terkunci->selesai_pada = null;
                $terkunci->diverifikasi_oleh = $user->id;
                $terkunci->diverifikasi_pada = now();
                $terkunci->catatan_verifikasi = ($data['catatan_verifikasi'] ?? null) ?: 'Foto bukti belum sesuai kriteria misi. Silakan kirim ulang.';
                $notifStatus = 'ditolak';
                $catatanVerif = $terkunci->catatan_verifikasi;
            }
            $terkunci->save();

            $warga = Pengguna::whereKey($terkunci->user_id)->lockForUpdate()->firstOrFail();

            if ($data['status'] !== 'selesai' || $sudahSelesai) {
                return [
                    'status' => $terkunci->status,
                    'exp_didapat' => 0,
                    'exp_total' => (int) $warga->exp_total,
                    'level_gamifikasi' => (int) $warga->level_gamifikasi,
                    'badge_baru' => null,
                ];
            }

            $expLama = (int) $warga->exp_total;
            $expDapat = (int) $program->exp_reward;
            $expTotal = $expLama + $expDapat;

            $warga->exp_total = $expTotal;
            $warga->level_gamifikasi = $this->levelDariExp($expTotal);
            $warga->save();

            $badgeBaru = null;
            if ($program->badge_reward) {
                $ada = BadgePengguna::where('user_id', $warga->id)
                    ->where('badge', $program->badge_reward)
                    ->exists();

                if (! $ada) {
                    BadgePengguna::create([
                        'user_id' => $warga->id,
                        'badge' => $program->badge_reward,
                        'program_id' => $program->id,
                    ]);
                    $badgeBaru = $program->badge_reward;
                }
            }

            return [
                'status' => 'selesai',
                'exp_didapat' => $expDapat,
                'exp_total' => $expTotal,
                'level_gamifikasi' => $warga->level_gamifikasi,
                'badge_baru' => $badgeBaru,
            ];
        });

        if ($notifStatus === 'selesai') {
            $warga = Pengguna::find($peserta->user_id);
            if ($warga) {
                $this->badges->evaluasiUntukUser($warga);
                $this->peringkat->lupakanCache($warga->wilayah_id ? (int) $warga->wilayah_id : null);
            }
            $badgeInfo = $hasil['badge_baru'] ? "\nBadge baru: {$hasil['badge_baru']}" : '';
            $this->telegram->kirimNotifikasiUser(
                $warga,
                'Misi Program Selesai!',
                "Selamat {$warga?->name}! Bukti program \"{$program->judul}\" Anda telah disetujui.\n"
                ."Hadiah: +{$hasil['exp_didapat']} EXP (Total: {$hasil['exp_total']} EXP){$badgeInfo}"
            );
        } elseif ($notifStatus === 'ditolak') {
            $warga = Pengguna::find($peserta->user_id);
            $this->telegram->kirimNotifikasiUser(
                $warga,
                'Bukti Program Perlu Diperbaiki',
                "Bukti keikutsertaan Anda pada program \"{$program->judul}\" belum disetujui.\n"
                ."Catatan petugas: {$catatanVerif}\n\n"
                .'Silakan unggah ulang bukti yang sesuai melalui aplikasi SehatKita.'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Status peserta diperbarui',
            'data' => $hasil,
        ]);
    }

    public function perbaruiProgres(Request $request, int $id)
    {
        $user = $request->user();
        abort_unless($user->role === 'user', 403, 'Hanya warga peserta yang dapat memperbarui progres mandiri.');

        $program = Program::findOrFail($id);
        $peserta = PesertaProgram::where('program_id', $program->id)
            ->where('user_id', $user->id)
            ->first();

        abort_unless($peserta && $peserta->status !== 'berhenti', 404, 'Anda belum terdaftar pada tantangan ini.');

        if ($peserta->status === 'selesai') {
            throw ValidationException::withMessages([
                'progres_persen' => ['Tantangan ini sudah terverifikasi selesai oleh petugas.'],
            ]);
        }

        $data = $request->validate([
            'progres_persen' => 'required|integer|min:0|max:100',
            'catatan_progres' => 'nullable|string|max:500',
        ]);

        $peserta->update([
            'progres_persen' => (int) $data['progres_persen'],
            'catatan_progres' => array_key_exists('catatan_progres', $data)
                ? $data['catatan_progres']
                : $peserta->catatan_progres,
            'progres_diperbarui_pada' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Progres mandiri berhasil diperbarui',
            'data' => $this->ringkasanPesertaSaya($peserta->fresh(), $program->id),
        ]);
    }

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
        if ($request->has('kategori_aktivitas') && is_string($request->input('kategori_aktivitas'))) {
            $trim = trim($request->input('kategori_aktivitas'));
            $request->merge(['kategori_aktivitas' => $trim === '' ? null : $trim]);
        }
    }

    private function ambilDaftarPeserta(Program $program, Pengguna $user)
    {
        $query = PesertaProgram::with('pengguna:id,name,email,wilayah_id')
            ->where('program_id', $program->id);

        if (in_array($user->role, ['kader', 'admin_kelurahan'], true)) {
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
        }

        return $query
            ->orderByRaw("CASE status WHEN 'menunggu_verifikasi' THEN 0 WHEN 'terdaftar' THEN 1 WHEN 'ditolak' THEN 2 WHEN 'selesai' THEN 3 ELSE 4 END")
            ->orderBy('id', 'desc')
            ->get()
            ->map(fn ($p) => $this->barisPeserta($p, $program->id));
    }

    private function baris(Program $p, ?string $statusSaya, ?string $hariIni = null): array
    {
        $ikut = $statusSaya !== null && $statusSaya !== 'berhenti';

        return [
            'id' => $p->id,
            'wilayah_id' => $p->wilayah_id,
            'judul' => $p->judul,
            'deskripsi' => $p->deskripsi,
            'kriteria_misi' => $p->kriteria_misi,
            'jenis' => $p->jenis,
            'kategori_aktivitas' => $p->kategori_aktivitas,
            'target_peserta' => $p->target_peserta,
            'jumlah_peserta' => (int) ($p->jumlah_peserta ?? $p->peserta()->where('status', '!=', 'berhenti')->count()),
            'mulai' => $p->mulai?->toDateString(),
            'selesai' => $p->selesai?->toDateString(),
            'status' => $this->statusProgram($p, $hariIni ?? now()->toDateString()),
            'exp_reward' => (int) $p->exp_reward,
            'badge_reward' => $p->badge_reward,
            'exp' => (int) $p->exp_reward,
            'badge' => $p->badge_reward,
            'diikuti' => $ikut,
            'status_saya' => $statusSaya,
        ];
    }

    private function barisPeserta(PesertaProgram $p, int $programId): array
    {
        $urls = $this->urlBuktiList($p, $programId);

        return [
            'id' => $p->id,
            'user_id' => $p->user_id,
            'name' => $p->pengguna?->name,
            'email' => $p->pengguna?->email,
            'status' => $p->status,
            'progres_persen' => (int) ($p->progres_persen ?? ($p->status === 'selesai' ? 100 : 0)),
            'catatan_progres' => $p->catatan_progres,
            'progres_diperbarui_pada' => $p->progres_diperbarui_pada?->toIso8601String(),
            'bukti_foto_url' => $urls[0] ?? null,
            'bukti_foto_urls' => $urls,
            'catatan_bukti' => $p->catatan_bukti,
            'dikirim_pada' => $p->dikirim_pada?->toIso8601String(),
            'catatan_verifikasi' => $p->catatan_verifikasi,
            'diverifikasi_pada' => $p->diverifikasi_pada?->toIso8601String(),
            'terdaftar_pada' => $p->created_at?->toIso8601String(),
            'selesai_pada' => $p->selesai_pada?->toIso8601String(),
        ];
    }

    private function ringkasanPesertaSaya(?PesertaProgram $p, int $programId): ?array
    {
        if (! $p) {
            return null;
        }

        $urls = $this->urlBuktiList($p, $programId);

        return [
            'id' => $p->id,
            'status' => $p->status,
            'progres_persen' => (int) ($p->progres_persen ?? ($p->status === 'selesai' ? 100 : 0)),
            'catatan_progres' => $p->catatan_progres,
            'progres_diperbarui_pada' => $p->progres_diperbarui_pada?->toIso8601String(),
            'bukti_foto_url' => $urls[0] ?? null,
            'bukti_foto_urls' => $urls,
            'catatan_bukti' => $p->catatan_bukti,
            'dikirim_pada' => $p->dikirim_pada?->toIso8601String(),
            'catatan_verifikasi' => $p->catatan_verifikasi,
            'diverifikasi_pada' => $p->diverifikasi_pada?->toIso8601String(),
            'selesai_pada' => $p->selesai_pada?->toIso8601String(),
        ];
    }

    private function statusProgram(Program $p, string $hariIni): string
    {
        if ($p->status === 'selesai') {
            return 'selesai';
        }

        $mulai = $p->mulai?->toDateString();
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
            'selesai' => $query->where(fn ($q) => $q->where('status', 'selesai')->orWhere(fn ($sub) => $sub->whereNotNull('selesai')->whereDate('selesai', '<', $hariIni))),
            default => $query->sedangBerjalan($hariIni),
        };
    }

    private function levelDariExp(int $exp): int
    {
        return max(1, (int) floor($exp / 100) + 1);
    }
}
