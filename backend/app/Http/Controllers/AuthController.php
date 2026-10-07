<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | REGISTER — POST /api/register
    | Payload: { name, email, password, wilayah_id }
    |--------------------------------------------------------------------------
    */
    public function register(Request $request)
    {
        // 1. Validasi input dari frontend
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:pengguna,email',
            'password'   => 'required|string|min:8',
            'wilayah_id' => 'required|exists:wilayah,id',
        ]);

        // 2. Simpan user baru (role default 'user')
        $user = Pengguna::create([
            'name'       => $validated['name'],
            'email'      => $validated['email'],
            'password'   => Hash::make($validated['password']),
            'wilayah_id' => $validated['wilayah_id'],
            'role'       => 'user',
        ]);

        // 3. Buat token Sanctum
        $token = $user->createToken('auth-token')->plainTextToken;

        // 4. Balas sesuai kontrak (envelope)
        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran berhasil',
            'data'    => [
                'user'  => $user,
                'token' => $token,
            ],
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | LOGIN — POST /api/login
    | Payload: { email, password }
    |--------------------------------------------------------------------------
    */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = Pengguna::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        // Token lama dicabut supaya 1 akun = 1 sesi aktif
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data'    => [
                'user'  => $user,
                'token' => $token,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | LOGOUT — POST /api/logout  (butuh token)
    |--------------------------------------------------------------------------
    */
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PERSETUJUAN — POST /api/persetujuan  (butuh token)
    | Payload: { versi_kebijakan: "1.0", setuju: true }
    | Fungsi: mencatat consent (menulis pengguna.consent_at)
    |--------------------------------------------------------------------------
    */
    public function consent(Request $request)
    {
        // 1. Validasi: setuju harus benar-benar true
        $validated = $request->validate([
            'versi_kebijakan' => 'required|string|max:20',
            'setuju'          => 'required|boolean|accepted',
        ]);

        // 2. Update kolom consent di tabel pengguna
        $request->user()->update([
            'consent_at'      => now(),
            'versi_kebijakan' => $validated['versi_kebijakan'],
        ]);

        // 3. Balas sesuai kontrak
        return response()->json([
            'success' => true,
            'message' => 'Persetujuan berhasil dicatat',
            'data'    => [
                'consent_at'      => $request->user()->consent_at,
                'versi_kebijakan' => $request->user()->versi_kebijakan,
            ],
        ]);
    }
}