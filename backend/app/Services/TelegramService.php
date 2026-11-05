<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// Service integrasi API resmi Bot Telegram untuk pengiriman notifikasi pengingat
class TelegramService
{
    private ?string $token;
    private string $username;

    public function __construct()
    {
        $this->token = config('services.telegram.bot_token');
        $this->username = config('services.telegram.bot_username', 'sehatkita_ptm_bot');
    }

    public function kirimPesan(string|int $chatId, string $pesan, string $parseMode = 'Markdown'): bool
    {
        if (! $this->token) {
            Log::info("Telegram [Mock]: Mengirim ke {$chatId} -> {$pesan}");
            return true;
        }

        try {
            $res = Http::timeout(10)->post("https://api.telegram.org/bot{$this->token}/sendMessage", [
                'chat_id'    => $chatId,
                'text'       => $pesan,
                'parse_mode' => $parseMode,
            ]);
            return $res->successful();
        } catch (\Throwable $e) {
            Log::error('Gagal kirim pesan Telegram: ' . $e->getMessage());
            return false;
        }
    }

    public function linkHubungkan(string $connectToken): string
    {
        return "https://t.me/{$this->username}?start={$connectToken}";
    }
}
