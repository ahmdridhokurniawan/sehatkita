<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class TelegramPollCommand extends Command
{
    protected $signature = 'telegram:poll {--once : Hanya periksa pembaruan satu kali lalu keluar}';
    protected $description = 'Jalankan long polling Bot Telegram untuk menerima perintah /start warga di lingkungan lokal';

    public function handle(TelegramService $telegram): int
    {
        $lock = Cache::lock('telegram_bot_poller_lock', 30);
        if (! $lock->get()) {
            $this->warn('Telegram bot poller sudah berjalan di proses lain. Mencegah duplikasi proses.');
            return 0;
        }

        $botUsername = config('services.telegram.bot_username', 'sehatkita_ptm_bot');
        $this->info("Memulai Telegram Bot Poller (@{$botUsername})...");
        $this->info('Tekan Ctrl+C untuk berhenti.');

        $offset = 0;
        $once   = $this->option('once');

        try {
            do {
                $lock->refresh();
                $updates = $telegram->getUpdates($offset, 2);

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

                usleep(100000); // 0.1 detik (super cepat)
            } while (true);
        } finally {
            $lock->release();
        }

        return 0;
    }
}
