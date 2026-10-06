<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Indikator extends Model
{
    // Tanpa ini Eloquent menebak tabel "indikators".
    protected $table = 'indikator';

    // Kolom yang boleh diisi massal (menu admin: kelola indikator).
    protected $fillable = [
        'kode',       // identifier untuk kode program, mis. "imt"
        'nama',       // label tampilan, mis. "Indeks Massa Tubuh"
        'satuan',     // "kg/m2", "mmHg", "mg/dL"
        'kelompok',   // antropometri | pemeriksaan fisik | biokimia
    ];

    // Relasi: indikator ini punya banyak ambang kategori (1:N).
    public function ambangKategori(): HasMany
    {
        return $this->hasMany(AmbangKategori::class, 'indikator_id');
    }
}
