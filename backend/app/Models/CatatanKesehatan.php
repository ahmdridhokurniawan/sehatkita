<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatatanKesehatan extends Model
{
    protected $table = 'catatan_kesehatan';

    protected $fillable = [
        'user_id', 'dicatat_oleh', 'dicatat_pada', 'sumber',
        'bb_kg', 'lingkar_perut', 'sistol', 'diastol',
        'gula_darah', 'jenis_gula_darah', 'kolesterol',
        'asam_urat', 'tidur_jam', 'merokok',
        'konsumsi_manis', 'wilayah_id',
    ];

    // relasi ke pemilik catatan
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    // relasi ke wilayah (FK baru)
    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }
}
