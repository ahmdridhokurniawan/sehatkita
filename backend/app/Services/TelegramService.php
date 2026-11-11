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
            $res = Http::withoutVerifying()->timeout(10)->post("https://api.telegram.org/bot{$this->token}/sendMessage", [
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

    public function getUpdates(int $offset = 0, int $timeout = 10): array
    {
        if (! $this->token) {
            return [];
        }

        try {
            $query = ['timeout' => $timeout];
            if ($offset > 0) {
                $query['offset'] = $offset;
            }

            $res = Http::withoutVerifying()->timeout($timeout + 5)->get("https://api.telegram.org/bot{$this->token}/getUpdates", $query);

            if ($res->successful() && isset($res->json()['result'])) {
                return $res->json()['result'];
            }
        } catch (\Throwable $e) {
            Log::error('Gagal ambil updates Telegram: ' . $e->getMessage());
        }

        return [];
    }

    public function prosesPesan(array $message): bool
    {
        $chatId = $message['chat']['id'] ?? null;
        $text   = trim($message['text'] ?? '');

        if ($chatId && str_starts_with($text, '/start ')) {
            $token = trim(substr($text, 7));
            $user  = \App\Models\Pengguna::where('telegram_connect_token', $token)->first();

            if ($user) {
                $user->update([
                    'telegram_chat_id'       => (string) $chatId,
                    'telegram_connect_token' => null,
                ]);

                $pesan = "Halo *{$user->name}*!\n\nAkun SehatKita Anda berhasil terhubung dengan Bot Telegram resmi Dinas Kesehatan Kota Banjarbaru.\n\nAnda akan menerima notifikasi pengingat pemeriksaan bulanan dan rujukan kesehatan langsung di sini.";
                $this->kirimPesan($chatId, $pesan);
                return true;
            } else {
                $this->kirimPesan($chatId, "Token penghubung tidak valid atau sudah kedaluwarsa. Silakan ambil tautan baru di web SehatKita.");
                return false;
            }
        } elseif ($chatId && $text === '/start') {
            $this->kirimPesan($chatId, "Selamat datang di Bot SehatKita! Silakan hubungkan bot ini melalui menu Profil di aplikasi SehatKita.");
            return true;
        }

        return false;
    }
}
