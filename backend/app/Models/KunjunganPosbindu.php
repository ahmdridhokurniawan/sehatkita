<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KunjunganPosbindu extends Model
{
    // Tanpa ini Eloquent menebak tabel "kunjungan_posbindus".
    protected $table = 'kunjungan_posbindu';

    // Kolom yang boleh diisi massal (kader mencatat kehadiran peserta).
    protected $fillable = [
        'sesi_id',             // kunjungan ini di sesi mana
        'user_id',             // peserta yang datang
        'hadir',               // true = hadir, false = tidak hadir
        'dicatat_oleh',        // siapa yang mencatat (kader)
        'catatan_kesehatan_id', // tautan ke hasil pengukuran di sesi ini
    ];

    // Cast tipe kolom boolean.
    protected function casts(): array
    {
        return [
            'hadir' => 'boolean',
        ];
    }

    // Relasi: kunjungan ini terjadi di sesi mana.
    public function sesi(): BelongsTo
    {
        return $this->belongsTo(SesiPosbindu::class, 'sesi_id');
    }

    // Relasi: peserta yang hadir/tidak hadir.
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    // Relasi: siapa yang mencatat kehadiran ini.
    public function pencatat(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'dicatat_oleh');
    }

    // Relasi: hasil pengukuran kader untuk kunjungan ini (opsional).
    public function catatanKesehatan(): BelongsTo
    {
        return $this->belongsTo(CatatanKesehatan::class, 'catatan_kesehatan_id');
    }
}
