<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('program', function (Blueprint $table) {
            if (! Schema::hasColumn('program', 'deskripsi')) {
                $table->text('deskripsi')->nullable()->after('judul');
            }
            if (! Schema::hasColumn('program', 'kriteria_misi')) {
                $table->text('kriteria_misi')->nullable()->after('deskripsi');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE peserta_program MODIFY status VARCHAR(30) NOT NULL DEFAULT 'terdaftar'");
        }

        Schema::table('peserta_program', function (Blueprint $table) {
            if (DB::getDriverName() !== 'mysql') {
                $table->string('status', 30)->default('terdaftar')->change();
            }
            if (! Schema::hasColumn('peserta_program', 'bukti_foto')) {
                $table->string('bukti_foto', 255)->nullable()->after('status');
            }
            if (! Schema::hasColumn('peserta_program', 'catatan_bukti')) {
                $table->text('catatan_bukti')->nullable()->after('bukti_foto');
            }
            if (! Schema::hasColumn('peserta_program', 'dikirim_pada')) {
                $table->timestamp('dikirim_pada')->nullable()->after('catatan_bukti');
            }
            if (! Schema::hasColumn('peserta_program', 'catatan_verifikasi')) {
                $table->text('catatan_verifikasi')->nullable()->after('dikirim_pada');
            }
            if (! Schema::hasColumn('peserta_program', 'diverifikasi_oleh')) {
                $table->unsignedBigInteger('diverifikasi_oleh')->nullable()->after('catatan_verifikasi');
            }
            if (! Schema::hasColumn('peserta_program', 'diverifikasi_pada')) {
                $table->timestamp('diverifikasi_pada')->nullable()->after('diverifikasi_oleh');
            }
        });
    }

    public function down(): void
    {
        Schema::table('peserta_program', function (Blueprint $table) {
            $cols = array_filter([
                'bukti_foto',
                'catatan_bukti',
                'dikirim_pada',
                'catatan_verifikasi',
                'diverifikasi_oleh',
                'diverifikasi_pada',
            ], fn ($col) => Schema::hasColumn('peserta_program', $col));

            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('program', function (Blueprint $table) {
            $cols = array_filter(['deskripsi', 'kriteria_misi'], fn ($col) => Schema::hasColumn('program', $col));
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });
    }
};
