<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter; // <-- Digunakan untuk batasi percobaan login (kontrak 4.2)
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | REGISTER - POST /api/v1/auth/register
    |--------------------------------------------------------------------------
    */
    public function register(Request $request)
    {
        // 1. Validasi input dari user
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:pengguna,email',
            'password'   => 'required|string|min:8|confirmed',
            'wilayah_id' => 'required|exists:wilayah,id',
        ]);

        // 2. Simpan user baru ke database (password di-hash otomatis lewat model)
        $user = Pengguna::create([
            'name'       => $validated['name'],
            'email'      => $validated['email'],
            'password'   => Hash::make($validated['password']),
            'wilayah_id' => $validated['wilayah_id'],
            'role'       => 'user',
        ]);

        // 3. Buat token Sanctum untuk autentikasi langsung setelah register
        $token = $user->createToken('auth-token')->plainTextToken;

        // 4. Return response sukses sesuai standar kontrak
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
    | LOGIN - POST /api/v1/auth/login
    |--------------------------------------------------------------------------
    */
    public function login(Request $request)
    {
        // === BELAJAR: Rate Limiting (Mencegah Brute Force / Serangan Tebak Password) ===
        // Buat kunci unik berdasarkan IP address pengirim request
        $key = 'login-attempts:' . $request->ip();

        // Cek apakah IP ini sudah gagal login lebih dari 5 kali
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key); // Hitung sisa detik hukuman
            return response()->json([
                'success' => false,
                'message' => "Terlalu banyak percobaan login. Silakan coba lagi dalam {$seconds} detik.",
            ], 429); // 429 = Too Many Requests (Kontrak 4.2)
        }

        // Validasi format email & password
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = Pengguna::where('email', $validated['email'])->first();

        // Cek apakah akun dinonaktifkan admin
        if ($user && ! $user->aktif) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda dinonaktifkan. Hubungi admin.',
            ], 403);
        }

        // Jika user tidak ditemukan ATAU password salah
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            
            // Catat kegagalan ini ke RateLimiter (tahan IP selama 60 detik)
            RateLimiter::hit($key, 60); 

            // Lempar error validasi (otomatis dibalas status 422 oleh Laravel)
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        // Jika login BERHASIL, hapus catatan gagal dari RateLimiter
        RateLimiter::clear($key);

        // Hapus token lama supaya 1 user hanya aktif di 1 device (one-session-per-user)
        $user->tokens()->delete();
        
        // Buat token baru
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
    | LOGOUT - POST /api/v1/auth/logout
    |--------------------------------------------------------------------------
    */
    public function logout(Request $request)
    {
        // Hapus token aktif milik user yang sedang login saat ini
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
    */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'password_lama'            => 'required|string',
            'password_baru'            => 'required|string|min:8',
            'password_baru_konfirmasi' => 'required|string|same:password_baru',
        ]);

        $user = $request->user();

        // Pastikan password lama yang diketik user benar
        if (! Hash::check($validated['password_lama'], $user->password)) {
            throw ValidationException::withMessages([
                'password_lama' => ['Password lama tidak sesuai.'],
            ]);
        }

        // Update password baru (di-hash otomatis)
        $user->password = Hash::make($validated['password_baru']);
        $user->save();

        // Keamanan: Hapus semua token agar user harus login ulang dengan password baru
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah',
            'data'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ME - GET /api/v1/auth/me
    |--------------------------------------------------------------------------
    */
    public function me(Request $request)
    {
        // Ambil user yang sedang login + sekalian load relasi profil & wilayah
        $user = $request->user()->load('profil', 'wilayah');

        // === BELAJAR: Memanipulasi Array Response untuk Menambah Field 'usia' ===
        // Ubah model Eloquent menjadi array biasa supaya gampang disisipkan data baru
        $data = $user->toArray();

        // Cek apakah user sudah mengisi profil dan punya tanggal lahir
        if ($user->profil && $user->profil->tgl_lahir) {
            // Hitung umur dalam tahun dari tanggal lahir sampai hari ini pakai Carbon,
            // lalu masukkan ke dalam array data.profil.usia (Kontrak 4.4)
            $data['profil']['usia'] = (int) \Carbon\Carbon::parse($user->profil->tgl_lahir)->diffInYears(now());
        }

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $data,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PERSETUJUAN - POST /api/v1/auth/persetujuan
    |--------------------------------------------------------------------------
    */
    public function consent(Request $request)
    {
        $validated = $request->validate([
            'versi_kebijakan' => 'required|string|max:20',
            'setuju'          => 'required|boolean|accepted',
        ]);

        // Catat waktu persetujuan (consent_at)
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
    | CABUT PERSETUJUAN - DELETE /api/v1/auth/persetujuan
    |--------------------------------------------------------------------------
    */
    public function revokeConsent(Request $request)
    {
        // Kosongkan kembali kolom persetujuan
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