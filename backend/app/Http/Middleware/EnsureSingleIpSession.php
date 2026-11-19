<?php

namespace App\Http\Middleware;

use App\Services\SingleIpSessionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

// Memastikan token Bearer tidak melewati batas 30 menit dan hanya dipakai dari IP tempat login.
class EnsureSingleIpSession
{
    public function __construct(private SingleIpSessionService $sessions) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        $token = $user->currentAccessToken();
        if (! $token instanceof PersonalAccessToken || ! $token->exists) {
            return $next($request);
        }

        $ttl = $this->sessions->ttlMenit();
        $expiresAt = $token->expires_at;
        $createdAt = $token->created_at;
        $expiredByExpiresAt = $expiresAt instanceof \Carbon\CarbonInterface && $expiresAt->isPast();
        $expiredByAge = ! ($expiresAt instanceof \Carbon\CarbonInterface)
            && $createdAt instanceof \Carbon\CarbonInterface
            && $createdAt->copy()->addMinutes($ttl)->isPast();

        if ($expiredByExpiresAt || $expiredByAge) {
            if (is_string($token->ip_address) && $token->ip_address !== '') {
                Cache::forget($this->sessions->cacheKey($token->ip_address));
            }
            $token->delete();

            return response()->json([
                'success' => false,
                'message' => 'Sesi token telah berakhir (batas 30 menit). Silakan masuk kembali.',
            ], 401);
        }

        if (is_string($token->ip_address) && $token->ip_address !== '' && $token->ip_address !== $request->ip()) {
            return response()->json([
                'success' => false,
                'message' => 'Token hanya berlaku pada perangkat/IP saat login.',
            ], 401);
        }

        return $next($request);
    }
}
