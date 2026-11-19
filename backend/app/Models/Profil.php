<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan data pribadi warga seperti tanggal lahir, tinggi badan, dan kebiasaan harian.
class Profil extends Model
{
    protected $table = 'profil';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $keyType = 'int';

    protected $fillable = [
        'user_id',
        'tgl_lahir',
        'jenis_kelamin',
        'tinggi_cm',
        'tingkat_aktivitas',
        'merokok',
        'riwayat_keluarga',
        'tampil_di_peringkat',
        'bb_target_kg',
        'bb_awal_kg',
        'target_aktivitas_per_minggu',
        'target_air_ml',
    ];

    protected $appends = ['usia'];

    protected function casts(): array
    {
        return [
            'tgl_lahir' => 'date',
            'tinggi_cm' => 'decimal:2',
            'bb_target_kg' => 'decimal:2',
            'bb_awal_kg' => 'decimal:2',
            'merokok' => 'boolean',
            'tampil_di_peringkat' => 'boolean',
            'riwayat_keluarga' => 'array',
        ];
    }

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function getUsiaAttribute(): ?int
    {
        return $this->tgl_lahir ? (int) $this->tgl_lahir->diffInYears(now()) : null;
    }
}
