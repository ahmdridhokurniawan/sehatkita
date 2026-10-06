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
        'program_id',   // program yang diikuti
        'user_id',      // user yang mendaftar
        'status',       // terdaftar | selesai | berhenti
        'selesai_pada', // kapan selesai (opsional)
    ];

    // Cast tipe kolom timestamp.
    protected function casts(): array
    {
        return [
            'selesai_pada' => 'datetime',
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
