<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan progres belajar mandiri tiap warga untuk setiap materi edukasi.
class ProgresEdukasi extends Model
{
    protected $table = 'progres_edukasi';

    protected $fillable = [
        'edukasi_id',
        'user_id',
        'progres_persen',
        'sudah_dibaca',
        'catatan_pribadi',
        'selesai_pada',
    ];

    protected function casts(): array
    {
        return [
            'progres_persen' => 'integer',
            'sudah_dibaca' => 'boolean',
            'selesai_pada' => 'datetime',
        ];
    }

    public function edukasi(): BelongsTo
    {
        return $this->belongsTo(Edukasi::class, 'edukasi_id');
    }

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
