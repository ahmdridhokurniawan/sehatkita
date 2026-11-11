<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;

class TelegramPollCommand extends Command
{
    protected $signature = 'telegram:poll {--once : Hanya periksa pembaruan satu kali lalu keluar}';
    protected $description = 'Jalankan long polling Bot Telegram untuk menerima perintah /start warga di lingkungan lokal';

    public function handle(TelegramService $telegram): int
    {
        $this->info('Memulai Telegram Bot Poller (@sehatkita_banjarbaru_bot)...');
        $this->info('Tekan Ctrl+C untuk berhenti.');

        $offset = 0;
        $once   = $this->option('once');

        do {
            $updates = $telegram->getUpdates($offset, 5);

            foreach ($updates as $update) {
                $offset = $update['update_id'] + 1;

                if (isset($update['message'])) {
                    $text = $update['message']['text'] ?? '';
                    $from = $update['message']['from']['first_name'] ?? 'Warga';
                    $this->line("Menerima pesan dari {$from}: {$text}");

                    $sukses = $telegram->prosesPesan($update['message']);
                    if ($sukses) {
                        $this->info("-> Berhasil diproses dan dibalas!");
                    }
                }
            }

            if ($once) {
                break;
            }

            usleep(500000); // 0.5 detik
        } while (true);

        return 0;
    }
}
