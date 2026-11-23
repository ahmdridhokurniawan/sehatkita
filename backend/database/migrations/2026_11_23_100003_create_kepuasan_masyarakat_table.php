<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kepuasan_masyarakat', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();
            $table->foreignId('wilayah_id')->nullable()->constrained('wilayah')->nullOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('aspek_pelayanan', 80)->nullable();
            $table->text('komentar')->nullable();
            $table->timestamps();

            $table->index(['wilayah_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kepuasan_masyarakat');
    }
};
