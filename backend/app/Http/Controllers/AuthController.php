<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use App\Services\SingleIpSessionService;
use Illuminate\Http\Request;
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
        if ($this->sessions->cekKonflikIp($ip, 0)) {
            return response()->json([
                'success' => false,
                'message' => 'Alamat IP ini masih memiliki sesi pengguna aktif. Silakan logout dari akun sebelumnya atau tunggu batas sesi 30 menit berakhir.',
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

        return response()->json([
            'success' => true,
            'message' => 'Registrasi berhasil',
            'data' => [
                'user' => $user->load('profil', 'wilayah'),
                'token' => $sesi['token'],
                'expires_at' => $sesi['expires_at'],
                'token_ttl_menit' => $sesi['token_ttl_menit'],
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim($validated['email']));
        $user = Pengguna::where('email', $email)->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Email atau password salah']]);
        }

        if (! $user->aktif) {
            return response()->json(['success' => false, 'message' => 'Akun dinonaktifkan'], 403);
        }

        $ip = (string) $request->ip();
        if ($this->sessions->cekKonflikIp($ip, (int) $user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'Alamat IP ini sedang dipakai akun lain yang masih aktif (maksimal 1 IP 1 pengguna). Silakan logout akun sebelumnya atau tunggu 30 menit.',
            ], 409);
        }

        $sesi = $this->sessions->daftarkanSesi(
            $user,
            $ip,
            (string) ($request->input('device_name') ?: 'auth-token')
        );

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data' => [
                'user' => $user->load('profil', 'wilayah'),
                'token' => $sesi['token'],
                'expires_at' => $sesi['expires_at'],
                'token_ttl_menit' => $sesi['token_ttl_menit'],
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $this->sessions->lepasSesi($request->user(), (string) $request->ip());

        return response()->json(['success' => true, 'message' => 'Logout berhasil', 'data' => null]);
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
