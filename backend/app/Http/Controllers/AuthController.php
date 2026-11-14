<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Daftarkan akun warga baru dengan validasi kata sandi kuat
    public function register(Request $request)
    {
        // Samakan format email ke huruf kecil agar tidak memicu duplikat huruf besar
        if ($request->filled('email')) {
            $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        }

        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'nik'        => 'nullable|string|size:16|regex:/^[0-9]+$/|unique:pengguna,nik',
            'email'      => 'required|email|unique:pengguna,email',
            'password'   => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->letters()->mixedCase()->numbers()->symbols(),
            ],
            'wilayah_id' => ['required', Rule::exists('wilayah', 'id')->where('tipe', 'kelurahan')],
        ], [
            'password.min'       => 'Password minimal 8 karakter.',
            'password.regex'     => 'Password harus mengandung minimal 1 huruf kapital, 1 angka, dan 1 simbol.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ]);

        $user = Pengguna::create([
            'name'       => $validated['name'],
            'nik'        => $validated['nik'] ?? null,
            'email'      => $validated['email'],
            'password'   => Hash::make($validated['password']),
            'wilayah_id' => $validated['wilayah_id'],
            'role'       => 'user',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registrasi berhasil',
            'data'    => ['user' => $user, 'token' => $token],
        ], 201);
    }

    // Autentikasi pengguna dan terbitkan token akses baru
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim($validated['email']));
        $user  = Pengguna::where('email', $email)->first();

        // Verifikasi kata sandi lebih dulu agar tidak membocorkan status aktif akun ke penelepon tak dikenal
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Email atau password salah']]);
        }

        if (! $user->aktif) {
            return response()->json(['success' => false, 'message' => 'Akun dinonaktifkan'], 403);
        }

        // Hapus token lama agar hanya sesi login terbaru yang aktif
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data'    => ['user' => $user, 'token' => $token],
        ]);
    }

    // Cabut seluruh token akses milik pengguna saat keluar
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();
        return response()->json(['success' => true, 'message' => 'Logout berhasil', 'data' => null]);
    }

    // Ambil data profil dan wilayah pengguna yang sedang login
    public function me(Request $request)
    {
        $user = $request->user()->load('profil', 'wilayah');
        return response()->json(['success' => true, 'message' => 'OK', 'data' => $user]);
    }

    // Catat waktu persetujuan kebijakan privasi oleh pengguna
    public function consent(Request $request)
    {
        $validated = $request->validate([
            'versi_kebijakan' => 'required|string',
            'setuju'          => 'required|accepted',
        ]);

        $request->user()->update([
            'consent_at'      => now(),
            'versi_kebijakan' => $validated['versi_kebijakan'],
        ]);

        return response()->json(['success' => true, 'message' => 'Persetujuan dicatat', 'data' => $request->user()]);
    }

    // Hapus data persetujuan privasi yang tersimpan
    public function revokeConsent(Request $request)
    {
        $user = $request->user();

        if ($user->consent_at === null) {
            return response()->json(['success' => false, 'message' => 'Tidak ada persetujuan yang tersimpan'], 400);
        }

        $user->update([
            'consent_at'      => null,
            'versi_kebijakan' => null,
        ]);

        return response()->json(['success' => true, 'message' => 'Persetujuan berhasil dicabut', 'data' => $user]);
    }
}