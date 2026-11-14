<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Support\Facades\DB;
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

    public function escapeMarkdown(string $teks): string
    {
        return str_replace(['\\', '_', '*', '`', '['], ['\\\\', '\\_', '\\*', '\\`', '\\['], $teks);
    }

    /** Kirim notifikasi terformat ke warga yang menautkan Telegram tanpa menggagalkan alur utama. */
    public function kirimNotifikasiUser(?Pengguna $user, string $judul, string $isi): bool
    {
        if (! $user || ! $user->aktif || empty($user->telegram_chat_id)) {
            return false;
        }

        $teks = '*' . $this->escapeMarkdown($judul) . "*\n\n"
            . $this->escapeMarkdown($isi)
            . "\n\n_SehatKita — Dinas Kesehatan Kota Banjarbaru_";

        return $this->kirimPesan($user->telegram_chat_id, $teks);
    }

    /** Siarkan notifikasi Telegram ke seluruh warga aktif di wilayah tertentu (atau se-kota bila null). */
    public function siarkanKeWilayah(?int $wilayahId, string $judul, string $isi): int
    {
        $terkirim = 0;

        $query = Pengguna::where('role', 'user')
            ->where('aktif', true)
            ->whereNotNull('telegram_chat_id');

        if ($wilayahId !== null) {
            $query->where('wilayah_id', $wilayahId);
        }

        $query->chunkById(100, function ($daftar) use ($judul, $isi, &$terkirim) {
            foreach ($daftar as $warga) {
                if ($this->kirimNotifikasiUser($warga, $judul, $isi)) {
                    $terkirim++;
                }
            }
        });

        return $terkirim;
    }

    /** Kirim dokumen lampiran ke chat Telegram (non-blocking terhadap alur utama). */
    public function kirimDokumen(string|int $chatId, string $namaFile, string $konten, string $caption = ''): bool
    {
        if (! $this->token) {
            Log::info("Telegram [Mock Document]: Mengirim {$namaFile} ke {$chatId}");
            return true;
        }

        try {
            $payload = ['chat_id' => $chatId];
            if ($caption !== '') {
                $payload['caption'] = $caption;
            }

            $res = Http::timeout(15)
                ->attach('document', $konten, $namaFile)
                ->post("https://api.telegram.org/bot{$this->token}/sendDocument", $payload);

            return $res->successful();
        } catch (\Throwable $e) {
            Log::error('Gagal kirim dokumen Telegram: ' . $e->getMessage());
            return false;
        }
    }

    /** Kirim dokumen lampiran ke warga aktif yang telah menautkan Telegram. */
    public function kirimDokumenUser(?Pengguna $user, string $namaFile, string $konten, string $caption = ''): bool
    {
        if (! $user || ! $user->aktif || empty($user->telegram_chat_id)) {
            return false;
        }

        return $this->kirimDokumen($user->telegram_chat_id, $namaFile, $konten, $caption);
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

            $res = Http::timeout($timeout + 5)->get("https://api.telegram.org/bot{$this->token}/getUpdates", $query);

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

        if (! $chatId) {
            return false;
        }

        // Dukung format /start <token> maupun /start@bot <token> agar pergantian akun selalu terbaca
        if (preg_match('/^\/start(?:@[A-Za-z0-9_]+)?\s+(\S+)$/i', $text, $match)) {
            $token = trim($match[1]);
            $user  = Pengguna::where('telegram_connect_token', $token)->first();

            if ($user) {
                DB::transaction(function () use ($user, $chatId) {
                    // Lepas chat_id dari akun lain bila sebelumnya pernah terhubung di perangkat Telegram yang sama
                    Pengguna::where('telegram_chat_id', (string) $chatId)
                        ->where('id', '!=', $user->id)
                        ->update(['telegram_chat_id' => null]);

                    $user->update([
                        'telegram_chat_id'       => (string) $chatId,
                        'telegram_connect_token' => null,
                    ]);
                });

                $namaAman = $this->escapeMarkdown($user->name);
                $pesan = "Halo *{$namaAman}*!\n\nAkun SehatKita Anda berhasil terhubung dengan Bot Telegram resmi Dinas Kesehatan Kota Banjarbaru.\n\nAnda akan menerima notifikasi pengingat pemeriksaan bulanan dan rujukan kesehatan langsung di sini.";
                $this->kirimPesan($chatId, $pesan);
                return true;
            }

            $this->kirimPesan($chatId, "Token penghubung tidak valid atau sudah dipakai/kedaluwarsa. Silakan muat ulang menu Profil di web SehatKita untuk mengambil tautan baru.");
            return false;
        }

        // Izinkan warga memutus koneksi akun lama langsung dari chat bot Telegram sebelum menautkan akun lain
        if (preg_match('/^\/putus(?:@[A-Za-z0-9_]+)?$/i', $text)) {
            $diputus = Pengguna::where('telegram_chat_id', (string) $chatId)
                ->update(['telegram_chat_id' => null]);

            $pesan = $diputus > 0
                ? "Tautan akun SehatKita pada Telegram ini berhasil diputuskan.\n\nJika ingin menghubungkan akun lain, klik *Hubungkan Telegram* dari menu Profil akun tersebut."
                : "Telegram ini belum terhubung ke akun SehatKita mana pun.";
            $this->kirimPesan($chatId, $pesan);
            return true;
        }

        // Cek apakah akun warga dengan chat_id ini sudah terhubung
        $userTerkoneksi = Pengguna::where('telegram_chat_id', (string) $chatId)->first();

        if ($userTerkoneksi) {
            $namaAman = $this->escapeMarkdown($userTerkoneksi->name);
            $pesan = "Halo *{$namaAman}*!\n\nTelegram ini sedang terhubung ke akun *{$namaAman}*.\n\nJika Anda ingin berpindah ke akun SehatKita lain, kirim perintah `/putus` terlebih dahulu atau kirim tautan baru dengan menyertakan kode `/start <kode>` dari menu Profil.";
            $this->kirimPesan($chatId, $pesan);
            return true;
        }

        if (preg_match('/^\/start(?:@[A-Za-z0-9_]+)?$/i', $text)) {
            $this->kirimPesan($chatId, "Selamat datang di Bot SehatKita! Silakan hubungkan bot ini melalui menu Profil di aplikasi SehatKita.");
            return true;
        }

        return false;
    }
}
