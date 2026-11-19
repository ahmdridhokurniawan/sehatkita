<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Menyimpan jadwal dan lokasi pelaksanaan kegiatan Posbindu di kelurahan.
class SesiPosbindu extends Model
{
    protected $table = 'sesi_posbindu';

    protected $fillable = [
        'wilayah_id',
        'tanggal',
        'lokasi',
        'kader_id',
        'catatan',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
        ];
    }

    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    public function kader(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'kader_id');
    }

    public function kunjungan(): HasMany
    {
        return $this->hasMany(KunjunganPosbindu::class, 'sesi_id');
    }

    public function catatanKesehatan(): HasMany
    {
        return $this->hasMany(CatatanKesehatan::class, 'sesi_posbindu_id');
    }
}
