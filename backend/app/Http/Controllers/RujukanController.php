<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use App\Models\Rujukan;
use App\Services\SuratRujukanService;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RujukanController extends Controller
{
    public function __construct(
        private TelegramService $telegram,
        private SuratRujukanService $suratRujukan
    ) {}

    private const ROLE_PETUGAS = ['kader', 'admin_kelurahan', 'super_admin'];
    private const ROLE_PEMBUAT = ['kader', 'super_admin'];
    private const STATUS       = ['baru', 'dihubungi', 'selesai', 'ditolak'];

    // Buat rujukan faskes baru
    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless(
            in_array($user->role, self::ROLE_PEMBUAT, true),
            403,
            'Hanya kader atau super admin yang boleh membuat rujukan.'
        );

        $data = $request->validate([
            'user_id'   => 'required|exists:pengguna,id',
            'faskes_id' => 'required|exists:faskes,id',
            'alasan'    => 'required|string|max:255',
        ]);

        // Pembatasan warga binaan untuk kader
        if ($user->role !== 'super_admin') {
            $pemilik = Pengguna::find($data['user_id']);

            abort_unless($pemilik && $this->dalamBinaan($user, $pemilik), 404, 'Peserta tidak ditemukan di binaan Anda.');
        }

        $rujukan = Rujukan::create([
            'user_id'     => $data['user_id'],
            'faskes_id'   => $data['faskes_id'],
            'alasan'      => $data['alasan'],
            'dibuat_oleh' => $user->id,
            'status'      => 'baru',
        ]);

        $rujukan->load(['faskes', 'pembuat', 'penangan', 'pengguna:id,name,nik']);
        $pemilik = Pengguna::find($rujukan->user_id);
        $namaFaskes = $rujukan->faskes?->nama ?? 'Faskes tujuan';

        $this->telegram->kirimNotifikasiUser(
            $pemilik,
            'Rujukan Faskes Baru',
            "Halo {$pemilik?->name},\n"
            . "Anda memiliki rujukan baru ke {$namaFaskes}.\n"
            . "Alasan: {$rujukan->alasan}\n\n"
            . 'Silakan pantau tindak lanjut petugas atau cetak surat pengantar melalui aplikasi SehatKita.'
        );

        $this->telegram->kirimDokumenUser(
            $pemilik,
            $this->suratRujukan->namaFile($rujukan),
            $this->suratRujukan->renderHtml($rujukan),
            "Salinan Surat Pengantar Rujukan ke {$namaFaskes} (buka di browser lalu pilih Cetak/Simpan PDF)."
        );

        return response()->json([
            'success' => true,
            'message' => 'Rujukan dibuat',
            'data'    => $this->bentuk($rujukan),
        ], 201);
    }

    // Daftar rujukan faskes dengan penyaringan wilayah dan rentang tanggal
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Rujukan::with(['faskes', 'pembuat', 'penangan', 'pengguna:id,name,nik']);

        if (! in_array($user->role, self::ROLE_PETUGAS, true)) {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'kader') {
            $query->whereHas('pengguna', fn ($q) => $this->scopeBinaan($q, $user));
        } elseif ($user->role === 'admin_kelurahan') {
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
        } else {
            if ($request->filled('wilayah_id')) {
                $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $request->wilayah_id));
            }
            // Catat akses baca daftar rujukan oleh super_admin sesuai kontrak §2
            $this->catatAudit($user, 'baca_data_individu', Rujukan::class, null);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        $this->saringRentangTanggal($query, $request);

        $kata = trim((string) ($request->query('search') ?? $request->query('q') ?? ''));
        if ($kata !== '') {
            $escaped = addcslashes(mb_substr($kata, 0, 100), '%_\\');
            $kolomCari = $user->role === 'admin_kelurahan' ? ['indikator'] : ['alasan', 'catatan', 'indikator'];
            $query->where(function ($q) use ($kolomCari, $escaped) {
                foreach ($kolomCari as $k) {
                    $q->orWhere($k, 'like', '%' . $escaped . '%');
                }
                $q->orWhereHas('faskes', fn ($fq) => $fq->where('nama', 'like', '%' . $escaped . '%'));
            });
        }

        $list = $query->orderByDesc('created_at')->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => collect($list->items())->map(fn ($r) => $this->bentuk($r, $user))->values(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // Perbarui status rujukan
    public function updateStatus(Request $request, int $id)
    {
        $user = $request->user();
        $this->hanyaPetugas($user);

        $data = $request->validate([
            'status'  => ['required', Rule::in(self::STATUS)],
            'catatan' => 'nullable|string|max:500',
        ]);

        $query = Rujukan::query();
        if ($user->role === 'kader') {
            $query->whereHas('pengguna', fn ($q) => $this->scopeBinaan($q, $user));
        } elseif ($user->role === 'admin_kelurahan') {
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $user->wilayah_id));
        }
        $rujukan = $query->findOrFail($id);

        $urutan = ['baru' => 0, 'dihubungi' => 1, 'selesai' => 2, 'ditolak' => 2];

        if ($rujukan->status !== $data['status'] && in_array($rujukan->status, ['selesai', 'ditolak'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Status rujukan yang sudah final tidak dapat diubah.'],
            ]);
        }

        if ($urutan[$data['status']] < $urutan[$rujukan->status]) {
            throw ValidationException::withMessages([
                'status' => ['Status rujukan tidak boleh mundur.'],
            ]);
        }

        if ($data['status'] === 'ditolak' && blank($data['catatan'] ?? null)) {
            throw ValidationException::withMessages([
                'catatan' => ['Catatan wajib diisi saat menolak rujukan.'],
            ]);
        }

        $rujukan->update([
            'status'         => $data['status'],
            'catatan'        => $data['catatan'] ?? $rujukan->catatan,
            'ditangani_oleh' => $user->id,
        ]);

        $this->catatAudit($user, 'ubah_status_rujukan', Rujukan::class, $rujukan->id);

        $segar = $rujukan->fresh(['faskes', 'pembuat', 'penangan', 'pengguna:id,name,nik']);
        $pemilik = Pengguna::find($rujukan->user_id);
        $namaFaskes = $segar->faskes?->nama ?? 'Faskes tujuan';
        $catatanPetugas = $segar->catatan ? "\nCatatan petugas: {$segar->catatan}" : '';

        $this->telegram->kirimNotifikasiUser(
            $pemilik,
            'Pembaruan Status Rujukan',
            "Halo {$pemilik?->name},\n"
            . "Status rujukan Anda ke {$namaFaskes} kini: " . strtoupper($segar->status)
            . $catatanPetugas
        );

        return response()->json([
            'success' => true,
            'message' => 'Status rujukan diperbarui',
            'data'    => $this->bentuk($segar, $user),
        ]);
    }

    // Ambil data atau lembar HTML siap cetak Surat Pengantar Rujukan
    public function surat(Request $request, int $id)
    {
        $user = $request->user();

        if ($user->role === 'admin_kelurahan') {
            abort(403, 'Admin kelurahan tidak memiliki akses ke surat rujukan individu.');
        }

        $query = Rujukan::query();
        if (! in_array($user->role, self::ROLE_PETUGAS, true)) {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'kader') {
            $query->whereHas('pengguna', fn ($q) => $this->scopeBinaan($q, $user));
        }

        $rujukan = $query->findOrFail($id);

        if ($user->role === 'super_admin') {
            $this->catatAudit($user, 'baca_data_individu', Rujukan::class, $rujukan->id);
        }

        if ($request->query('format') === 'html') {
            return response($this->suratRujukan->renderHtml($rujukan), 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $this->suratRujukan->dataSurat($rujukan),
        ]);
    }

    // Format data rujukan (redaksi identitas untuk admin kelurahan)
    private function bentuk(Rujukan $r, ?Pengguna $pemanggil = null): array
    {
        $dasar = [
            'id'         => $r->id,
            'faskes'     => ['id' => $r->faskes?->id, 'nama' => $r->faskes?->nama],
            'status'     => $r->status,
            'otomatis'   => (bool) $r->otomatis,
            'indikator'  => $r->indikator,
            'created_at' => $r->created_at?->toIso8601String(),
            'updated_at' => $r->updated_at?->toIso8601String(),
        ];

        if ($pemanggil && $pemanggil->role === 'admin_kelurahan') {
            return $dasar;
        }

        return $dasar + [
            'user_id'        => $r->user_id,
            'user'           => $r->pengguna
                ? ['id' => $r->pengguna->id, 'name' => $r->pengguna->name, 'nik' => $r->pengguna->nik]
                : null,
            'alasan'         => $r->alasan,
            'dibuat_oleh'    => $r->pembuat
                ? ['id' => $r->pembuat->id, 'name' => $r->pembuat->name]
                : null,
            'ditangani_oleh' => $r->penangan
                ? ['id' => $r->penangan->id, 'name' => $r->penangan->name]
                : null,
            'catatan'        => $r->catatan,
        ];
    }

    // Batasi pengelolaan rujukan hanya untuk petugas berwenang
    private function hanyaPetugas(Pengguna $user): void
    {
        $this->wajibPeran($user, self::ROLE_PETUGAS, 'Hanya kader atau admin kelurahan yang boleh membuat rujukan.');
    }
}