<?php

namespace App\Http\Controllers;

use App\Services\InsightService;
use Illuminate\Http\Request;

class InsightController extends Controller
{
    public function __construct(
        private InsightService $insight
    ) {}

    // GET /api/v1/insight?level=bahaya (Kontrak 29)
    public function index(Request $request)
    {
        $level = $request->query('level'); // info | peringatan | bahaya
        $data  = $this->insight->untukUser($request->user());

        if ($level) {
            $data = array_values(array_filter($data, fn ($i) => $i['level'] === $level));
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $data,
        ]);
    }
}
