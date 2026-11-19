<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Menyimpan data kelurahan dan kecamatan yang terdaftar di aplikasi.
class Wilayah extends Model
{
    protected $table = 'wilayah';

    protected $fillable = [
        'parent_id',
        'nama',
        'tipe',
        'kode',
    ];

    public function kecamatan(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'parent_id');
    }

    public function kelurahan(): HasMany
    {
        return $this->hasMany(Wilayah::class, 'parent_id');
    }
}
