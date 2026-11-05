<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * CORS adalah penyebab paling sering "Failed to fetch" di frontend:
 * browser memblokir respons tanpa pesan yang berguna bila origin frontend
 * tidak diizinkan. Tes ini menjaga agar:
 *  - port dev berapa pun di localhost tetap boleh (npm run dev/next start),
 *  - hostname *.test (Laradock) tetap boleh,
 *  - origin asing TIDAK boleh.
 */
class CorsTest extends TestCase
{
    private function preflight(string $origin): array
    {
        $this->app['config']->set('cors.allowed_origins_patterns', [
            '#^http://(localhost|127\.0\.0\.1)(:\d+)?$#',
            '#^https?://([a-z0-9-]+\.)*test$#',
        ]);
        $this->app['config']->set('cors.allowed_origins', ['http://sehatkita.test']);

        $res = $this->withHeaders([
            'Origin' => $origin,
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type,authorization',
        ])->options('/api/v1/auth/login');

        return [$res->getStatusCode(), $res->headers->get('Access-Control-Allow-Origin')];
    }

    public function test_port_dev_localhost_diizinkan(): void
    {
        foreach (['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:5174'] as $origin) {
            [$status, $allow] = $this->preflight($origin);
            $this->assertSame(204, $status, "preflight gagal untuk {$origin}");
            $this->assertSame($origin, $allow, "origin {$origin} tidak diizinkan");
        }
    }

    public function test_hostname_test_diizinkan(): void
    {
        [$status, $allow] = $this->preflight('http://sehatkita.test');
        $this->assertSame(204, $status);
        $this->assertSame('http://sehatkita.test', $allow);
    }

    public function test_origin_asing_ditolak(): void
    {
        [, $allow] = $this->preflight('http://evil.example.com');
        $this->assertNull($allow, 'origin asing tidak boleh mendapat header Allow-Origin');
    }
}
