<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Penyesuaian ambang tensi sistol dan diastol ke standar resmi Kemenkes RI
    public function up(): void
    {
        $sistolId = DB::table('indikator')->where('kode', 'sistol')->value('id');
        if ($sistolId) {
            DB::table('ambang_kategori')->where('indikator_id', $sistolId)->where('kategori', 'normal')->update(['batas_max' => 130.00]);
            DB::table('ambang_kategori')->where('indikator_id', $sistolId)->where('kategori', 'perlu_perhatian')->update(['batas_min' => 130.00]);
        }

        $diastolId = DB::table('indikator')->where('kode', 'diastol')->value('id');
        if ($diastolId) {
            DB::table('ambang_kategori')->where('indikator_id', $diastolId)->where('kategori', 'normal')->update(['batas_max' => 85.00]);
            DB::table('ambang_kategori')->where('indikator_id', $diastolId)->where('kategori', 'perlu_perhatian')->update(['batas_min' => 85.00]);
        }
    }

    public function down(): void
    {
        $sistolId = DB::table('indikator')->where('kode', 'sistol')->value('id');
        if ($sistolId) {
            DB::table('ambang_kategori')->where('indikator_id', $sistolId)->where('kategori', 'normal')->update(['batas_max' => 120.00]);
            DB::table('ambang_kategori')->where('indikator_id', $sistolId)->where('kategori', 'perlu_perhatian')->update(['batas_min' => 120.00]);
        }

        $diastolId = DB::table('indikator')->where('kode', 'diastol')->value('id');
        if ($diastolId) {
            DB::table('ambang_kategori')->where('indikator_id', $diastolId)->where('kategori', 'normal')->update(['batas_max' => 80.00]);
            DB::table('ambang_kategori')->where('indikator_id', $diastolId)->where('kategori', 'perlu_perhatian')->update(['batas_min' => 80.00]);
        }
    }
};
