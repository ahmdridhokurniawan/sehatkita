<?php

namespace App\Services;

use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\Pengguna;
use App\Models\Rujukan;
use Illuminate\Support\Facades\DB;

// Layanan pembuat rujukan otomatis saat indikator melewati ambang kritis
class RujukanOtomatisService
{
    public function __construct(
        private HealthCalculatorService $kalkulator,
        private TelegramService $telegram,
        private SuratRujukanService $suratRujukan
    ) {}

    // Buat rujukan faskes otomatis jika indikator catatan memicu rujukan
    public function buatDariCatatan(CatatanKesehatan $catatan, Pengguna $pemilik): void
    {
        $pemicu = $this->kalkulator->indikatorMemicuRujukan($catatan);

        if ($pemicu === []) {
            return;
        }

        $faskesId = $this->cariPuskesmasTerdekat($pemilik);
        if (! $faskesId) {
            return;
        }

        $indikatorBaru = [];
        $rujukanBaru = [];

        foreach ($pemicu as $indikator) {
            // Sistol dan diastol digabung menjadi satu rujukan indikator tensi
            $nama = in_array($indikator, ['sistol', 'diastol'], true) ? 'tensi' : $indikator;

            $sudahAda = Rujukan::where('user_id', $pemilik->id)
                ->where('indikator', $nama)
                ->whereIn('status', ['baru', 'dihubungi'])
                ->exists();

            if ($sudahAda) {
                continue;
            }

            $rujukanBaru[] = Rujukan::create([
                'user_id'     => $pemilik->id,
                'faskes_id'   => $faskesId,
                'alasan'      => 'Rujukan ini saran sistem, bukan diagnosis medis.',
                'dibuat_oleh' => null,
                'status'      => 'baru',
                'otomatis'    => true,
                'indikator'   => $nama,
            ]);

            $indikatorBaru[] = $nama;
        }

        if ($indikatorBaru !== []) {
            DB::afterCommit(function () use ($pemilik, $faskesId, $indikatorBaru, $rujukanBaru) {
                $namaFaskes = Faskes::whereKey($faskesId)->value('nama') ?? 'Puskesmas terdekat';
                $daftarIndikator = implode(', ', $indikatorBaru);
                $pemilikSegar = $pemilik->fresh() ?? $pemilik;

                $this->telegram->kirimNotifikasiUser(
                    $pemilikSegar,
                    'Saran Rujukan Kesehatan Baru',
                    "Halo {$pemilik->name},\n"
                    . "Catatan kesehatan Anda menunjukkan indikator ({$daftarIndikator}) di luar batas aman.\n"
                    . "Tujuan faskes: {$namaFaskes}\n\n"
                    . 'Catatan: Rujukan ini saran sistem, bukan diagnosis medis. Silakan konsultasikan dengan tenaga kesehatan.'
                );

                if (isset($rujukanBaru[0])) {
                    $this->telegram->kirimDokumenUser(
                        $pemilikSegar,
                        $this->suratRujukan->namaFile($rujukanBaru[0]),
                        $this->suratRujukan->renderHtml($rujukanBaru[0]),
                        "Salinan Surat Pengantar Rujukan ke {$namaFaskes} (buka di browser lalu pilih Cetak/Simpan PDF)."
                    );
                }
            });
        }
    }

    // Cari ID puskesmas di kelurahan warga atau kecamatan induknya
    public function cariPuskesmasTerdekat(Pengguna $pemilik): ?int
    {
        if (! $pemilik->wilayah_id) {
            return null;
        }

        $puskesmas = Faskes::where('wilayah_id', $pemilik->wilayah_id)
            ->where('jenis', 'puskesmas')
            ->orderBy('id')
            ->value('id');

        if ($puskesmas) {
            return (int) $puskesmas;
        }

        $induk = DB::table('wilayah')->where('id', $pemilik->wilayah_id)->value('parent_id');
        if (! $induk) {
            return null;
        }

        $id = Faskes::where('wilayah_id', $induk)
            ->where('jenis', 'puskesmas')
            ->orderBy('id')
            ->value('id');

        return $id ? (int) $id : null;
    }
}
