<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AmbangKategori extends Model
{
    // Tanpa ini Eloquent menebak tabel "ambang_kategoris".
    protected $table = 'ambang_kategori';

    // Kolom yang boleh diisi massal (menu admin: kelola ambang indikator).
    protected $fillable = [
        'indikator_id',  // milik indikator mana
        'jenis_gula_darah', // puasa | 2jam_pp | NULL (kontrak 8.3)
        'batas_min',     // batas bawah rentang, mis. 18.50
        'batas_max',     // batas atas; NULL = tak berbatas (obesitas, dst.)
        'kategori',      // label kategori, mis. "normal", "gemuk"
        'status',        // normal | perlu_perhatian | berisiko
        'skor',          // sumbangan skor risiko, mis. 2
        'memicu_rujukan', // true = otomatis buat rujukan (kontrak 11)
    ];

    // Cast tipe kolom numerik.
    protected function casts(): array
    {
        return [
            'batas_min' => 'decimal:2',
            'batas_max' => 'decimal:2',
            'skor'      => 'integer',
            'memicu_rujukan' => 'boolean',
        ];
    }

    // Relasi: ambang ini milik indikator mana.
    public function indikator(): BelongsTo
    {
        return $this->belongsTo(Indikator::class, 'indikator_id');
    }
}
