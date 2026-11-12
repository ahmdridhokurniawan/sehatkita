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

    // Ambil status koneksi Telegram dan buat tautan pairing baru jika belum tersedia
    public function status(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Fitur integrasi Bot Telegram hanya untuk pengguna warga.');

        if (! $user->telegram_connect_token) {
            $user->update(['telegram_connect_token' => Str::random(16)]);
        }

        $link = $this->telegram->linkHubungkan($user->telegram_connect_token);
        $payload = [
            'terhubung'     => ! empty($user->telegram_chat_id),
            'chat_id'       => $user->telegram_chat_id,
            'link_telegram' => $link,
        ];

        return response()->json(array_merge([
            'success' => true,
            'message' => 'Status Telegram',
            'data'    => $payload,
        ], $payload));
    }

    // Putuskan tautan bot Telegram dari akun warga dan buat ulang token koneksi
    public function putuskan(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Fitur integrasi Bot Telegram hanya untuk pengguna warga.');

        $user->update([
            'telegram_chat_id'       => null,
            'telegram_connect_token' => Str::random(16),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Integrasi Telegram berhasil diputuskan',
            'ok'      => true,
            'data'    => ['ok' => true],
        ]);
    }

    // Terima pembaruan pesan masuk dari webhook resmi Telegram
    public function webhook(Request $request)
    {
        $message = $request->input('message');
        if (! $message) {
            return response()->json(['ok' => true]);
        }

        $this->telegram->prosesPesan($message);

        return response()->json(['ok' => true]);
    }
}
