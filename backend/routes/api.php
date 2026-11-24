<?php

use App\Http\Controllers\AdminExportController;
use App\Http\Controllers\AdminMasterController;
use App\Http\Controllers\AdminStatistikController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatatanKesehatanController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DashboardWilayahController;
use App\Http\Controllers\EdukasiController;
use App\Http\Controllers\FaskesController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\KepuasanMasyarakatController;
use App\Http\Controllers\PengaduanController;
use App\Http\Controllers\PeringkatController;
use App\Http\Controllers\PosbinduController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\RekamMedisController;
use App\Http\Controllers\RujukanController;
use App\Http\Controllers\TargetKesehatanController;
use App\Http\Controllers\TargetRefleksiController;
use App\Http\Controllers\TelegramController;
use App\Http\Controllers\WilayahController;
use Illuminate\Support\Facades\Route;

// Daftar alamat layanan yang menghubungkan tampilan aplikasi dengan fitur-fitur di belakang layar.
Route::prefix('v1')->middleware('throttle:api')->whereNumber(['id', 'pesertaId', 'catatan_kesehatan'])->group(function () {

    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
    Route::get('/wilayah', [WilayahController::class, 'index']);
    Route::post('/telegram/webhook', [TelegramController::class, 'webhook']);

    Route::middleware(['auth:sanctum', 'single.ip'])->group(function () {

        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::post('/persetujuan', [AuthController::class, 'consent']);
        Route::delete('/persetujuan', [AuthController::class, 'revokeConsent']);

        Route::get('/profil', [ProfilController::class, 'show']);
        Route::put('/profil', [ProfilController::class, 'update']);

        Route::get('/telegram/status', [TelegramController::class, 'status']);
        Route::post('/telegram/putuskan', [TelegramController::class, 'putuskan']);

        Route::get('/wilayah/{id}', [WilayahController::class, 'show']);
        Route::get('/faskes', [FaskesController::class, 'index']);

        Route::get('/catatan-kesehatan', [CatatanKesehatanController::class, 'index']);
        Route::post('/catatan-kesehatan', [CatatanKesehatanController::class, 'store']);
        Route::get('/catatan-kesehatan/{catatan_kesehatan}', [CatatanKesehatanController::class, 'show']);
        Route::delete('/catatan-kesehatan/{catatan_kesehatan}', [CatatanKesehatanController::class, 'destroy']);

        Route::get('/insight', [InsightController::class, 'index']);
        Route::get('/insight/ambang', [InsightController::class, 'ambang']);

        Route::get('/tren', [RekamMedisController::class, 'index']);
        Route::get('/rekam-medis', [RekamMedisController::class, 'index']);

        Route::post('/rujukan', [RujukanController::class, 'store']);
        Route::get('/rujukan', [RujukanController::class, 'index']);
        Route::get('/rujukan/{id}/surat', [RujukanController::class, 'surat']);
        Route::patch('/rujukan/{id}/status', [RujukanController::class, 'updateStatus']);

        Route::get('/posbindu/sesi', [PosbinduController::class, 'indexSesi']);
        Route::post('/posbindu/sesi', [PosbinduController::class, 'storeSesi']);
        Route::get('/posbindu/sesi/{id}', [PosbinduController::class, 'showSesi']);
        Route::put('/posbindu/sesi/{id}', [PosbinduController::class, 'updateSesi']);
        Route::delete('/posbindu/sesi/{id}', [PosbinduController::class, 'destroySesi']);
        Route::post('/posbindu/sesi/{id}/peserta', [PosbinduController::class, 'storePeserta']);
        Route::get('/posbindu/kunjungan', [PosbinduController::class, 'indexKunjungan']);
        Route::get('/posbindu/peserta/cari-nik', [PosbinduController::class, 'cariNik']);
        Route::get('/pengguna/cari-nik', [PosbinduController::class, 'cariNik']);

        Route::get('/program', [ProgramController::class, 'index']);
        Route::post('/program', [ProgramController::class, 'store']);
        Route::get('/program/{id}', [ProgramController::class, 'show']);
        Route::match(['put', 'patch'], '/program/{id}', [ProgramController::class, 'update']);
        Route::delete('/program/{id}', [ProgramController::class, 'destroy']);
        Route::get('/program/{id}/peserta', [ProgramController::class, 'peserta']);
        Route::post('/program/{id}/peserta', [ProgramController::class, 'ikut']);
        Route::patch('/program/{id}/peserta', [ProgramController::class, 'ubahStatusPeserta']);
        Route::patch('/program/{id}/progres', [ProgramController::class, 'perbaruiProgres']);
        Route::post('/program/{id}/bukti', [ProgramController::class, 'kirimBukti']);
        Route::delete('/program/{id}/bukti', [ProgramController::class, 'hapusBukti']);
        Route::get('/program/{id}/bukti/{pesertaId}', [ProgramController::class, 'lihatBukti']);
        Route::get('/peringkat', [PeringkatController::class, 'index']);
        Route::get('/achievement', [PeringkatController::class, 'achievement']);

        Route::get('/edukasi', [EdukasiController::class, 'index']);
        Route::post('/edukasi', [EdukasiController::class, 'store']);
        Route::get('/edukasi/{id}', [EdukasiController::class, 'show']);
        Route::match(['put', 'patch'], '/edukasi/{id}', [EdukasiController::class, 'update']);
        Route::delete('/edukasi/{id}', [EdukasiController::class, 'destroy']);
        Route::patch('/edukasi/{id}/progres', [EdukasiController::class, 'simpanProgres']);

        Route::get('/target', [TargetRefleksiController::class, 'target']);
        Route::put('/target', [TargetRefleksiController::class, 'simpanTarget']);
        Route::get('/refleksi', [TargetRefleksiController::class, 'refleksi']);
        Route::post('/refleksi', [TargetRefleksiController::class, 'simpanRefleksi']);

        Route::get('/target-kesehatan', [TargetKesehatanController::class, 'index']);
        Route::post('/target-kesehatan', [TargetKesehatanController::class, 'store']);
        Route::put('/target-kesehatan/{id}', [TargetKesehatanController::class, 'update']);
        Route::patch('/target-kesehatan/{id}/capai', [TargetKesehatanController::class, 'capai']);
        Route::delete('/target-kesehatan/{id}', [TargetKesehatanController::class, 'destroy']);

        Route::get('/pengaduan', [PengaduanController::class, 'index']);
        Route::post('/pengaduan', [PengaduanController::class, 'store']);
        Route::get('/pengaduan/{id}', [PengaduanController::class, 'show']);
        Route::patch('/pengaduan/{id}/tanggapi', [PengaduanController::class, 'tanggapi']);

        Route::get('/kepuasan-masyarakat', [KepuasanMasyarakatController::class, 'index']);
        Route::post('/kepuasan-masyarakat', [KepuasanMasyarakatController::class, 'store']);

        Route::get('/dashboard/pribadi', [DashboardController::class, 'pribadi']);
        Route::get('/dashboard/kelurahan', [DashboardWilayahController::class, 'dashboardKelurahan']);
        Route::get('/laporan/pribadi', [DashboardWilayahController::class, 'laporanPribadi']);
        Route::get('/laporan/kelurahan', [DashboardWilayahController::class, 'laporanKelurahan']);

        Route::prefix('admin')->group(function () {
            Route::get('/statistik', [AdminStatistikController::class, 'index']);
            Route::get('/export', [AdminExportController::class, 'export']);

            Route::get('/indikator', [AdminMasterController::class, 'indexIndikator']);
            Route::post('/indikator', [AdminMasterController::class, 'storeIndikator']);
            Route::put('/indikator/{id}', [AdminMasterController::class, 'updateIndikator']);
            Route::delete('/indikator/{id}', [AdminMasterController::class, 'destroyIndikator']);

            Route::get('/ambang-kategori', [AdminMasterController::class, 'indexAmbang']);
            Route::post('/ambang-kategori', [AdminMasterController::class, 'storeAmbang']);
            Route::put('/ambang-kategori/{id}', [AdminMasterController::class, 'updateAmbang']);
            Route::delete('/ambang-kategori/{id}', [AdminMasterController::class, 'destroyAmbang']);

            Route::get('/pengguna', [AdminMasterController::class, 'indexPengguna']);
            Route::post('/pengguna', [AdminMasterController::class, 'storePengguna']);
            Route::get('/pengguna/{id}/riwayat-wilayah', [AdminMasterController::class, 'riwayatWilayahPengguna']);
            Route::put('/pengguna/{id}', [AdminMasterController::class, 'updatePengguna']);
            Route::delete('/pengguna/{id}', [AdminMasterController::class, 'destroyPengguna']);

            Route::get('/faskes', [AdminMasterController::class, 'indexFaskes']);
            Route::post('/faskes', [AdminMasterController::class, 'storeFaskes']);
            Route::put('/faskes/{id}', [AdminMasterController::class, 'updateFaskes']);
            Route::delete('/faskes/{id}', [AdminMasterController::class, 'destroyFaskes']);

            Route::get('/log-audit', [AdminMasterController::class, 'indexLogAudit']);

            Route::get('/catatan-kesehatan/perlu-verifikasi', [CatatanKesehatanController::class, 'perluVerifikasiList']);
            Route::patch('/catatan-kesehatan/{id}/verifikasi', [CatatanKesehatanController::class, 'verifikasi']);
        });
    });
});
