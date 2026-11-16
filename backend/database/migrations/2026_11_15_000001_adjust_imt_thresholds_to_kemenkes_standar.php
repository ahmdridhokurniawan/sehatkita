<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Penyesuaian ambang IMT dewasa ke standar resmi Kemenkes RI (Permenkes No. 41 Tahun 2014)
    public function up(): void
    {
        $imtId = DB::table('indikator')->where('kode', 'imt')->value('id');
        if ($imtId) {
            DB::table('ambang_kategori')->where('indikator_id', $imtId)->where('kategori', 'gemuk')->update(['batas_max' => 27.00]);
            DB::table('ambang_kategori')->where('indikator_id', $imtId)->where('kategori', 'obesitas')->update(['batas_min' => 27.00]);
        }

        Cache::forget('ambang_kategori:semua');
    }

    public function down(): void
    {
        $imtId = DB::table('indikator')->where('kode', 'imt')->value('id');
        if ($imtId) {
            DB::table('ambang_kategori')->where('indikator_id', $imtId)->where('kategori', 'gemuk')->update(['batas_max' => 30.00]);
            DB::table('ambang_kategori')->where('indikator_id', $imtId)->where('kategori', 'obesitas')->update(['batas_min' => 30.00]);
        }

        Cache::forget('ambang_kategori:semua');
    }
};
