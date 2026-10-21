<?php

namespace App\Http\Controllers;

use App\Models\Rujukan;
use App\Services\InsightService;
use Illuminate\Http\Request;

/**
 * Notifikasi (kontrak 27)
 * -------------------------
 * Menggabungkan:
 * - Insight ber-level peringatan atau bahaya dari InsightService.
 * - Rujukan yang masih berstatus baru.
 * - Badge atau reward yang diperoleh dari program.
 */
class NotificationController extends Controller
{
    public function __construct(
        private InsightService $insightService
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();

        // 1. Ambil insight dinamis dari InsightService,
        //    lalu saring hanya level peringatan/bahaya.
        $semuaInsight = $this->insightService->untukUser($user);

        $insightBerbahaya = array_filter($semuaInsight, function ($item) {
            return in_array($item['level'], ['peringatan', 'bahaya']);
        });

        // 2. Rujukan yang masih berstatus baru.
        //    with('faskes') wajib: nama faskes ada di tabel `faskes`, tabel
        //    `rujukan` tidak punya kolom `nama_faskes`. Dulu kolom itu
        //    di-select di sini sehingga SQL error "Unknown column
        //    'nama_faskes'" dan endpoint ini selalu HTTP 500.
        $rujukan = Rujukan::with('faskes')
            ->where('user_id', $user->id)
            ->where('status', 'baru')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // 3. Reward dari program yang sudah selesai
        $badges = \DB::table('peserta_program')
            ->join('program', 'peserta_program.program_id', '=', 'program.id')
            ->where('peserta_program.user_id', $user->id)
            ->whereNotNull('program.badge')
            ->where('peserta_program.status', 'selesai')
            ->orderBy('peserta_program.updated_at', 'desc')
            ->limit(5)
            ->get(['program.id as program_id', 'program.badge', 'peserta_program.updated_at']);

        // 4. Gabungkan menjadi satu array notifikasi
        $notifications = [];

        foreach ($insightBerbahaya as $i) {
            $notifications[] = [
                'type'       => 'insight',
                'level'      => $i['level'],
                'title'      => 'Peringatan Kesehatan',
                'message'    => $i['teks'],
                'created_at' => $i['dibuat_pada'],
            ];
        }

        foreach ($rujukan as $r) {
            $namaFaskes = $r->faskes?->nama ?? 'faskes terdekat';

            $notifications[] = [
                'type'       => 'rujukan',
                'level'      => 'bahaya',
                'title'      => 'Rujukan Faskes',
                'message'    => "Anda disarankan segera ke {$namaFaskes}. Alasan: {$r->alasan}",
                'created_at' => $r->created_at->toDateTimeString(),
            ];
        }

        foreach ($badges as $b) {
            $notifications[] = [
                'type'       => 'badge',
                'level'      => 'info',
                'title'      => "Badge Diperoleh: {$b->badge}",
                'message'    => "Anda telah menyelesaikan program kesehatan.",
                'created_at' => $b->updated_at->toDateTimeString(),
            ];
        }

        // Urutkan dari yang terbaru
        usort($notifications, fn ($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return response()->json([
            'success' => true,
            'message' => 'Daftar notifikasi terbaru',
            'data'    => array_values($notifications),
        ]);
    }
}