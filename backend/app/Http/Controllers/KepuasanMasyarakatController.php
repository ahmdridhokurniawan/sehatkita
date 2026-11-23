<?php

namespace App\Http\Controllers;

use App\Models\KepuasanMasyarakat;
use App\Services\BadgeKeaktifanService;
use Illuminate\Http\Request;

// Mengelola survei kepuasan masyarakat dari warga serta rekapannya untuk Admin Kelurahan dan Super Admin.
class KepuasanMasyarakatController extends Controller
{
    public function __construct(private BadgeKeaktifanService $badges) {}
    public function index(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['admin_kelurahan', 'super_admin'], 'Hanya admin kelurahan dan super admin yang dapat melihat rekap kepuasan masyarakat.');

        $baseQuery = KepuasanMasyarakat::query()
            ->with(['pengguna:id,name,role', 'wilayah:id,nama']);

        if ($user->role === 'admin_kelurahan') {
            abort_unless($user->wilayah_id, 403, 'Akun admin kelurahan belum memiliki wilayah.');
            $baseQuery->where('wilayah_id', $user->wilayah_id);
        } elseif ($request->filled('wilayah_id')) {
            $baseQuery->where('wilayah_id', (int) $request->query('wilayah_id'));
        }

        if ($request->filled('rating')) {
            $baseQuery->where('rating', (int) $request->query('rating'));
        }

        $ringkasanQuery = clone $baseQuery;
        $totalResponden = (clone $ringkasanQuery)->count();
        $rataRata = $totalResponden > 0
            ? round((float) (clone $ringkasanQuery)->avg('rating'), 2)
            : 0.0;

        $distribusi = [];
        for ($bintang = 5; $bintang >= 1; $bintang--) {
            $distribusi[(string) $bintang] = (clone $ringkasanQuery)->where('rating', $bintang)->count();
        }

        $list = $baseQuery->latest()->paginate($this->perHalaman($request, 15));

        $data = collect($list->items())->map(fn (KepuasanMasyarakat $item) => [
            'id' => $item->id,
            'rating' => (int) $item->rating,
            'aspek_pelayanan' => $item->aspek_pelayanan,
            'komentar' => $item->komentar,
            'pengguna' => $item->pengguna ? [
                'id' => $item->pengguna->id,
                'name' => $item->pengguna->name,
            ] : null,
            'wilayah' => $item->wilayah ? [
                'id' => $item->wilayah->id,
                'nama' => $item->wilayah->nama,
            ] : null,
            'created_at' => $item->created_at?->toIso8601String(),
        ])->values();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $data,
            'meta' => $this->metaPaginasi($list),
            'ringkasan' => [
                'total_responden' => $totalResponden,
                'rata_rata_rating' => $rataRata,
                'indeks_kepuasan_persen' => $totalResponden > 0 ? round(($rataRata / 5) * 100, 1) : 0.0,
                'distribusi_bintang' => $distribusi,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user', 'kader'], 'Hanya warga atau kader yang dapat mengisi survei kepuasan masyarakat.');

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'aspek_pelayanan' => 'nullable|string|max:80',
            'komentar' => 'nullable|string|max:1000',
        ]);

        $item = KepuasanMasyarakat::create([
            'user_id' => $user->id,
            'wilayah_id' => $user->wilayah_id,
            'rating' => (int) $data['rating'],
            'aspek_pelayanan' => $data['aspek_pelayanan'] ?? 'Layanan Posbindu & Aplikasi',
            'komentar' => $data['komentar'] ?? null,
        ]);

        $badgeBaru = $user->role === 'user' ? $this->badges->evaluasiUntukUser($user) : [];

        return response()->json([
            'success' => true,
            'message' => 'Terima kasih! Penilaian kepuasan Anda telah tersimpan.',
            'data' => [
                'id' => $item->id,
                'rating' => (int) $item->rating,
                'aspek_pelayanan' => $item->aspek_pelayanan,
                'komentar' => $item->komentar,
                'badge_baru' => $badgeBaru,
                'created_at' => $item->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}
