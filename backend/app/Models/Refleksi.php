<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan catatan refleksi kesehatan harian yang ditulis warga.
class Refleksi extends Model
{
    protected $table = 'refleksi';

    protected $fillable = [
        'user_id',
        'minggu',
        'catatan',
    ];

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
