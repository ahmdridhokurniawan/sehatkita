<?php

namespace App\Http\Controllers;

use App\Models\Rujukan;
use App\Services\InsightService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        private InsightService $insight
    ) {}

    // GET /api/v1/notifications
    public function index(Request $request)
    {
        $user     = $request->user();
        $insights = $this->insight->untukUser($user);

        // Ambil rujukan terbaru milik user
        $rujukan = Rujukan::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'type'       => 'rujukan',
                'status'     => $r->status,
                'faskes'     => $r->faskes?->nama,
                'alasan'     => $r->alasan,
                'created_at' => $r->created_at->toIso8601String(),
            ]);

        $data = array_merge($insights, $rujukan->toArray());

        // Urutkan dari yang paling baru
        usort($data, fn ($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return response()->json([
            'success' => true,
            'message' => 'Daftar notifikasi terbaru',
            'data'    => array_values($data),
        ]);
    }
}
