<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wilayah extends Model
{
    // 1. Nama tabel di database.
    //    WAJIB dideklarasikan. Tanpa ini Eloquent menebak "wilayahs"
    //    (aturan jamak bahasa Inggris) → ketemu "wilayahs" → error "table not found".
    protected $table = 'wilayah';

    // 2. Kolom yang boleh diisi massal (mass assignment).
    //    Tanpa ini, Wilayah::create([...]) ditolak untuk alasan keamanan.
    //    Kolom id, created_at, updated_at tidak perlu dimasukkan — diisi otomatis.
    protected $fillable = [
        'parent_id',     // kecamatan induk (NULL kalau baris ini kecamatan)
        'nama',          // nama wilayah
        'tipe',          // kecamatan | kelurahan
        'kode',          // kode Kemendagri, contoh "63.72.05.1001"
    ];

    // 3. Relasi: KECAMATAN INDUK dari kelurahan ini.
    //    Self-reference — parent_id menunjuk ke baris Wilayah lain.
    //    belongsTo karena 1 kelurahan hanya punya 1 kecamatan induk.
    public function kecamatan(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'parent_id');
    }

    // 4. Relasi: SEMUA KELURAHAN di bawah kecamatan ini.
    //    hasMany karena 1 kecamatan punya banyak kelurahan.
    //    Parameter kedua 'parent_id' = kolom foreign key-nya.
    public function kelurahan(): HasMany
    {
        return $this->hasMany(Wilayah::class, 'parent_id');
    }
}
