<?php

namespace App\Http\Controllers;

use App\Models\Pengaduan;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Controller modul pengaduan warga untuk admin kelurahan dan dinas kesehatan
class PengaduanController extends Controller
{
    public function __construct(private TelegramService $telegram) {}

    // Tampilkan daftar pengaduan warga sesuai wilayah tugas admin atau milik sendiri
    public function index(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user', 'admin_kelurahan', 'super_admin']);

        $query = Pengaduan::with(['pengguna:id,name,email', 'wilayah:id,nama', 'penanggap:id,name,role']);

        if ($user->role === 'user') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'admin_kelurahan') {
            $query->where('wilayah_id', $user->wilayah_id);
        } elseif ($user->role === 'super_admin' && $request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('kategori')) {
            $query->where('kategori', $request->kategori);
        }

        $this->saringCari($query, ['judul', 'isi'], $request);

        $list = $query->latest()->paginate($this->perHalaman($request));

        return response()->json([
            'success' => true,
            'message' => 'Daftar pengaduan',
            'data'    => $list->items(),
            'meta'    => $this->metaPaginasi($list),
        ]);
    }

    // Simpan laporan pengaduan baru yang dikirimkan warga
    public function store(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Hanya user yang dapat mengirim pengaduan.');

        $data = $request->validate([
            'judul'      => 'required|string|max:150',
            'isi'        => 'required|string',
            'kategori'   => ['required', Rule::in(['layanan_posbindu', 'faskes', 'rujukan', 'aplikasi', 'lainnya'])],
            'wilayah_id' => 'nullable|exists:wilayah,id',
        ]);

        $wilayahId = $data['wilayah_id'] ?? $user->wilayah_id;
        abort_unless($wilayahId, 422, 'Wilayah pengaduan belum ditentukan.');

        $pengaduan = Pengaduan::create([
            'user_id'    => $user->id,
            'wilayah_id' => $wilayahId,
            'judul'      => $data['judul'],
            'isi'        => $data['isi'],
            'kategori'   => $data['kategori'],
            'status'     => 'menunggu',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengaduan berhasil dikirim',
            'data'    => $pengaduan->load(['pengguna:id,name', 'wilayah:id,nama']),
        ], 201);
    }

    // Ambil detail pengaduan warga beserta tanggapannya jika ada
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user', 'admin_kelurahan', 'super_admin']);

        $pengaduan = Pengaduan::with(['pengguna:id,name,email', 'wilayah:id,nama', 'penanggap:id,name,role'])->find($id);

        abort_unless($pengaduan, 404, 'Pengaduan tidak ditemukan.');

        $boleh = match ($user->role) {
            'user'            => (int) $pengaduan->user_id === (int) $user->id,
            'admin_kelurahan' => (int) $pengaduan->wilayah_id === (int) $user->wilayah_id,
            'super_admin'     => true,
            default           => false,
        };

        abort_unless($boleh, 404, 'Pengaduan tidak ditemukan.');

        return response()->json([
            'success' => true,
            'message' => 'Detail pengaduan',
            'data'    => $pengaduan,
        ]);
    }

    // Kirim tanggapan dan perbarui status tindak lanjut pengaduan oleh admin
    public function tanggapi(Request $request, int $id)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['admin_kelurahan', 'super_admin'], 'Hanya admin yang boleh menanggapi.');

        $pengaduan = Pengaduan::find($id);
        abort_unless($pengaduan, 404, 'Pengaduan tidak ditemukan.');

        if ($user->role === 'admin_kelurahan') {
            abort_unless((int) $pengaduan->wilayah_id === (int) $user->wilayah_id, 404, 'Pengaduan tidak ditemukan.');
        }

        $data = $request->validate([
            'status'    => ['required', Rule::in(['diproses', 'selesai', 'ditolak'])],
            'tanggapan' => 'required|string',
        ]);

        $pengaduan->update([
            'status'          => $data['status'],
            'tanggapan'       => $data['tanggapan'],
            'ditanggapi_oleh' => $user->id,
            'ditanggapi_pada' => now(),
        ]);

        $pengaduan->load(['pengguna', 'penanggap:id,name,role']);

        $this->telegram->kirimNotifikasiUser(
            $pengaduan->pengguna,
            'Tanggapan Pengaduan Anda',
            "Judul: {$pengaduan->judul}\n"
            . 'Status: ' . strtoupper($pengaduan->status) . "\n"
            . "Tanggapan: {$pengaduan->tanggapan}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Tanggapan pengaduan berhasil disimpan',
            'data'    => $pengaduan->fresh(['pengguna:id,name', 'penanggap:id,name,role']),
        ]);
    }
}
