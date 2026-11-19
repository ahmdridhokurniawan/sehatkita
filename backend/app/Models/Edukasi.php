<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Menyimpan materi edukasi kesehatan PTM yang terpisah dari program tantangan.
class Edukasi extends Model
{
    protected $table = 'edukasi';

    protected $fillable = [
        'wilayah_id',
        'judul',
        'ringkasan',
        'konten',
        'kategori',
        'estimasi_menit',
        'urutan',
        'aktif',
        'dibuat_oleh',
    ];

    protected function casts(): array
    {
        return [
            'estimasi_menit' => 'integer',
            'urutan' => 'integer',
            'aktif' => 'boolean',
        ];
    }

    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'dibuat_oleh');
    }

    public function progres(): HasMany
    {
        return $this->hasMany(ProgresEdukasi::class, 'edukasi_id');
    }
}
