<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogAudit extends Model
{
    // Tanpa ini Eloquent menebak tabel "log_audits".
    protected $table = 'log_audit';

    // Kolom yang boleh diisi massal untuk pencatatan log audit
    protected $fillable = [
        'user_id',
        'aksi',
        'model',
        'model_id',
        'ip',
        'user_agent',
        'created_at',
    ];

    // Tabel log hanya menyimpan created_at tanpa updated_at
    public $timestamps = false;

    // Isi created_at otomatis saat log baru dibuat
    protected static function booted(): void
    {
        static::creating(function (LogAudit $log) {
            $log->created_at ??= now();
        });
    }

    // Cast tipe kolom.
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    // Relasi: aksi ini dilakukan oleh user mana.
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }
}
