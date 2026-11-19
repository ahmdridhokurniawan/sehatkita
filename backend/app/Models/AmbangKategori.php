<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan aturan batas angka normal, waspada, dan berisiko untuk setiap jenis pemeriksaan.
class AmbangKategori extends Model
{
    protected $table = 'ambang_kategori';

    protected $fillable = [
        'indikator_id',
        'jenis_gula_darah',
        'batas_min',
        'batas_max',
        'kategori',
        'status',
        'skor',
        'memicu_rujukan',
    ];

    protected function casts(): array
    {
        return [
            'batas_min' => 'decimal:2',
            'batas_max' => 'decimal:2',
            'skor' => 'integer',
            'memicu_rujukan' => 'boolean',
        ];
    }

    public function indikator(): BelongsTo
    {
        return $this->belongsTo(Indikator::class, 'indikator_id');
    }
}
