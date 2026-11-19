<?php

namespace App\Http\Controllers;

use App\Models\Faskes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

// Menampilkan daftar puskesmas dan fasilitas kesehatan yang tersedia dengan dukungan cache Redis.
class FaskesController extends Controller
{
    public const CACHE_KEYS_REGISTRY = 'faskes:cache_keys';

    public static function lupakanCache(): void
    {
        $keys = Cache::get(self::CACHE_KEYS_REGISTRY, []);
        if (is_array($keys)) {
            foreach ($keys as $key) {
                Cache::forget((string) $key);
            }
        }
        Cache::forget(self::CACHE_KEYS_REGISTRY);
    }

    public function index(Request $request)
    {
        $adaCari = trim((string) ($request->query('search') ?? $request->query('q') ?? '')) !== '';
        $wilayahId = (string) $request->query('wilayah_id', '');

        if (! $adaCari) {
            $cacheKey = 'faskes:list:'.($wilayahId !== '' ? $wilayahId : 'semua');
            $keys = Cache::get(self::CACHE_KEYS_REGISTRY, []);
            if (! is_array($keys)) {
                $keys = [];
            }
            if (! in_array($cacheKey, $keys, true)) {
                $keys[] = $cacheKey;
                Cache::put(self::CACHE_KEYS_REGISTRY, $keys, now()->addHours(2));
            }

            $data = Cache::remember($cacheKey, now()->addMinutes(30), function () use ($wilayahId) {
                $query = Faskes::orderBy('nama');
                if ($wilayahId !== '') {
                    $query->where('wilayah_id', $wilayahId);
                }

                return $query->get([
                    'id', 'nama', 'jenis', 'alamat', 'telepon', 'wilayah_id', 'lat', 'lng',
                ])->values()->all();
            });

            return response()->json([
                'success' => true,
                'message' => 'OK',
                'data' => $data,
            ]);
        }

        $query = Faskes::orderBy('nama');

        if ($wilayahId !== '') {
            $query->where('wilayah_id', $wilayahId);
        }

        $this->saringCari($query, ['nama', 'alamat', 'jenis'], $request);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => $query->get([
                'id', 'nama', 'jenis', 'alamat', 'telepon', 'wilayah_id', 'lat', 'lng',
            ]),
        ]);
    }
}
