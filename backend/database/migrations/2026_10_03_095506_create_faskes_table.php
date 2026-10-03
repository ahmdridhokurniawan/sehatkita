<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faskes', function (Blueprint $table) {
            $table->id();

            // faskes berada di wilayah mana
            $table->foreignId('wilayah_id')->nullable()->constrained('wilayah')->nullOnDelete();

            $table->string('nama', 150);
            $table->enum('jenis', ['puskesmas', 'klinik', 'rumah_sakit', 'lainnya']);
            $table->text('alamat')->nullable();
            $table->string('telepon', 30)->nullable();

            // koordinat lokasi (untuk peta sebaran)
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faskes');
    }
};
