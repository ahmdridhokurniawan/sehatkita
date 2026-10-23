<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom gamifikasi ke tabel `program` (kontrak v1.2 25).
     */
    public function up(): void
    {
        Schema::table('program', function (Blueprint $table) {
            // 1. Nama badge yang didapat peserta setelah program selesai.
            //    Contoh: "Pejuang Hidup Sehat". Nullable karena program
            //    biasa (non-gamifikasi) tidak punya badge.
            $table->string('badge', 100)->nullable()->after('status');

            // 2. Poin pengalaman (exp) yang diberikan program ini ke peserta.
            //    Default 0 supaya program lama tetap valid.
            $table->unsignedInteger('exp')->default(0)->after('badge');

            // 3. Level kesulitan program: 1 = pemula, 2 = menengah, 3 = lanjut.
            //    Default 1 supaya data lama tidak kosong.
            $table->unsignedTinyInteger('level')->default(1)->after('exp');

            // 4. Nama peringkat kelurahan, mis. "Kelurahan Sehat Peringkat 1".
            //    Nullable karena tidak semua kelurahan punya peringkat.
            $table->string('rank_kelurahan', 100)->nullable()->after('level');
        });
    }

    /**
     * Rollback: hapus keempat kolom yang ditambahkan.
     */
    public function down(): void
    {
        Schema::table('program', function (Blueprint $table) {
            $table->dropColumn(['badge', 'exp', 'level', 'rank_kelurahan']);
        });
    }
};
