<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('peserta_program', function (Blueprint $table) {
            if (! Schema::hasColumn('peserta_program', 'bukti_foto_daftar')) {
                $table->text('bukti_foto_daftar')->nullable()->after('bukti_foto');
            }
        });
    }

    public function down(): void
    {
        Schema::table('peserta_program', function (Blueprint $table) {
            if (Schema::hasColumn('peserta_program', 'bukti_foto_daftar')) {
                $table->dropColumn('bukti_foto_daftar');
            }
        });
    }
};
