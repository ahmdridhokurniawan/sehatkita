<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Faskes extends Model
{
    // Tanpa ini Eloquent menebak tabel "faskes" → betel tapi tidak konsisten.
    protected $table = 'faskes';

    // Kolom yang boleh diisi massal (menu admin: kelola fasilitas kesehatan).
    protected $fillable = [
        'wilayah_id',  // faskes berada di kelurahan mana
        'nama',        // nama fasilitas
        'jenis',       // puskesmas | klinik | rumah_sakit | lainnya
        'alamat',      // alamat lengkap
        'telepon',     // nomor telepon (opsional)
        'lat',         // koordinat latitude (opsional, untuk peta)
        'lng',         // koordinat longitude
    ];

    // Cast tipe kolom numerik.
    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
        ];
    }

    // Relasi: faskes ini berada di wilayah (kelurahan) mana.
    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    // Relasi: daftar rujukan yang ditujukan ke faskes ini.
    public function rujukan(): HasMany
    {
        return $this->hasMany(Rujukan::class, 'faskes_id');
    }
}
