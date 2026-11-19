<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan data keikutsertaan warga dalam tantangan kesehatan beserta bukti kegiatannya.
class PesertaProgram extends Model
{
    protected $table = 'peserta_program';

    protected $fillable = [
        'program_id',
        'user_id',
        'status',
        'bukti_foto',
        'bukti_foto_daftar',
        'catatan_bukti',
        'dikirim_pada',
        'catatan_verifikasi',
        'diverifikasi_oleh',
        'diverifikasi_pada',
        'selesai_pada',
    ];

    protected function casts(): array
    {
        return [
            'bukti_foto_daftar' => 'array',
            'dikirim_pada' => 'datetime',
            'diverifikasi_pada' => 'datetime',
            'selesai_pada' => 'datetime',
        ];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id');
    }

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
