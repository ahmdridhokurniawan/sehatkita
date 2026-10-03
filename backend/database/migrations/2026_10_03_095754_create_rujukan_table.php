<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rujukan', function (Blueprint $table) {
            $table->id();

            // warga yang dirujuk
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();

            // tujuan rujukan
            $table->foreignId('faskes_id')->constrained('faskes')->restrictOnDelete();

            $table->text('alasan');                        // mis. "tensi tinggi 2x pengukuran terakhir"

            $table->foreignId('dibuat_oleh')->nullable()->constrained('pengguna')->nullOnDelete();

            // status tindak lanjut
            $table->enum('status', ['baru', 'dihubungi', 'tertangani', 'ditolak'])->default('baru');

            // siapa yang menangani
            $table->foreignId('ditangani_oleh')->nullable()->constrained('pengguna')->nullOnDelete();

            $table->text('catatan')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rujukan');
    }
};
