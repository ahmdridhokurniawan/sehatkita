<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Menyimpan catatan jejak aktivitas penting petugas dan admin demi keamanan data.
class LogAudit extends Model
{
    protected $table = 'log_audit';

    protected $fillable = [
        'user_id',
        'aksi',
        'model',
        'model_id',
        'ip',
        'user_agent',
        'created_at',
    ];

    public $timestamps = false;

    protected static function booted(): void
    {
        static::creating(function (LogAudit $log) {
            $log->created_at ??= now();
        });
    }

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
