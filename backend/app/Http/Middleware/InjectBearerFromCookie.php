<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Menyalin token Sanctum dari cookie HttpOnly bila klien browser tidak mengirim header Authorization.
class InjectBearerFromCookie
{
    public const NAMA_COOKIE = 'sehatkita_token';

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->bearerToken()) {
            $cookieToken = $request->cookie(self::NAMA_COOKIE);
            if (is_string($cookieToken) && $cookieToken !== '') {
                $request->headers->set('Authorization', 'Bearer '.$cookieToken);
            }
        }

        return $next($request);
    }
}
