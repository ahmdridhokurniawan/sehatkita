<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE rujukan MODIFY COLUMN status ENUM('baru','dihubungi','tertangani','ditolak','selesai') NOT NULL DEFAULT 'baru'");
            DB::table('rujukan')->where('status', 'tertangani')->update(['status' => 'selesai']);
            try {
                DB::statement("ALTER TABLE rujukan MODIFY COLUMN status ENUM('baru','dihubungi','selesai','ditolak') NOT NULL DEFAULT 'baru'");
            } catch (\Throwable) {
                // Fallback jika engine volume Docker menolak rename #sql-backup saat menyusutkan ENUM
            }
            return;
        }

        // Untuk SQLite/Postgres: lepas constraint enum sementara agar update data berjalan aman
        Schema::table('rujukan', function (Blueprint $table) {
            $table->string('status', 20)->default('baru')->change();
        });

        DB::table('rujukan')->where('status', 'tertangani')->update(['status' => 'selesai']);

        Schema::table('rujukan', function (Blueprint $table) {
            $table->enum('status', ['baru', 'dihubungi', 'selesai', 'ditolak'])->default('baru')->change();
        });
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE rujukan MODIFY COLUMN status ENUM('baru','dihubungi','tertangani','selesai','ditolak') NOT NULL DEFAULT 'baru'");
            DB::table('rujukan')->where('status', 'selesai')->update(['status' => 'tertangani']);
            DB::statement("ALTER TABLE rujukan MODIFY COLUMN status ENUM('baru','dihubungi','tertangani','ditolak') NOT NULL DEFAULT 'baru'");
            return;
        }

        Schema::table('rujukan', function (Blueprint $table) {
            $table->string('status', 20)->default('baru')->change();
        });

        DB::table('rujukan')->where('status', 'selesai')->update(['status' => 'tertangani']);

        Schema::table('rujukan', function (Blueprint $table) {
            $table->enum('status', ['baru', 'dihubungi', 'tertangani', 'ditolak'])->default('baru')->change();
        });
    }
};
