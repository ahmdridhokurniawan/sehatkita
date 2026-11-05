<?php

namespace App\Console\Commands;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Console\Command;

// Command cron untuk mengirimkan pengingat pemeriksaan Posbindu bulanan via Telegram
class KirimPengingatSkrining extends Command
{
    protected $signature = 'reminder:skrining-ptm';
    protected $description = 'Kirim notifikasi pengingat skrining berkala PTM via Bot Telegram';

    public function handle(TelegramService $telegram): int
    {
        $batasHari = Carbon::now()->subDays(30)->toDateString();
        $wargaList = Pengguna::where('role', 'user')
            ->where('aktif', true)
            ->whereNotNull('telegram_chat_id')
            ->get();

        $terkirim = 0;
        foreach ($wargaList as $warga) {
            $catatanTerakhir = CatatanKesehatan::where('user_id', $warga->id)
                ->orderByDesc('dicatat_pada')
                ->first();

            $perluPengingat = ! $catatanTerakhir || $catatanTerakhir->dicatat_pada < $batasHari;

            if ($perluPengingat) {
                $selisih = $catatanTerakhir
                    ? Carbon::parse($catatanTerakhir->dicatat_pada)->diffInDays(now()) . ' hari yang lalu'
                    : 'belum pernah periksa';

                $pesan = "Halo *{$warga->name}*!\n\n"
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
