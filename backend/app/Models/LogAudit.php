<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogAudit extends Model
{
    // Tanpa ini Eloquent menebak tabel "log_audits".
    protected $table = 'log_audit';

    // Kolom yang boleh diisi massal (sistem mencatat aktivitas pengguna/admin).
    protected $fillable = [
        'user_id',     // siapa yang melakukan aksi (NULL = tamu)
        'aksi',        // nama aksi, mis. "login", "lihat_catatan"
        'model',       // entitas yang disentuh, mis. "App\Models\CatatanKesehatan"
        'model_id',    // id baris yang disentuh
        'ip',          // alamat IP pelaku
        'user_agent',  // browser/device yang dipakai
    ];

    // Tabel ini hanya punya created_at (tidak ada updated_at),
    // jadi NONAKTIFKAN fitur update timestamp otomatis.
    public $timestamps = false;

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
