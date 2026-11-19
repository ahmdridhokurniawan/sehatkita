<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Mengarsipkan perolehan EXP, level, dan peringkat akhir warga setiap penutupan periode 3 bulan.
class RiwayatPeringkat extends Model
{
    protected $table = 'riwayat_peringkat';

    protected $fillable = [
        'user_id',
        'wilayah_id',
        'periode_kode',
        'periode_label',
        'mulai_periode',
        'selesai_periode',
        'exp_akhir',
        'level_akhir',
        'peringkat_akhir',
        'total_peserta',
        'diarsipkan_pada',
    ];

    protected function casts(): array
    {
        return [
            'mulai_periode' => 'date',
            'selesai_periode' => 'date',
            'exp_akhir' => 'integer',
            'level_akhir' => 'integer',
            'peringkat_akhir' => 'integer',
            'total_peserta' => 'integer',
            'diarsipkan_pada' => 'datetime',
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
