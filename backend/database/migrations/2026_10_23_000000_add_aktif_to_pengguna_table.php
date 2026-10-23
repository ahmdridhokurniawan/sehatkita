<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kontrak 15: DELETE /admin/pengguna = "Nonaktifkan user".
// Tabel pengguna belum punya penanda aktif, jadi tambah kolom.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengguna', function (Blueprint $table) {
            $table->boolean('aktif')->default(true)->after('versi_kebijakan');
        });
    }

    public function down(): void
    {
        Schema::table('pengguna', function (Blueprint $table) {
            $table->dropColumn('aktif');
        });
    }
};
