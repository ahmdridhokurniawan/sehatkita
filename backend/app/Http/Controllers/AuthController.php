<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // POST /api/v1/auth/register
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:pengguna,email',
            'password'   => 'required|string|min:8|confirmed',
            'wilayah_id' => 'required|exists:wilayah,id',
        ]);

        $user = Pengguna::create([
            'name'       => $validated['name'],
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

    // POST /api/v1/auth/login (rate‑limit via route middleware)
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = Pengguna::where('email', $validated['email'])->first();

        if ($user && ! $user->aktif) {
            return response()->json(['success' => false, 'message' => 'Akun dinonaktifkan'], 403);
        }

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Email atau password salah']]);
        }

        $user->tokens()->delete();               // hapus token lama
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data'    => ['user' => $user, 'token' => $token],
        ]);
    }

    // POST /api/v1/auth/logout
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();
        return response()->json(['success' => true, 'message' => 'Logout berhasil', 'data' => null]);
    }

    // GET /api/v1/auth/me
    public function me(Request $request)
    {
        $user = $request->user()->load('profil', 'wilayah');
        return response()->json(['success' => true, 'message' => 'OK', 'data' => $user]);
    }

    // POST /api/v1/auth/persetujuan
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
}