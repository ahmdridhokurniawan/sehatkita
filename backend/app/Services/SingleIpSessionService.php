<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;

// Mengelola masa aktif token Bearer 30 menit dan batasan 1 alamat IP untuk 1 pengguna aktif.
class SingleIpSessionService
{
    public function ttlMenit(): int
    {
        return max(1, (int) config('sanctum.expiration', 30));
    }

    public function cacheKey(string $ip): string
    {
        return 'auth:ip_session:'.sha1($ip);
    }

    public function cekKonflikIp(string $ip, int $userId): bool
    {
        if ($ip === '') {
            return false;
        }

        $ttl = $this->ttlMenit();
        $batas = now()->subMinutes($ttl);

        // Bersihkan token kedaluwarsa di IP ini terlebih dahulu.
        PersonalAccessToken::query()
            ->where('ip_address', $ip)
            ->where(function ($q) use ($batas) {
                $q->where('expires_at', '<=', now())
                    ->orWhere(function ($sub) use ($batas) {
                        $sub->whereNull('expires_at')->where('created_at', '<=', $batas);
                    });
            })
            ->delete();

        $tokenAktifLain = PersonalAccessToken::query()
            ->where('ip_address', $ip)
            ->where('tokenable_type', Pengguna::class)
            ->where('tokenable_id', '!=', $userId)
            ->where(function ($q) use ($batas) {
                $q->where('expires_at', '>', now())
                    ->orWhere(function ($sub) use ($batas) {
                        $sub->whereNull('expires_at')->where('created_at', '>', $batas);
                    });
            })
            ->exists();

        if ($tokenAktifLain) {
            return true;
        }

        $cached = Cache::get($this->cacheKey($ip));
        if (is_array($cached) && isset($cached['user_id'], $cached['token_id']) && (int) $cached['user_id'] !== $userId) {
            $masihAda = PersonalAccessToken::query()
                ->whereKey((int) $cached['token_id'])
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->exists();

            if ($masihAda) {
                return true;
            }

            Cache::forget($this->cacheKey($ip));
        }

        return false;
    }

    public function daftarkanSesi(Pengguna $user, string $ip, string $deviceName = 'auth-token'): array
    {
        $ttl = $this->ttlMenit();
        $expiresAt = now()->addMinutes($ttl);

        $this->lepasSesi($user, $ip);

        $newToken = $user->createToken($deviceName, ['*'], $expiresAt);
        $newToken->accessToken->forceFill([
            'ip_address' => $ip !== '' ? $ip : null,
            'expires_at' => $expiresAt,
        ])->save();

        if ($ip !== '') {
            Cache::put($this->cacheKey($ip), [
                'user_id' => $user->id,
                'token_id' => $newToken->accessToken->id,
                'expires_at' => $expiresAt->toIso8601String(),
            ], $expiresAt);
        }

        return [
            'token' => $newToken->plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
            'token_ttl_menit' => $ttl,
        ];
    }

    public function lepasSesi(Pengguna $user, ?string $ip = null): void
    {
        $ips = $user->tokens()
            ->whereNotNull('ip_address')
            ->pluck('ip_address')
            ->all();

        if ($ip !== null && $ip !== '') {
            $ips[] = $ip;
        }

        foreach (array_unique($ips) as $itemIp) {
            Cache::forget($this->cacheKey((string) $itemIp));
        }

        $user->tokens()->delete();
    }
}
