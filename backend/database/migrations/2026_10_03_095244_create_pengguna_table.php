<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengguna', function (Blueprint $table) {
            $table->id();                                       
            $table->string('name');                             // nama lengkap
            $table->string('email')->unique();                  // untuk login, tak boleh ganda
            $table->timestamp('email_verified_at')->nullable(); // kapan email diverifikasi (boleh kosong)
            $table->string('password');                         // password (di-hash otomatis)
            $table->rememberToken();                            // token "ingat saya"

            // 4 role sah sesuai kontrak §1.7
            $table->enum('role', ['super_admin', 'admin_kelurahan', 'kader', 'user'])->default('user');

            // user daftar di kelurahan mana
            $table->foreignId('wilayah_id')->nullable()->constrained('wilayah')->nullOnDelete();

            $table->timestamp('consent_at')->nullable();        // NULL = belum setuju pakai data
            $table->string('versi_kebijakan', 20)->nullable();  // versi kebijakan yang disetujui

            $table->timestamps();                               // created_at + updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengguna');
    }
};
