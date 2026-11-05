<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Tabel target kesehatan dinamis dan motivasi capaian warga
    public function up(): void
    {
        Schema::create('target_kesehatan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();
            $table->string('judul', 100);
            $table->string('jenis_target', 50);
            $table->decimal('nilai_awal', 8, 2)->nullable();
            $table->decimal('nilai_target', 8, 2);
            $table->string('satuan', 20);
            $table->date('tenggat_waktu')->nullable();
            $table->boolean('tercapai')->default(false);
            $table->timestamp('tercapai_pada')->nullable();
            $table->string('catatan_motivasi', 255)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'tercapai']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('target_kesehatan');
    }
};
