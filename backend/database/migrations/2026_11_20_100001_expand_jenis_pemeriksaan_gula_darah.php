<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE catatan_kesehatan MODIFY gula_darah DECIMAL(6, 2) NULL');
            DB::statement('ALTER TABLE catatan_kesehatan MODIFY jenis_gula_darah VARCHAR(20) NULL');
            DB::statement('ALTER TABLE ambang_kategori MODIFY jenis_gula_darah VARCHAR(20) NULL');
        } else {
            Schema::table('catatan_kesehatan', function (Blueprint $table) {
                $table->decimal('gula_darah', 6, 2)->nullable()->change();
                $table->string('jenis_gula_darah', 20)->nullable()->change();
            });

            Schema::table('ambang_kategori', function (Blueprint $table) {
                $table->string('jenis_gula_darah', 20)->nullable()->change();
            });
        }

        $gulaId = DB::table('indikator')->where('kode', 'gula_darah')->value('id');
        if ($gulaId) {
            $barisBaru = [
                ['sewaktu', 0, 140, 'normal', 'normal', 0, false],
                ['sewaktu', 140, 200, 'perlu_perhatian', 'perlu_perhatian', 1, false],
                ['sewaktu', 200, null, 'tinggi', 'berisiko', 2, false],
                ['hba1c', 0, 5.7, 'normal', 'normal', 0, false],
                ['hba1c', 5.7, 6.5, 'perlu_perhatian', 'perlu_perhatian', 1, false],
                ['hba1c', 6.5, null, 'tinggi', 'berisiko', 2, false],
            ];

            $sekarang = now();
            foreach ($barisBaru as [$jenis, $min, $max, $kategori, $status, $skor, $rujukan]) {
                $ada = DB::table('ambang_kategori')
                    ->where('indikator_id', $gulaId)
                    ->where('jenis_gula_darah', $jenis)
                    ->where('batas_min', $min)
                    ->exists();

                if (! $ada) {
                    DB::table('ambang_kategori')->insert([
                        'indikator_id' => $gulaId,
                        'jenis_gula_darah' => $jenis,
                        'batas_min' => $min,
                        'batas_max' => $max,
                        'kategori' => $kategori,
                        'status' => $status,
                        'skor' => $skor,
                        'memicu_rujukan' => $rujukan,
                        'created_at' => $sekarang,
                        'updated_at' => $sekarang,
                    ]);
                }
            }
        }

        Cache::forget('ambang_kategori:semua');
    }

    public function down(): void
    {
        $gulaId = DB::table('indikator')->where('kode', 'gula_darah')->value('id');
        if ($gulaId) {
            DB::table('ambang_kategori')
                ->where('indikator_id', $gulaId)
                ->whereIn('jenis_gula_darah', ['sewaktu', 'hba1c'])
                ->delete();
        }

        Cache::forget('ambang_kategori:semua');
    }
};
