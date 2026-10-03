<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sesi_posbindu', function (Blueprint $table) {
            $table->id();

            // sesi ini berlangsung di wilayah mana
            $table->foreignId('wilayah_id')->constrained('wilayah')->restrictOnDelete();

            $table->date('tanggal');                             // tanggal pelaksanaan
            $table->string('lokasi', 150);                       // mis. "Balai Kelurahan"

            // kader penanggung jawab
            $table->foreignId('kader_id')->nullable()->constrained('pengguna')->nullOnDelete();

            $table->text('catatan')->nullable();

            $table->enum('status', ['akan_datang', 'berjalan', 'selesai'])->default('akan_datang');

            $table->timestamps();

            $table->index(['wilayah_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sesi_posbindu');
    }
};
