<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kunjungan_posbindu', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sesi_id')->constrained('sesi_posbindu')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();

            $table->boolean('hadir')->default(false);
            $table->foreignId('dicatat_oleh')->nullable()->constrained('pengguna')->nullOnDelete();

            // tautan ke hasil pengukuran kader di sesi ini
            $table->foreignId('catatan_kesehatan_id')->nullable()->constrained('catatan_kesehatan')->nullOnDelete();

            $table->timestamps();

            // satu orang tidak boleh tercatat dua kali di satu sesi
            $table->unique(['sesi_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kunjungan_posbindu');
    }
};
