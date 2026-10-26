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

            // pemilik data
            $table->foreignId('user_id')
                  ->constrained('pengguna')
                  ->cascadeOnDelete();

            // siapa yang meng-input (NULL bila user input sendiri)
            $table->foreignId('dicatat_oleh')
                  ->nullable()
                  ->constrained('pengguna')
                  ->nullOnDelete();

            $table->date('dicatat_pada');

            // sumber data
            $table->enum('sumber', ['mandiri', 'kader', 'puskesmas'])
                  ->default('mandiri');

            // sesi Posbindu (opsional)
            $table->foreignId('sesi_posbindu_id')
                  ->nullable()
                  ->constrained('sesi_posbindu')
                  ->nullOnDelete();

            // ── ANTROPOMETRI ──
            $table->decimal('bb_kg', 5, 2)->nullable();
            $table->decimal('lingkar_perut', 5, 2)->nullable();

            // ── TEKANAN DARAH ──
            $table->unsignedSmallInteger('sistol')->nullable();
            $table->unsignedSmallInteger('diastol')->nullable();

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

            // flag verifikasi (true = nilai di luar rentang wajar)
            $table->boolean('perlu_verifikasi')->default(false);

            $table->timestamps();

            // index untuk query yang paling sering
            $table->index(['user_id', 'dicatat_pada']);   // tren pribadi
            $table->index(['dicatat_pada', 'sumber']);    // rekap wilayah
            $table->index('perlu_verifikasi');           // agregat
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catatan_kesehatan');
    }
};