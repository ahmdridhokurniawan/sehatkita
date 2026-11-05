<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model target kesehatan dinamis warga
class TargetKesehatan extends Model
{
    protected $table = 'target_kesehatan';

    protected $fillable = [
        'user_id',
        'judul',
        'jenis_target',
        'nilai_awal',
        'nilai_target',
        'satuan',
        'tenggat_waktu',
        'tercapai',
        'tercapai_pada',
        'catatan_motivasi',
    ];

    protected function casts(): array
    {
        return [
            'nilai_awal'    => 'float',
            'nilai_target'  => 'float',
            'tenggat_waktu' => 'date',
            'tercapai'      => 'boolean',
            'tercapai_pada' => 'datetime',
        ];
    }

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
