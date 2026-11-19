<?php

namespace App\Http\Controllers;

use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Mengurus status sambungan Telegram warga, pemutusan akun, dan pesan masuk dari bot.
class TelegramController extends Controller
{
    public function __construct(private TelegramService $telegram) {}

    public function status(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Fitur integrasi Bot Telegram hanya untuk pengguna warga.');

        if (! $user->telegram_connect_token) {
            $user->update(['telegram_connect_token' => Str::random(16)]);
        }

        $link = $this->telegram->linkHubungkan($user->telegram_connect_token);
        $payload = [
            'terhubung' => ! empty($user->telegram_chat_id),
            'chat_id' => $user->telegram_chat_id,
            'link_telegram' => $link,
        ];

        return response()->json(array_merge([
            'success' => true,
            'message' => 'Status Telegram',
            'data' => $payload,
        ], $payload));
    }

    public function putuskan(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Fitur integrasi Bot Telegram hanya untuk pengguna warga.');

        $user->update([
            'telegram_chat_id' => null,
            'telegram_connect_token' => Str::random(16),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Integrasi Telegram berhasil diputuskan',
            'ok' => true,
            'data' => ['ok' => true],
        ]);
    }

    public function webhook(Request $request)
    {
        $secret = (string) config('services.telegram.webhook_secret', '');

        if ($secret !== '' || app()->isProduction()) {
            $headerToken = (string) $request->header('X-Telegram-Bot-Api-Secret-Token', '');
            abort_unless(
                $secret !== '' && $headerToken !== '' && hash_equals($secret, $headerToken),
                403,
                'Webhook secret tidak valid.'
            );
        }

        $message = $request->input('message');
        if (! $message) {
            return response()->json(['ok' => true]);
        }

        $this->telegram->prosesPesan($message);

        return response()->json(['ok' => true]);
    }
}
