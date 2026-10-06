<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pengobatan extends Model
{
    // Tanpa ini Eloquent menebak tabel "pengobatans".
    protected $table = 'pengobatan';

    // Kolom yang boleh diisi massal (user mencatat obat yang dikonsumsi).
    protected $fillable = [
        'user_id',     // milik user mana
        'nama_obat',   // nama obat, mis. "Amlodipine"
        'dosis',       // dosis, mis. "5mg 1x sehari"
        'mulai',       // kapan mulai minum
        'selesai',     // kapan selesai; NULL = masih berjalan
        'aktif',       // true = masih dikonsumsi
    ];

    // Cast tipe kolom tanggal & boolean.
    protected function casts(): array
    {
        return [
            'mulai'  => 'date',
            'selesai' => 'date',
            'aktif'  => 'boolean',
        ];
    }

    // Relasi: daftar obat ini milik user mana.
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
