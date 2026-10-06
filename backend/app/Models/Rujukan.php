<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rujukan extends Model
{
    // Tanpa ini Eloquent menebak tabel "rujukans".
    protected $table = 'rujukan';

    // Kolom yang boleh diisi massal (kader/admin merujuk warga ke faskes).
    protected $fillable = [
        'user_id',        // warga yang dirujuk
        'faskes_id',      // tujuan rujukan
        'alasan',         // alasan rujukan, mis. "tensi tinggi 2x pengukuran terakhir"
        'dibuat_oleh',    // siapa yang membuat rujukan (kader/admin)
        'status',         // baru | dihubungi | tertangani | ditolak
        'ditangani_oleh', // siapa yang menangani tindak lanjut
        'catatan',        // catatan tindak lanjut (opsional)
    ];

    // Relasi: rujukan ini untuk warga mana.
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    // Relasi: rujukan ini ditujukan ke faskes mana.
    public function faskes(): BelongsTo
    {
        return $this->belongsTo(Faskes::class, 'faskes_id');
    }

    // Relasi: siapa yang membuat rujukan ini.
    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'dibuat_oleh');
    }

    // Relasi: siapa yang menangani tindak lanjut rujukan ini.
    public function penangan(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'ditangani_oleh');
    }
}
