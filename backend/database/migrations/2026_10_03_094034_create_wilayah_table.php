<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Dijalankan saat `php artisan migrate`
    public function up(): void
    {
        Schema::create('wilayah', function (Blueprint $table) {
            $table->id();                                              // nomor unik tiap baris
            $table->foreignId('parent_id')->nullable();                // kecamatan induknya (NULL kalau kecamatan)
            $table->string('nama', 100);                               // nama wilayah
            $table->enum('tipe', ['kecamatan', 'kelurahan']);          // hanya 2 nilai ini yang sah
            $table->string('kode', 20)->nullable()->unique();          // kode resmi BPS, tak boleh ganda
            $table->timestamps();                                      // otomatis catat dibuat/diubah kapan
            $table->index('tipe');                                     // biar filter tipe cepat
        });
    }

    // Dijalankan saat `php artisan migrate:rollback`
    public function down(): void
    {
        Schema::dropIfExists('wilayah');                               // hapus tabel wilayah
    }
};
