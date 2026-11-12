<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Indikator extends Model
{
    // Tanpa ini Eloquent menebak tabel "indikators".
    protected $table = 'indikator';

    // Kolom yang boleh diisi massal pada pengelolaan indikator kesehatan
    protected $fillable = [
        'kode',
        'nama',
        'satuan',
        'kelompok',
        'interval_skrining_hari',
    ];

    // Konversi tipe kolom numerik untuk jadwal skrining
    protected function casts(): array
    {
        return [
            'interval_skrining_hari' => 'integer',
        ];
    }

    // Relasi: indikator ini punya banyak ambang kategori (1:N).
    public function ambangKategori(): HasMany
    {
        return $this->hasMany(AmbangKategori::class, 'indikator_id');
    }
}
