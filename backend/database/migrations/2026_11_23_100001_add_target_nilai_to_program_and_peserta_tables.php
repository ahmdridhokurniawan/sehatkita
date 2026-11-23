<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('program', function (Blueprint $table) {
            $table->decimal('target_nilai', 10, 2)->nullable()->after('target_peserta');
            $table->string('satuan_target', 40)->nullable()->after('target_nilai');
        });

        Schema::table('peserta_program', function (Blueprint $table) {
            $table->decimal('capaian_nilai', 10, 2)->default(0)->after('progres_persen');
        });
    }

    public function down(): void
    {
        Schema::table('peserta_program', function (Blueprint $table) {
            $table->dropColumn('capaian_nilai');
        });

        Schema::table('program', function (Blueprint $table) {
            $table->dropColumn(['target_nilai', 'satuan_target']);
        });
    }
};
