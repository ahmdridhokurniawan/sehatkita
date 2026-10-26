<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Menyelaraskan skema DB dengan kontrak-api.md v1.5.
 *
 * Yang ditambahkan:
 *  - pengguna: exp_total, level_gamifikasi, kader_id
 *  - profil: tampil_di_peringkat, bb_awal_kg
 *  - indikator: interval_skrining_hari
 *  - ambang_kategori: memicu_rujukan, jenis_gula_darah
 *  - catatan_kesehatan: snapshot tinggi_cm + kategori_* + status + skor, soft delete
 *  - rujukan: otomatis, indikator
 *  - program: kategori_aktivitas; exp -> exp_reward; badge -> badge_reward
 *  - tabel baru: badge_pengguna
 */
return new class extends Migration
{
    public function up(): void
    {
        // ---------- pengguna (kontrak 12.5 & 15) ----------
        Schema::table('pengguna', function (Blueprint $table) {
            if (! Schema::hasColumn('pengguna', 'exp_total')) {
                $table->unsignedInteger('exp_total')->default(0)->after('aktif');
            }
            if (! Schema::hasColumn('pengguna', 'level_gamifikasi')) {
                $table->unsignedTinyInteger('level_gamifikasi')->default(1)->after('exp_total');
            }
            if (! Schema::hasColumn('pengguna', 'kader_id')) {
                // kader pembina warga (kontrak 15: ditetapkan super_admin)
                $table->unsignedBigInteger('kader_id')->nullable()->after('wilayah_id');
                $table->index('kader_id');
            }
        });

        // ---------- profil (kontrak 5.1 / 12.5 / 13.2) ----------
        Schema::table('profil', function (Blueprint $table) {
            if (! Schema::hasColumn('profil', 'tampil_di_peringkat')) {
                $table->boolean('tampil_di_peringkat')->default(false)->after('riwayat_keluarga');
            }
            if (! Schema::hasColumn('profil', 'bb_awal_kg')) {
                $table->decimal('bb_awal_kg', 5, 2)->nullable()->after('bb_target_kg');
            }
        });

        // ---------- indikator (kontrak 15) ----------
        Schema::table('indikator', function (Blueprint $table) {
            if (! Schema::hasColumn('indikator', 'interval_skrining_hari')) {
                $table->unsignedSmallInteger('interval_skrining_hari')->default(30)->after('kelompok');
            }
        });

        // ---------- ambang_kategori (kontrak 8.3 / 15) ----------
        Schema::table('ambang_kategori', function (Blueprint $table) {
            if (! Schema::hasColumn('ambang_kategori', 'memicu_rujukan')) {
                $table->boolean('memicu_rujukan')->default(false)->after('skor');
            }
            if (! Schema::hasColumn('ambang_kategori', 'jenis_gula_darah')) {
                $table->enum('jenis_gula_darah', ['puasa', '2jam_pp'])->nullable()->after('indikator_id');
            }
        });

        // ---------- catatan_kesehatan: snapshot + soft delete (kontrak 7.1) ----------
        Schema::table('catatan_kesehatan', function (Blueprint $table) {
            if (! Schema::hasColumn('catatan_kesehatan', 'tinggi_cm')) {
                $table->decimal('tinggi_cm', 5, 2)->nullable()->after('bb_kg');
            }
            if (! Schema::hasColumn('catatan_kesehatan', 'kategori_imt')) {
                $table->string('kategori_imt', 50)->nullable()->after('tinggi_cm');
            }
            if (! Schema::hasColumn('catatan_kesehatan', 'kategori_tensi')) {
                $table->string('kategori_tensi', 50)->nullable()->after('kategori_imt');
            }
            if (! Schema::hasColumn('catatan_kesehatan', 'kategori_gula_darah')) {
                $table->string('kategori_gula_darah', 50)->nullable()->after('kategori_tensi');
            }
            if (! Schema::hasColumn('catatan_kesehatan', 'kategori_kolesterol')) {
                $table->string('kategori_kolesterol', 50)->nullable()->after('kategori_gula_darah');
            }
            if (! Schema::hasColumn('catatan_kesehatan', 'kategori_asam_urat')) {
                $table->string('kategori_asam_urat', 50)->nullable()->after('kategori_kolesterol');
            }
            if (! Schema::hasColumn('catatan_kesehatan', 'status_kesehatan')) {
                $table->string('status_kesehatan', 30)->nullable()->after('kategori_asam_urat');
            }
            if (! Schema::hasColumn('catatan_kesehatan', 'skor_risiko')) {
                $table->unsignedTinyInteger('skor_risiko')->nullable()->after('status_kesehatan');
            }
            if (! Schema::hasColumn('catatan_kesehatan', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        // ---------- rujukan (kontrak 11) ----------
        Schema::table('rujukan', function (Blueprint $table) {
            if (! Schema::hasColumn('rujukan', 'otomatis')) {
                $table->boolean('otomatis')->default(false)->after('dibuat_oleh');
            }
            if (! Schema::hasColumn('rujukan', 'indikator')) {
                $table->string('indikator', 30)->nullable()->after('otomatis');
            }
        });

        // ---------- program (kontrak 12.1) ----------
        if (Schema::hasColumn('program', 'exp') && ! Schema::hasColumn('program', 'exp_reward')) {
            Schema::table('program', function (Blueprint $table) {
                $table->renameColumn('exp', 'exp_reward');
            });
        }
        if (Schema::hasColumn('program', 'badge') && ! Schema::hasColumn('program', 'badge_reward')) {
            Schema::table('program', function (Blueprint $table) {
                $table->renameColumn('badge', 'badge_reward');
            });
        }
        Schema::table('program', function (Blueprint $table) {
            if (! Schema::hasColumn('program', 'kategori_aktivitas')) {
                $table->string('kategori_aktivitas', 50)->nullable()->after('jenis');
            }
        });

        // ---------- badge_pengguna (kontrak 12.5) ----------
        if (! Schema::hasTable('badge_pengguna')) {
            Schema::create('badge_pengguna', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('badge', 100);
                $table->unsignedBigInteger('program_id')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'badge']);
                $table->foreign('user_id')->references('id')->on('pengguna')->cascadeOnDelete();
            });
        }

        // ---------- ambang sesuai kontrak 8.3 ----------
        $this->seedAmbangKontrak();
    }

    public function down(): void
    {
        Schema::dropIfExists('badge_pengguna');

        Schema::table('program', function (Blueprint $table) {
            if (Schema::hasColumn('program', 'kategori_aktivitas')) {
                $table->dropColumn('kategori_aktivitas');
            }
        });
        if (Schema::hasColumn('program', 'exp_reward')) {
            Schema::table('program', fn (Blueprint $t) => $t->renameColumn('exp_reward', 'exp'));
        }
        if (Schema::hasColumn('program', 'badge_reward')) {
            Schema::table('program', fn (Blueprint $t) => $t->renameColumn('badge_reward', 'badge'));
        }

        Schema::table('rujukan', function (Blueprint $table) {
            $table->dropColumn(['otomatis', 'indikator']);
        });
        Schema::table('catatan_kesehatan', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'tinggi_cm', 'kategori_imt', 'kategori_tensi', 'kategori_gula_darah',
                'kategori_kolesterol', 'kategori_asam_urat', 'status_kesehatan', 'skor_risiko',
            ]);
        });
        Schema::table('ambang_kategori', function (Blueprint $table) {
            $table->dropColumn(['memicu_rujukan', 'jenis_gula_darah']);
        });
        Schema::table('indikator', function (Blueprint $table) {
            $table->dropColumn('interval_skrining_hari');
        });
        Schema::table('profil', function (Blueprint $table) {
            $table->dropColumn(['tampil_di_peringkat', 'bb_awal_kg']);
        });
        Schema::table('pengguna', function (Blueprint $table) {
            $table->dropColumn(['exp_total', 'level_gamifikasi', 'kader_id']);
        });
    }

    /**
     * Ganti isi ambang_kategori dengan tabel kontrak 8.3.
     * Rentang [batas_min, batas_max) tanpa celah & tanpa tumpang tindih.
     */
    private function seedAmbangKontrak(): void
    {
        // [kode, jenis_gula_darah, batas_min, batas_max, kategori, status, skor, memicu_rujukan]
        $baris = [
            ['imt', null, 0, 18.5, 'kurus', 'perlu_perhatian', 1, false],
            ['imt', null, 18.5, 25, 'normal', 'normal', 0, false],
            ['imt', null, 25, 30, 'gemuk', 'perlu_perhatian', 1, false],
            ['imt', null, 30, null, 'obesitas', 'berisiko', 2, false],

            ['sistol', null, 0, 120, 'normal', 'normal', 0, false],
            ['sistol', null, 120, 140, 'perlu_perhatian', 'perlu_perhatian', 1, false],
            ['sistol', null, 140, 180, 'tinggi', 'berisiko', 2, false],
            ['sistol', null, 180, null, 'krisis', 'berisiko', 3, true],

            ['diastol', null, 0, 80, 'normal', 'normal', 0, false],
            ['diastol', null, 80, 90, 'perlu_perhatian', 'perlu_perhatian', 1, false],
            ['diastol', null, 90, 110, 'tinggi', 'berisiko', 2, false],
            ['diastol', null, 110, null, 'krisis', 'berisiko', 3, true],

            ['gula_darah', 'puasa', 0, 100, 'normal', 'normal', 0, false],
            ['gula_darah', 'puasa', 100, 126, 'perlu_perhatian', 'perlu_perhatian', 1, false],
            ['gula_darah', 'puasa', 126, null, 'tinggi', 'berisiko', 2, false],

            ['gula_darah', '2jam_pp', 0, 140, 'normal', 'normal', 0, false],
            ['gula_darah', '2jam_pp', 140, 200, 'perlu_perhatian', 'perlu_perhatian', 1, false],
            ['gula_darah', '2jam_pp', 200, null, 'tinggi', 'berisiko', 2, false],

            ['kolesterol', null, 0, 200, 'normal', 'normal', 0, false],
            ['kolesterol', null, 200, 240, 'perlu_perhatian', 'perlu_perhatian', 1, false],
            ['kolesterol', null, 240, null, 'tinggi', 'berisiko', 2, false],

            ['asam_urat', null, 0, 7, 'normal', 'normal', 0, false],
            ['asam_urat', null, 7, 9, 'perlu_perhatian', 'perlu_perhatian', 1, false],
            ['asam_urat', null, 9, null, 'tinggi', 'berisiko', 2, false],
        ];

        $idPerKode = DB::table('indikator')->pluck('id', 'kode');

        // Hapus dulu SEMUA baris lama untuk kode yang akan ditulis ulang.
        // (Kalau delete ditaruh di dalam loop, baris yang baru di-insert ikut terhapus.)
        $kodeTerdampak = array_values(array_unique(array_column($baris, 0)));

        DB::table('ambang_kategori')
            ->whereIn('indikator_id', array_map(fn ($k) => $idPerKode[$k] ?? 0, $kodeTerdampak))
            ->delete();

        foreach ($baris as [$kode, $jenisGula, $min, $max, $kategori, $status, $skor, $memicu]) {
            if (! isset($idPerKode[$kode])) {
                continue;
            }

            DB::table('ambang_kategori')->insert([
                'indikator_id'      => $idPerKode[$kode],
                'jenis_gula_darah'  => $jenisGula,
                'batas_min'         => $min,
                'batas_max'         => $max,
                'kategori'          => $kategori,
                'status'            => $status,
                'skor'              => $skor,
                'memicu_rujukan'    => $memicu,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
        }

        // interval skrining default kontrak
        DB::table('indikator')->update(['interval_skrining_hari' => 30]);
        DB::table('indikator')->where('kode', 'gula_darah')->update(['interval_skrining_hari' => 90]);
    }
};
