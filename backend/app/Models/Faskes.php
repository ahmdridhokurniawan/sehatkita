<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Menyimpan data puskesmas dan fasilitas kesehatan rujukan.
class Faskes extends Model
{
    protected $table = 'faskes';

    protected $fillable = [
        'wilayah_id',
        'nama',
        'jenis',
        'alamat',
        'telepon',
        'lat',
        'lng',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
        ];
    }

    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    public function rujukan(): HasMany
    {
        return $this->hasMany(Rujukan::class, 'faskes_id');
    }
}
