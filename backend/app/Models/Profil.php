<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profil extends Model
{
    // Tanpa ini Eloquent menebak tabel "profils".
    protected $table = 'profil';

    // Kolom yang boleh diisi massal (form onboarding user).
    // user_id WAJIB ada: ini primary key sekaligus FK ke pengguna.
    protected $fillable = [
        'user_id',                    // primary key + FK ke pengguna (wajib saat create)
        'tgl_lahir',                  // tanggal lahir → untuk hitung umur (kelompok usia)
        'jenis_kelamin',             // L | P
        'tinggi_cm',                 // tinggi badan, dipakai menghitung IMT
        'tingkat_aktivitas',         // ringan | sedang | berat
        'merokok',                   // true = perokok
        'riwayat_keluarga',          // JSON array, mis. ["hipertensi","diabetes"]
        'bb_target_kg',              // target berat badan (progress dashboard)
        'target_aktivitas_per_minggu',
        'target_air_ml',
    ];

    // Cast tipe kolom.
    protected function casts(): array
    {
        return [
            'tgl_lahir'                  => 'date',
            'tinggi_cm'                  => 'decimal:2',
            'bb_target_kg'               => 'decimal:2',
            'merokok'                    => 'boolean',
            'riwayat_keluarga'           => 'array',   // JSON → dibaca sebagai array PHP
        ];
    }

    // Relasi: profil ini milik user mana (1:1 terbalik).
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
