<?php

namespace App\Console\Commands;

use App\Models\CatatanKesehatan;
use App\Models\Pengguna;
use App\Models\SesiPosbindu;
use App\Models\TargetKesehatan;
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Console\Command;

// Mengirim pengingat rutin pemeriksaan kesehatan, jadwal Posbindu, dan target lewat Telegram.
class KirimPengingatSkrining extends Command
{
    protected $signature = 'reminder:skrining-ptm';

    protected $description = 'Kirim notifikasi pengingat skrining PTM, jadwal Posbindu H-1, dan tenggat target via Bot Telegram';

    public function handle(TelegramService $telegram): int
    {
        $batasTanggal = Carbon::now()->subDays(30)->startOfDay();
        $wargaList = Pengguna::where('role', 'user')
            ->where('aktif', true)
            ->whereNotNull('telegram_chat_id')
            ->get();

        $terkirimSkrining = 0;

        $terakhirPerWarga = CatatanKesehatan::whereIn('user_id', $wargaList->pluck('id'))
            ->selectRaw('user_id, MAX(dicatat_pada) as terakhir')
            ->groupBy('user_id')
            ->pluck('terakhir', 'user_id');

        foreach ($wargaList as $warga) {
            $tanggalTerakhir = isset($terakhirPerWarga[$warga->id])
                ? Carbon::parse($terakhirPerWarga[$warga->id])
                : null;

            $perluPengingat = ! $tanggalTerakhir || $tanggalTerakhir->lt($batasTanggal);

            if ($perluPengingat) {
                $selisih = $tanggalTerakhir
                    ? ((int) floor($tanggalTerakhir->diffInDays(now()))).' hari yang lalu'
                    : 'belum pernah periksa';

                $namaAman = $telegram->escapeMarkdown($warga->name);
                $pesan = "Halo *{$namaAman}*!\n\n"
                    ."Pemeriksaan kesehatan terakhir Anda: _{$selisih}_.\n\n"
                    ."Apakah Anda sudah cek tensi dan gula darah bulan ini?\n"
                    ."Yuk luangkan waktu mengunjungi sesi Posbindu terdekat di kelurahan Anda untuk menjaga tubuh tetap sehat dan bugar!\n\n"
                    ."Salam Sehat,\n*Dinas Kesehatan Kota Banjarbaru*";

                if ($telegram->kirimPesan($warga->telegram_chat_id, $pesan)) {
                    $terkirimSkrining++;
                }
            }
        }

        $terkirimPosbindu = 0;
        $besok = Carbon::tomorrow()->toDateString();
        $sesiBesok = SesiPosbindu::where('status', 'akan_datang')
            ->whereDate('tanggal', $besok)
            ->get();

        foreach ($sesiBesok as $sesi) {
            $tanggalLabel = $sesi->tanggal?->format('d-m-Y') ?? $besok;
            $terkirimPosbindu += $telegram->siarkanKeWilayah(
                (int) $sesi->wilayah_id,
                'Pengingat Posbindu Besok',
                "Jangan lupa besok ({$tanggalLabel}) ada kegiatan Posbindu di kelurahan Anda.\n"
                ."Lokasi: {$sesi->lokasi}\n\n"
                .'Luangkan waktu sebentar untuk cek kesehatan rutin!'
            );
        }

        $terkirimTarget = 0;
        $hariIni = Carbon::today()->toDateString();
        $targetHariIni = TargetKesehatan::with('pengguna')
            ->where('tercapai', false)
            ->whereDate('tenggat_waktu', $hariIni)
            ->whereHas('pengguna', fn ($q) => $q->where('role', 'user')
                ->where('aktif', true)
                ->whereNotNull('telegram_chat_id'))
            ->get();

        foreach ($targetHariIni as $target) {
            $dikirim = $telegram->kirimNotifikasiUser(
                $target->pengguna,
                'Pengingat Target Kesehatan Hari Ini',
                "Halo {$target->pengguna->name},\n"
                ."Hari ini adalah batas waktu target kesehatan Anda: \"{$target->judul}\" "
                ."(Target: {$target->nilai_target} {$target->satuan}).\n\n"
                .'Yuk cek progres dan tandai target Anda di aplikasi SehatKita!'
            );

            if ($dikirim) {
                $terkirimTarget++;
            }
        }

        $this->info(
            "Pengingat dikirim — Skrining: {$terkirimSkrining}, Posbindu H-1: {$terkirimPosbindu}, Target hari ini: {$terkirimTarget}."
        );

        return Command::SUCCESS;
    }
}
