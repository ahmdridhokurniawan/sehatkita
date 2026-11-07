<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Controller penghubung akun pengguna dengan Bot Telegram dan penanganan webhook
class TelegramController extends Controller
{
    public function __construct(private TelegramService $telegram) {}

    public function status(Request $request)
    {
        $user = $request->user();
        abort_unless($user->role === 'user', 403, 'Fitur integrasi Bot Telegram hanya untuk pengguna warga.');

        if (! $user->telegram_connect_token) {
            $user->update(['telegram_connect_token' => Str::random(16)]);
        }

        return response()->json([
            'success'       => true,
            'terhubung'     => ! empty($user->telegram_chat_id),
            'chat_id'       => $user->telegram_chat_id,
            'link_telegram' => $this->telegram->linkHubungkan($user->telegram_connect_token),
        ]);
    }

    public function putuskan(Request $request)
    {
        $user = $request->user();
        abort_unless($user->role === 'user', 403, 'Fitur integrasi Bot Telegram hanya untuk pengguna warga.');

        $user->update([
            'telegram_chat_id'       => null,
            'telegram_connect_token' => Str::random(16),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Integrasi Telegram berhasil diputuskan',
        ]);
    }

    public function webhook(Request $request)
    {
        $message = $request->input('message');
        if (! $message) {
            return response()->json(['ok' => true]);
        }

        $chatId = $message['chat']['id'] ?? null;
        $text   = trim($message['text'] ?? '');

        if ($chatId && str_starts_with($text, '/start ')) {
            $token = trim(substr($text, 7));
            $user  = Pengguna::where('telegram_connect_token', $token)->first();

            if ($user) {
                $user->update([
                    'telegram_chat_id'       => (string) $chatId,
                    'telegram_connect_token' => null,
                ]);

                $pesan = "Halo *{$user->name}*!\n\nAkun SehatKita Anda berhasil terhubung dengan Bot Telegram resmi Dinas Kesehatan Kota Banjarbaru.\n\nAnda akan menerima notifikasi pengingat pemeriksaan bulanan dan rujukan kesehatan langsung di sini.";
                $this->telegram->kirimPesan($chatId, $pesan);
            } else {
                $this->telegram->kirimPesan($chatId, "Token penghubung tidak valid atau sudah kedaluwarsa. Silakan ambil tautan baru di web SehatKita.");
            }
        } elseif ($chatId && $text === '/start') {
            $this->telegram->kirimPesan($chatId, "Selamat datang di Bot SehatKita! Silakan hubungkan bot ini melalui menu Profil di aplikasi SehatKita.");
        }

        return response()->json(['ok' => true]);
    }
}
