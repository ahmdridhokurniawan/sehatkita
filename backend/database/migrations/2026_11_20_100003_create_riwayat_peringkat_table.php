<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riwayat_peringkat', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();
            $table->foreignId('wilayah_id')->nullable()->constrained('wilayah')->nullOnDelete();
            $table->string('periode_kode', 16);
            $table->string('periode_label', 60);
            $table->date('mulai_periode');
            $table->date('selesai_periode');
            $table->unsignedInteger('exp_akhir')->default(0);
            $table->unsignedTinyInteger('level_akhir')->default(1);
            $table->unsignedInteger('peringkat_akhir')->nullable();
            $table->unsignedInteger('total_peserta')->default(0);
            $table->timestamp('diarsipkan_pada');
            $table->timestamps();

            $table->unique(['user_id', 'periode_kode']);
            $table->index(['wilayah_id', 'periode_kode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riwayat_peringkat');
    }
};
