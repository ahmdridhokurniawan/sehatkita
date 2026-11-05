<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model pengaduan masyarakat untuk kelurahan dan faskes
class Pengaduan extends Model
{
    protected $table = 'pengaduan';

    protected $fillable = [
        'user_id',
        'wilayah_id',
        'judul',
        'isi',
        'kategori',
        'status',
        'tanggapan',
        'ditanggapi_oleh',
        'ditanggapi_pada',
    ];

    protected function casts(): array
    {
        return [
            'ditanggapi_pada' => 'datetime',
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

    public function penanggap(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'ditanggapi_oleh');
    }
}
