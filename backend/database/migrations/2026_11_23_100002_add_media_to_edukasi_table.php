<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('edukasi', function (Blueprint $table) {
            $table->string('media_foto_path', 255)->nullable()->after('konten');
            $table->string('media_video_path', 255)->nullable()->after('media_foto_path');
            $table->string('media_video_url', 500)->nullable()->after('media_video_path');
        });
    }

    public function down(): void
    {
        Schema::table('edukasi', function (Blueprint $table) {
            $table->dropColumn(['media_foto_path', 'media_video_path', 'media_video_url']);
        });
    }
};
