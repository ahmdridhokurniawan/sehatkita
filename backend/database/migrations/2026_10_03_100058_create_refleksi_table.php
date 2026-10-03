<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refleksi', function (Blueprint $table) {
            $table->id();                                            

            // warga yang menulis refleksi; warga dihapus -> refleksinya ikut terhapus
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();

            $table->string('minggu', 10);                // minggu ke-berapa, mis. "2026-W40"
            $table->text('catatan');                     // isi refleksi (wajib, bisa panjang)

            $table->timestamps();                        // created_at + updated_at

            // satu warga hanya boleh 1 refleksi per minggu
            $table->unique(['user_id', 'minggu']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refleksi');          // hapus tabel
    }
};
