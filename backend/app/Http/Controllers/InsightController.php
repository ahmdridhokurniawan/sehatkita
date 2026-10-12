<?php

namespace App\Http\Controllers;

use App\Services\InsightService;
use Illuminate\Http\Request;

class InsightController extends Controller
{
    // Inject service lewat constructor (Laravel auto-resolve).
    public function __construct(
        private InsightService $insight
    ) {}

    // GET /api/insight - daftar insight user login (kontrak §8.3)
    public function index(Request $request)
    {
        // Ambil insight untuk user yang sedang login.
        $data = $this->insight->untukUser($request->user());

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $data,
        ]);
    }
}
