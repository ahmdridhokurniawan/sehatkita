<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Tambah kolom telegram_chat_id dan connect token pada tabel pengguna
    public function up(): void
    {
        Schema::table('pengguna', function (Blueprint $table) {
            $table->string('telegram_chat_id', 50)->nullable()->unique()->after('email');
            $table->string('telegram_connect_token', 32)->nullable()->unique()->after('telegram_chat_id');
        });
    }

    public function down(): void
    {
        Schema::table('pengguna', function (Blueprint $table) {
            $table->dropColumn(['telegram_chat_id', 'telegram_connect_token']);
        });
    }
};
