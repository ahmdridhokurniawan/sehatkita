<?php

namespace App\Http\Controllers;

use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

// Mengurus status sambungan Telegram warga, pemutusan akun, dan pesan masuk dari bot.
class TelegramController extends Controller
{
    private const TTL_TOKEN_MENIT = 30;

    public function __construct(private TelegramService $telegram) {}

    public function status(Request $request)
    {
        $user = $request->user();
        $this->wajibPeran($user, ['user'], 'Fitur integrasi Bot Telegram hanya untuk pengguna warga.');

        $meta = Cache::get("telegram:token_meta:{$user->id}");
        $kedaluwarsa = is_array($meta) && isset($meta['expires_at']) && now()->timestamp > (int) $meta['expires_at'];

        // Putar token pairing baru bila belum ada atau melewati batas 30 menit.
        if (! $user->telegram_connect_token || $kedaluwarsa) {
            $tokenBaru = Str::random(32);
            $user->update(['telegram_connect_token' => $tokenBaru]);
            Cache::put("telegram:token_meta:{$user->id}", [
                'hash' => hash('sha256', $tokenBaru),
                'expires_at' => now()->addMinutes(self::TTL_TOKEN_MENIT)->timestamp,
            ], now()->addDays(7));
        } elseif (! is_array($meta)) {
            Cache::put("telegram:token_meta:{$user->id}", [
                'hash' => hash('sha256', (string) $user->telegram_connect_token),
                'expires_at' => now()->addMinutes(self::TTL_TOKEN_MENIT)->timestamp,
            ], now()->addDays(7));
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

        $tokenBaru = Str::random(32);
        $user->update([
            'telegram_chat_id' => null,
            'telegram_connect_token' => $tokenBaru,
        ]);
        Cache::put("telegram:token_meta:{$user->id}", [
            'hash' => hash('sha256', $tokenBaru),
            'expires_at' => now()->addMinutes(self::TTL_TOKEN_MENIT)->timestamp,
        ], now()->addDays(7));

        return response()->json([
            'success' => true,
            'message' => 'Integrasi Telegram berhasil diputuskan',
            'ok' => true,
            'data' => ['ok' => true],
        ]);
    }

    public function webhook(Request $request)
    {
        // Wajib verifikasi secret header Telegram di semua environment agar webhook palsu selalu ditolak.
        $secret = (string) config('services.telegram.webhook_secret', '');
        $headerToken = (string) $request->header('X-Telegram-Bot-Api-Secret-Token', '');
        abort_unless(
            $secret !== '' && $headerToken !== '' && hash_equals($secret, $headerToken),
            403,
            'Webhook secret tidak valid.'
        );

        $message = $request->input('message');
        if (! $message) {
            return response()->json(['ok' => true]);
        }

        $this->telegram->prosesPesan($message);

        return response()->json(['ok' => true]);
    }
}
