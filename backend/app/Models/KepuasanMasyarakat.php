<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan penilaian dan masukan kepuasan masyarakat terhadap layanan Posbindu/SehatKita.
class KepuasanMasyarakat extends Model
{
    protected $table = 'kepuasan_masyarakat';

    protected $fillable = [
        'user_id',
        'wilayah_id',
        'rating',
        'aspek_pelayanan',
        'komentar',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
        ];
    }

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }
}
