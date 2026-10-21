<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',      // <-- TAMBAHAN: daftarkan routes/api.php
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Request API / yang minta JSON selalu dibalas JSON.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Semua error dibungkus jadi envelope kontrak 1.4:
        //   { "success": false, "message": "...", "errors": {...} (khusus 422) }
        // Tanpa ini, error dari abort() / 404 / 500 dibalas bentuk bawaan Laravel
        // ({"message": "..."} + stack trace) yang tidak sesuai kontrak.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null; // halaman web biasa: biarkan tampil normal
            }

            $status = match (true) {
                $e instanceof ValidationException          => 422,
                $e instanceof AuthenticationException      => 401,
                $e instanceof AuthorizationException,
                $e instanceof AccessDeniedHttpException    => 403,
                $e instanceof ModelNotFoundException,
                $e instanceof NotFoundHttpException        => 404,
                $e instanceof HttpExceptionInterface       => $e->getStatusCode(),
                default                                    => 500,
            };

            $pesan = match ($status) {
                401     => 'Belum login atau token tidak valid.',
                403     => $e->getMessage() !== '' ? $e->getMessage() : 'Tidak punya akses.',
                404     => 'Data tidak ditemukan.',
                429     => 'Terlalu banyak permintaan, coba lagi nanti.',
                422     => 'Validasi gagal',
                default => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan pada server.',
            };

            $body = ['success' => false, 'message' => $pesan];

            // `errors` hanya pada 422 (kontrak 1.4).
            if ($e instanceof ValidationException) {
                $body['errors'] = $e->errors();
            }

            // Saat debug, tambahkan jejak singkat supaya mudah dilacak.
            if (config('app.debug') && $status >= 500) {
                $body['debug'] = [
                    'exception' => $e::class,
                    'file'      => $e->getFile(),
                    'line'      => $e->getLine(),
                ];
            }

            return response()->json($body, $status);
        });
    })->create();