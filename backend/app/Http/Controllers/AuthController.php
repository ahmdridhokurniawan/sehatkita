<?php

namespace App\Http\Controllers;

use App\Http\Middleware\InjectBearerFromCookie;
use App\Models\Pengguna;
use App\Services\SingleIpSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

// Mengurus pendaftaran akun warga, masuk, keluar, pembatasan 1 IP 1 user, dan persetujuan privasi.
class AuthController extends Controller
{
    public function __construct(private SingleIpSessionService $sessions) {}

    public function register(Request $request)
    {
        if ($request->filled('email')) {
            $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'nik' => 'nullable|string|size:16|regex:/^[0-9]+$/|unique:pengguna,nik',
            'email' => 'required|email|unique:pengguna,email',
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->letters()->mixedCase()->numbers()->symbols(),
            ],
            'wilayah_id' => ['required', Rule::exists('wilayah', 'id')->where('tipe', 'kelurahan')],
        ], [
            'password.min' => 'Password minimal 8 karakter.',
            'password.regex' => 'Password harus mengandung minimal 1 huruf kapital, 1 angka, dan 1 simbol.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ]);

        $ip = (string) $request->ip();
        $ttl = $this->sessions->ttlMenit();

        // Kunci per IP mencegah dua permintaan paralel lolos cekKonflikIp sebelum sesi tertulis.
        $hasil = Cache::lock('auth:ip_lock:'.sha1($ip), 10)->block(5, function () use ($ip, $ttl, $validated, $request) {
            if ($this->sessions->cekKonflikIp($ip, 0)) {
                return response()->json([
                    'success' => false,
                    'message' => "Alamat IP ini masih memiliki sesi pengguna aktif. Silakan logout dari akun sebelumnya atau tunggu batas sesi {$ttl} menit berakhir.",
                ], 409);
            }

            $user = Pengguna::create([
                'name' => $validated['name'],
                'nik' => $validated['nik'] ?? null,
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'wilayah_id' => $validated['wilayah_id'],
                'role' => 'user',
            ]);

            $sesi = $this->sessions->daftarkanSesi(
                $user,
                $ip,
                (string) ($request->input('device_name') ?: 'auth-token')
            );

            return ['user' => $user, 'sesi' => $sesi];
        });

        if ($hasil instanceof JsonResponse) {
            return $hasil;
        }

        return response()->json([
            'success' => true,
            'message' => 'Registrasi berhasil',
            'data' => [
                'user' => $hasil['user']->load('profil', 'wilayah'),
                'token' => $hasil['sesi']['token'],
                'token_expires_at' => $hasil['sesi']['expires_at'],
                'token_ttl_menit' => $hasil['sesi']['token_ttl_menit'],
            ],
        ], 201)->withCookie($this->buatCookieToken($hasil['sesi']['token'], $ttl, $request, true));
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim($validated['email']));
        $user = Pengguna::where('email', $email)->first();

        // Tetap jalankan Hash::check pada hash dummy bila user tidak ada agar waktu respons seragam.
        $dummyHash = '$2y$04$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
        $passwordCocok = Hash::check($validated['password'], $user ? $user->password : $dummyHash);

        if (! $user || ! $user->aktif || ! $passwordCocok) {
            throw ValidationException::withMessages(['email' => ['Email atau password salah']]);
        }

        $ip = (string) $request->ip();
        $ttl = $this->sessions->ttlMenit();

        $sesi = Cache::lock('auth:ip_lock:'.sha1($ip), 10)->block(5, function () use ($ip, $user, $request, $ttl) {
            if ($this->sessions->cekKonflikIp($ip, (int) $user->id)) {
                return response()->json([
                    'success' => false,
                    'message' => "Alamat IP ini sedang dipakai akun lain yang masih aktif (maksimal 1 IP 1 pengguna). Silakan logout akun sebelumnya atau tunggu {$ttl} menit.",
                ], 409);
            }

            return $this->sessions->daftarkanSesi(
                $user,
                $ip,
                (string) ($request->input('device_name') ?: 'auth-token')
            );
        });

        if ($sesi instanceof JsonResponse) {
            return $sesi;
        }

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data' => [
                'user' => $user->load('profil', 'wilayah'),
                'token' => $sesi['token'],
                'token_expires_at' => $sesi['expires_at'],
                'token_ttl_menit' => $sesi['token_ttl_menit'],
            ],
        ])->withCookie($this->buatCookieToken($sesi['token'], $ttl, $request, $request->boolean('remember', true)));
    }

    public function logout(Request $request)
    {
        $this->sessions->lepasSesi($request->user(), (string) $request->ip());

        return response()->json(['success' => true, 'message' => 'Logout berhasil', 'data' => null])
            ->withCookie(cookie()->forget(InjectBearerFromCookie::NAMA_COOKIE, '/'));
    }

    private function buatCookieToken(string $token, int $ttlMenit, Request $request, bool $remember = true)
    {
        return cookie(
            InjectBearerFromCookie::NAMA_COOKIE,
            $token,
            $remember ? $ttlMenit : 0,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            'Lax'
        );
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('profil', 'wilayah');

        return response()->json(['success' => true, 'message' => 'OK', 'data' => $user]);
    }

    public function consent(Request $request)
    {
        $validated = $request->validate([
            'versi_kebijakan' => 'required|string',
            'setuju' => 'required|accepted',
        ]);

        $request->user()->update([
            'consent_at' => now(),
            'versi_kebijakan' => $validated['versi_kebijakan'],
        ]);

        return response()->json(['success' => true, 'message' => 'Persetujuan dicatat', 'data' => $request->user()]);
    }

    public function revokeConsent(Request $request)
    {
        $user = $request->user();

        if ($user->consent_at === null) {
            return response()->json(['success' => false, 'message' => 'Tidak ada persetujuan yang tersimpan'], 400);
        }

        $user->update([
            'consent_at' => null,
            'versi_kebijakan' => null,
        ]);

        return response()->json(['success' => true, 'message' => 'Persetujuan berhasil dicabut', 'data' => $user]);
    }
}
