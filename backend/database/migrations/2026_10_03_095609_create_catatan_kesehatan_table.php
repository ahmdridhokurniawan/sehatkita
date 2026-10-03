<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catatan_kesehatan', function (Blueprint $table) {
            $table->id();

            // milik siapa data ini
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();

            // siapa yang menginput (NULL kalau user input sendiri)
            $table->foreignId('dicatat_oleh')->nullable()->constrained('pengguna')->nullOnDelete();

            $table->date('dicatat_pada');                       // tanggal pemeriksaan

            // sumber data: mandiri / kader (Posbindu) / puskesmas
            $table->enum('sumber', ['mandiri', 'kader', 'puskesmas'])->default('mandiri');

            // kalau diambil saat Posbindu, tunjuk sesinya
            $table->foreignId('sesi_posbindu_id')->nullable()->constrained('sesi_posbindu')->nullOnDelete();

            // ── ANTROPOMETRI (ukuran tubuh) ──
            $table->decimal('bb_kg', 5, 2)->nullable();         // berat badan (kg)
            $table->decimal('lingkar_perut', 5, 2)->nullable(); // lingkar perut (cm)

            // ── TEKANAN DARAH ──
            $table->unsignedSmallInteger('sistol')->nullable(); // angka atas
            $table->unsignedSmallInteger('diastol')->nullable();// angka bawah

            // ── BIOKIMIA ──
            $table->unsignedSmallInteger('gula_darah')->nullable();
            $table->enum('jenis_gula_darah', ['puasa', '2jam_pp'])->nullable();
            $table->unsignedSmallInteger('kolesterol')->nullable();
            $table->decimal('asam_urat', 4, 1)->nullable();

            // ── GAYA HIDUP ──
            $table->unsignedTinyInteger('tidur_jam')->nullable();
            $table->boolean('merokok')->nullable();
            $table->enum('konsumsi_manis', ['jarang', 'sering', 'setiap_hari'])->nullable();

            $table->text('catatan')->nullable();

            // true = nilai di luar rentang wajar, dikeluarkan dari agregat
            $table->boolean('perlu_verifikasi')->default(false);

            $table->timestamps();

            // ── 3 index untuk 3 query tersering ──
            $table->index(['user_id', 'dicatat_pada']);  // tren pribadi
            $table->index(['dicatat_pada', 'sumber']);   // rekap wilayah
            $table->index('perlu_verifikasi');           // agregat
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catatan_kesehatan');
    }
};