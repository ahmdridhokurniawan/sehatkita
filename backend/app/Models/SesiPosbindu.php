<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SesiPosbindu extends Model
{
    // Tanpa ini Eloquent menebak tabel "sesi_posbindus".
    protected $table = 'sesi_posbindu';

    // Kolom yang boleh diisi massal (admin kelurahan bikin jadwal Posbindu).
    protected $fillable = [
        'wilayah_id',  // sesi diadakan di kelurahan mana
        'tanggal',     // tanggal pelaksanaan
        'lokasi',      // tempat, mis. "Balai Kelurahan"
        'kader_id',    // kader penanggung jawab (nullable)
        'catatan',     // catatan tambahan (opsional)
        'status',      // akan_datang | berjalan | selesai
    ];

    // Cast tipe kolom.
    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
        ];
    }

    // Relasi: sesi ini diadakan di wilayah (kelurahan) mana.
    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    // Relasi: kader penanggung jawab sesi ini.
    public function kader(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'kader_id');
    }

    // Relasi: daftar kunjungan (peserta hadir/tidak hadir) di sesi ini.
    public function kunjungan(): HasMany
    {
        return $this->hasMany(KunjunganPosbindu::class, 'sesi_id');
    }

    // Relasi: catatan kesehatan yang tercatat di sesi ini.
    public function catatanKesehatan(): HasMany
    {
        return $this->hasMany(CatatanKesehatan::class, 'sesi_posbindu_id');
    }
}
