<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PesertaProgram extends Model
{
    // Tanpa ini Eloquent menebak tabel "peserta_programs".
    protected $table = 'peserta_program';

    // Kolom yang boleh diisi massal (user mendaftar program).
    protected $fillable = [
        'program_id',        // program yang diikuti
        'user_id',           // user yang mendaftar
        'status',            // terdaftar | menunggu_verifikasi | selesai | ditolak | berhenti
        'bukti_foto',        // path foto dokumentasi bukti penyelesaian misi
        'catatan_bukti',     // catatan singkat peserta saat unggah bukti
        'dikirim_pada',      // waktu peserta mengirim bukti
        'catatan_verifikasi',// catatan kader/admin saat menyetujui/menolak
        'diverifikasi_oleh', // id kader/admin pemverifikasi
        'diverifikasi_pada', // kapan diverifikasi
        'selesai_pada',      // kapan selesai (opsional)
    ];

    // Cast tipe kolom timestamp.
    protected function casts(): array
    {
        return [
            'dikirim_pada'      => 'datetime',
            'diverifikasi_pada' => 'datetime',
            'selesai_pada'      => 'datetime',
        ];
    }

    // Relasi: pendaftaran ini untuk program mana.
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id');
    }

    // Relasi: pendaftaran ini milik user mana.
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
