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
    | REGISTER - POST /api/v1/auth/register  (Sec 4.1)
    |--------------------------------------------------------------------------
    */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|email|unique:pengguna,email',
            'password'              => 'required|string|min:8|confirmed',
            'wilayah_id'            => 'required|exists:wilayah,id',
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
            'data'    => [
                'user'  => $user,
                'token' => $token,
            ],
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | LOGIN - POST /api/v1/auth/login  (Sec 4.2)
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
    | LOGOUT - POST /api/v1/auth/logout  (Sec 4.3)
    |--------------------------------------------------------------------------
    */
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil',
            'data'    => null,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | UBAH PASSWORD - PUT /api/v1/auth/password
    |--------------------------------------------------------------------------
    | Field dikirim frontend: password_lama, password_baru, password_baru_konfirmasi
    | Semua role boleh (user, kader, admin_kelurahan, super_admin).
    */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'password_lama'            => 'required|string',
            'password_baru'            => 'required|string|min:8',
            'password_baru_konfirmasi' => 'required|string|same:password_baru',
        ], [
            'password_baru_konfirmasi.same' => 'Konfirmasi password baru tidak sama.',
        ]);

        $user = $request->user();

        // Password lama salah -> 422 (sesuai kontrak: Unprocessable)
        if (! Hash::check($validated['password_lama'], $user->password)) {
            throw ValidationException::withMessages([
                'password_lama' => ['Password lama tidak sesuai.'],
            ]);
        }

        $user->password = Hash::make($validated['password_baru']);
        $user->save();

        // Keamanan: paksa login ulang di semua device setelah ganti password.
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah',
            'data'    => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'updated_at' => $user->updated_at,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ME - GET /api/v1/auth/me  (Sec 4.4)
    |--------------------------------------------------------------------------
    */
    public function me(Request $request)
    {
        $user = $request->user()->load('profil', 'wilayah');

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $user,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PERSETUJUAN - POST /api/v1/auth/persetujuan  (Sec 5.3)
    |--------------------------------------------------------------------------
    */
    public function consent(Request $request)
    {
        $validated = $request->validate([
            'versi_kebijakan' => 'required|string|max:20',
            'setuju'          => 'required|boolean|accepted',
        ]);

        $request->user()->update([
            'consent_at'      => now(),
            'versi_kebijakan' => $validated['versi_kebijakan'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Persetujuan dicatat',
            'data'    => [
                'consent_at'      => $request->user()->consent_at,
                'versi_kebijakan' => $request->user()->versi_kebijakan,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CABUT PERSETUJUAN - DELETE /api/v1/auth/persetujuan  (Sec 5.4)
    |--------------------------------------------------------------------------
    */
    public function revokeConsent(Request $request)
    {
        $request->user()->update([
            'consent_at'      => null,
            'versi_kebijakan' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Persetujuan ditarik',
            'data'    => [
                'consent_at' => null,
            ],
        ]);
    }
}