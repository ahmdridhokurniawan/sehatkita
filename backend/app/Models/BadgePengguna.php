<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Badge gamifikasi milik user — kontrak 12.5 & §3 (`badge_pengguna`).
 * Satu user hanya sekali punya badge yang sama (unique user_id + badge).
 */
class BadgePengguna extends Model
{
    protected $table = 'badge_pengguna';

    protected $fillable = [
        'user_id',
        'badge',
        'program_id',
    ];

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id');
    }
}
