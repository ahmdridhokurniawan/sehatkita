<?php

namespace App\Console\Commands;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Console\Command;

// Command cron untuk mengirimkan pefngingat pemeriksaan Posbindu bulanan via Telegram
class KirimPengingatSkrining extends Command
{
    protected $signature = 'reminder:skrining-ptm';
    protected $description = 'Kirim notifikasi pengingat skrining berkala PTM via Bot Telegram';

    // Kirim pengingat pemeriksaan bulanan ke warga yang belum memeriksa lebih dari 30 hari
    public function handle(TelegramService $telegram): int
    {
        $batasTanggal = Carbon::now()->subDays(30)->startOfDay();
        $wargaList = Pengguna::where('role', 'user')
            ->where('aktif', true)
            ->whereNotNull('telegram_chat_id')
            ->get();

        $terkirim = 0;
        foreach ($wargaList as $warga) {
            $catatanTerakhir = CatatanKesehatan::where('user_id', $warga->id)
                ->orderByDesc('dicatat_pada')
                ->orderByDesc('id')
                ->first();

            // Bandingkan instance Carbon langsung agar terhindar dari perbedaan tipe tanggal
            $perluPengingat = ! $catatanTerakhir || $catatanTerakhir->dicatat_pada->lt($batasTanggal);

            if ($perluPengingat) {
                $selisih = $catatanTerakhir
                    ? $catatanTerakhir->dicatat_pada->diffInDays(now()) . ' hari yang lalu'
                    : 'belum pernah periksa';

                $namaAman = $telegram->escapeMarkdown($warga->name);
                $pesan = "Halo *{$namaAman}*!\n\n"
                    . "Pemeriksaan kesehatan terakhir Anda: _{$selisih}_.\n\n"
                    . "Apakah Anda sudah cek tensi dan gula darah bulan ini?\n"
                    . "Yuk luangkan waktu mengunjungi sesi Posbindu terdekat di kelurahan Anda untuk menjaga tubuh tetap sehat dan bugar!\n\n"
                    . "Salam Sehat,\n*Dinas Kesehatan Kota Banjarbaru*";

                if ($telegram->kirimPesan($warga->telegram_chat_id, $pesan)) {
                    $terkirim++;
                }
            }
        }

        $this->info("Pengingat skrining PTM berhasil dikirim ke {$terkirim} warga.");
        return Command::SUCCESS;
    }
}
