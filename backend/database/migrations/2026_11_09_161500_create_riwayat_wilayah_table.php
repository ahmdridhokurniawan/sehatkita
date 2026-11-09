<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jalankan migrasi - Buat tabel riwayat mutasi wilayah pengguna (U12).
     */
    public function up(): void
    {
        Schema::create('riwayat_wilayah', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();
            $table->foreignId('wilayah_asal_id')->nullable()->constrained('wilayah')->nullOnDelete();
            $table->foreignId('wilayah_tujuan_id')->constrained('wilayah')->cascadeOnDelete();
            $table->string('alasan', 255)->nullable();
            $table->foreignId('diubah_oleh')->nullable()->constrained('pengguna')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Batalkan migrasi.
     */
    public function down(): void
    {
        Schema::dropIfExists('riwayat_wilayah');
    }
};
