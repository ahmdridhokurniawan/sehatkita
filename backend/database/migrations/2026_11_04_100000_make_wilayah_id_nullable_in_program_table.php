<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ubah wilayah_id di tabel program agar nullable (null = program kota untuk super admin).
     */
    public function up(): void
    {
        Schema::table('program', function (Blueprint $table) {
            $table->unsignedBigInteger('wilayah_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('program', function (Blueprint $table) {
            $table->unsignedBigInteger('wilayah_id')->nullable(false)->change();
        });
    }
};
