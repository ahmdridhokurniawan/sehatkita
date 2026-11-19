<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('edukasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wilayah_id')->nullable()->constrained('wilayah')->nullOnDelete();
            $table->string('judul', 180);
            $table->string('ringkasan', 500);
            $table->text('konten');
            $table->string('kategori', 50)->default('umum');
            $table->unsignedSmallInteger('estimasi_menit')->default(5);
            $table->unsignedSmallInteger('urutan')->default(0);
            $table->boolean('aktif')->default(true);
            $table->foreignId('dibuat_oleh')->nullable()->constrained('pengguna')->nullOnDelete();
            $table->timestamps();

            $table->index(['kategori', 'aktif']);
        });

        Schema::create('progres_edukasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('edukasi_id')->constrained('edukasi')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('pengguna')->cascadeOnDelete();
            $table->unsignedTinyInteger('progres_persen')->default(0);
            $table->boolean('sudah_dibaca')->default(false);
            $table->text('catatan_pribadi')->nullable();
            $table->timestamp('selesai_pada')->nullable();
            $table->timestamps();

            $table->unique(['edukasi_id', 'user_id']);
        });

        Schema::table('peserta_program', function (Blueprint $table) {
            if (! Schema::hasColumn('peserta_program', 'progres_persen')) {
                $table->unsignedTinyInteger('progres_persen')->default(0)->after('status');
            }
            if (! Schema::hasColumn('peserta_program', 'catatan_progres')) {
                $table->text('catatan_progres')->nullable()->after('progres_persen');
            }
            if (! Schema::hasColumn('peserta_program', 'progres_diperbarui_pada')) {
                $table->timestamp('progres_diperbarui_pada')->nullable()->after('catatan_progres');
            }
        });
    }

    public function down(): void
    {
        Schema::table('peserta_program', function (Blueprint $table) {
            $cols = array_filter(
                ['progres_persen', 'catatan_progres', 'progres_diperbarui_pada'],
                fn ($col) => Schema::hasColumn('peserta_program', $col)
            );
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });

        Schema::dropIfExists('progres_edukasi');
        Schema::dropIfExists('edukasi');
    }
};
