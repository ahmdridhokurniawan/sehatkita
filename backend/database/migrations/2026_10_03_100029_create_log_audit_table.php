<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('log_audit', function (Blueprint $table) {
            $table->id();

            // siapa yang melakukan aksi
            $table->foreignId('user_id')->nullable()->constrained('pengguna')->nullOnDelete();

            $table->string('aksi', 50);
            $table->string('model', 100)->nullable();
            $table->unsignedBigInteger('model_id')->nullable();

            $table->string('ip', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'created_at']);
            $table->index(['model', 'model_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('log_audit');
    }
};
