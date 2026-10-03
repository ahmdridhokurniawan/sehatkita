<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program', function (Blueprint $table) {
            $table->id();

            $table->foreignId('wilayah_id')->constrained('wilayah')->restrictOnDelete();

            $table->string('judul', 150);
            $table->enum('jenis', ['olahraga', 'edukasi', 'pemeriksaan', 'lainnya']);

            $table->unsignedInteger('target_peserta')->nullable();

            $table->date('mulai');
            $table->date('selesai')->nullable();

            $table->enum('status', ['akan_datang', 'berjalan', 'selesai'])->default('akan_datang');

            $table->timestamps();

            $table->index(['wilayah_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program');
    }
};
