<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom NIK 16 digit pada tabel pengguna (catatan pembimbing).
     */
    public function up(): void
    {
        Schema::table('pengguna', function (Blueprint $table) {
            $table->char('nik', 16)->nullable()->unique()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('pengguna', function (Blueprint $table) {
            $table->dropColumn('nik');
        });
    }
};
