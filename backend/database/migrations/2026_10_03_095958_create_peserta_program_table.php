<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('peserta_program', function (Blueprint $table) {
            $table->id();                                                    

            // program yang diikuti; program dihapus -> peserta ikut terhapus
            $table->foreignId('program_id')->constrained('program')->cascadeOnDelete();

            // warga yang ikut; warga dihapus -> keikutsertaannya ikut terhapus
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();

            // keadaan peserta: masih ikut / selesai penuh / keluar di tengah
            $table->enum('status', ['terdaftar', 'selesai', 'berhenti'])->default('terdaftar');

            // kapan dia menyelesaikannya (kosong selama belum selesai)
            $table->timestamp('selesai_pada')->nullable();

            $table->timestamps();        // created_at + updated_at

            // satu orang tak boleh daftar program yang sama 2x
            $table->unique(['program_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peserta_program');      // hapus tabe
    }
};
