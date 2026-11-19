<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan catatan kehadiran dan pemeriksaan warga saat kegiatan Posbindu.
class KunjunganPosbindu extends Model
{
    protected $table = 'kunjungan_posbindu';

    protected $fillable = [
        'sesi_id',
        'user_id',
        'hadir',
        'dicatat_oleh',
        'catatan_kesehatan_id',
    ];

    protected function casts(): array
    {
        return [
            'hadir' => 'boolean',
        ];
    }

    public function sesi(): BelongsTo
    {
        return $this->belongsTo(SesiPosbindu::class, 'sesi_id');
    }

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function pencatat(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'dicatat_oleh');
    }

    public function catatanKesehatan(): BelongsTo
    {
        return $this->belongsTo(CatatanKesehatan::class, 'catatan_kesehatan_id');
    }
}
