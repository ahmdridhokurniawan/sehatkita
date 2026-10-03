<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ambang_kategori', function (Blueprint $table) {
            $table->id();

            // ambang milik indikator mana
            $table->foreignId('indikator_id')->constrained('indikator')->cascadeOnDelete();

            $table->decimal('batas_min', 8, 2);              // batas bawah, mis. 25.00
            $table->decimal('batas_max', 8, 2)->nullable();  // batas atas; NULL = tak berbatas
            $table->string('kategori', 50);                  // mis. "gemuk", "normal"

            // status kesehatan jika nilai masuk rentang ini
            $table->enum('status', ['normal', 'perlu_perhatian', 'berisiko']);

            $table->unsignedTinyInteger('skor')->default(0); // sumbangan skor risiko

            $table->timestamps();

            $table->index(['indikator_id', 'batas_min']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ambang_kategori');
    }
};
