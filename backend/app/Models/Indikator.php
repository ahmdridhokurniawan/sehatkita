<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Menyimpan daftar jenis pemeriksaan kesehatan seperti tekanan darah, gula darah, dan berat badan.
class Indikator extends Model
{
    protected $table = 'indikator';

    protected $fillable = [
        'kode',
        'nama',
        'satuan',
        'kelompok',
        'interval_skrining_hari',
    ];

    protected function casts(): array
    {
        return [
            'interval_skrining_hari' => 'integer',
        ];
    }

    public function ambangKategori(): HasMany
    {
        return $this->hasMany(AmbangKategori::class, 'indikator_id');
    }
}
