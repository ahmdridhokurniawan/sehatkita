<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('program', function (Blueprint $table) {
            $table->string('mode_progres', 20)->default('manual')->after('target_peserta');
        });
    }

    public function down(): void
    {
        Schema::table('program', function (Blueprint $table) {
            $table->dropColumn('mode_progres');
        });
    }
};
