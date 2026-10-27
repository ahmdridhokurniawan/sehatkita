<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kontrak 15: DELETE /admin/pengguna = "Nonaktifkan user".
// Kolom `aktif` kini sudah ada di create_pengguna_table, jadi migrasi ini
// hanya menambahkannya untuk database lama yang dibuat sebelum kolom itu ada.
// Tanpa penjagaan hasColumn, `migrate:fresh` gagal dengan
// "duplicate column name: aktif" — artinya instalasi baru tidak bisa jalan.
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('pengguna', 'aktif')) {
            return;
        }

        Schema::table('pengguna', function (Blueprint $table) {
            $table->boolean('aktif')->default(true)->after('versi_kebijakan');
        });
    }

    public function down(): void
    {
        // Kolom ini sekarang milik create_pengguna_table; rollback migrasi ini
        // tidak boleh mematahkan skema dasar, jadi tidak ada yang dihapus.
    }
};
