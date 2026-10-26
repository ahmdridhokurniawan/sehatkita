<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jalankan migrasi - Tambah kolom wilayah_id sebagai Foreign Key.
     */
    public function up(): void
    {
        Schema::table('catatan_kesehatan', function (Blueprint $table) {
            // Menambahkan kolom wilayah_id yang terhubung ke tabel 'wilayah'
            $table->foreignId('wilayah_id')
                  ->nullable()
                  ->after('user_id')
                  ->constrained('wilayah')
                  ->nullOnDelete();
        });
    }

    /**
     * Batalkan migrasi - Hapus Foreign Key dan kolomnya.
     */
    public function down(): void
    {
        Schema::table('catatan_kesehatan', function (Blueprint $table) {
            $table->dropForeign(['wilayah_id']);
            $table->dropColumn('wilayah_id');
        });
    }
};
