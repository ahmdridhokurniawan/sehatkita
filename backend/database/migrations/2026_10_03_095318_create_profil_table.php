<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profil', function (Blueprint $table) {
            // user_id jadi PRIMARY KEY -> 1 user hanya punya 1 profil
            $table->foreignId('user_id')->primary()->constrained('pengguna')->cascadeOnDelete();

            $table->date('tgl_lahir')->nullable();                 // umur dihitung dari sini
            $table->enum('jenis_kelamin', ['L', 'P'])->nullable(); 
            $table->decimal('tinggi_cm', 5, 2)->nullable();        // tinggi badan (cm)
            $table->enum('tingkat_aktivitas', ['ringan', 'sedang', 'berat'])->nullable();
            $table->boolean('merokok')->default(false);            // perokok / bukan

            // riwayat penyakit keluarga, bentuk array mis. ["hipertensi","diabetes"]
            $table->json('riwayat_keluarga')->nullable();

            // target kesehatan (progress bar di dashboard)
            $table->decimal('bb_target_kg', 5, 2)->nullable();     // target berat badan
            $table->unsignedTinyInteger('target_aktivitas_per_minggu')->nullable();
            $table->unsignedInteger('target_air_ml')->nullable();  // target minum air (ml/hari)

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profil');
    }
};
