<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model pencatatan riwayat perpindahan wilayah / mutasi kelurahan warga (U12)
class RiwayatWilayah extends Model
{
    protected $table = 'riwayat_wilayah';

    protected $fillable = [
        'user_id',
        'wilayah_asal_id',
        'wilayah_tujuan_id',
        'alasan',
        'diubah_oleh',
    ];

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function wilayahAsal(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_asal_id');
    }

    public function wilayahTujuan(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_tujuan_id');
    }

    public function pengubah(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'diubah_oleh');
    }
}
