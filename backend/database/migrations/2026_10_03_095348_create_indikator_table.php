<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('indikator', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 30)->unique();      // dipakai di kode program, mis. "imt"
            $table->string('nama', 100);               // tampilan, mis. "Indeks Massa Tubuh"
            $table->string('satuan', 20)->nullable();  // mis. "kg/m2", "mmHg", "mg/dL"
            $table->string('kelompok', 50)->nullable();// mis. "antropometri", "biokimia"
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('indikator');
    }
};
