<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Refleksi extends Model
{
    // Tanpa ini Eloquent menebak tabel "refleksis".
    protected $table = 'refleksi';

    // Kolom yang boleh diisi massal (user menulis refleksi mingguan).
    protected $fillable = [
        'user_id',   // milik user mana
        'minggu',    // minggu ke-berapa, format ISO mis. "2026-W40"
        'catatan',   // isi refleksi (wajib)
    ];

    // Relasi: refleksi ini milik user mana.
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
