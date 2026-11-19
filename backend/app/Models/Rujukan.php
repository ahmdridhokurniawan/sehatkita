<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan data rujukan warga ke puskesmas beserta status penanganannya.
class Rujukan extends Model
{
    protected $table = 'rujukan';

    protected $fillable = [
        'user_id',
        'faskes_id',
        'alasan',
        'dibuat_oleh',
        'otomatis',
        'indikator',
        'status',
        'ditangani_oleh',
        'catatan',
    ];

    protected function casts(): array
    {
        return [
            'otomatis' => 'boolean',
        ];
    }

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function faskes(): BelongsTo
    {
        return $this->belongsTo(Faskes::class, 'faskes_id');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'dibuat_oleh');
    }

    public function penangan(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'ditangani_oleh');
    }
}
