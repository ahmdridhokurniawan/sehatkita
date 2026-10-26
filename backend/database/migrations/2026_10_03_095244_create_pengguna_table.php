
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
            $table->string('name');
            $table->string('email')->unique(); // Unique index (B-8)
            $table->string('password');

            $table->enum('role', [
                'super_admin',
                'admin_kelurahan',
                'kader',
                'user',
            ])->default('user');

            $table->foreignId('wilayah_id')
                ->nullable()
                ->constrained('wilayah')
                ->nullOnDelete();

            $table->timestamp('consent_at')->nullable();
            $table->string('versi_kebijakan', 20)->nullable();
            $table->boolean('aktif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengguna');
    }
};
