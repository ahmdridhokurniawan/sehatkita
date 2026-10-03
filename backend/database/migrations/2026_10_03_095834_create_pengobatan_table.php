<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengobatan', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();

            $table->string('nama_obat', 150);
            $table->string('dosis', 100)->nullable();   // mis. "5mg", "1x sehari"

            $table->date('mulai')->nullable();          // kapan mulai minum
            $table->date('selesai')->nullable();        // NULL = masih berjalan

            $table->boolean('aktif')->default(true);

            $table->timestamps();

            $table->index(['user_id', 'aktif']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengobatan');
    }
};
