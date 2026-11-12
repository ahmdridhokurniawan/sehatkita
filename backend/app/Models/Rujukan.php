<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rujukan extends Model
{
    // Tanpa ini Eloquent menebak tabel "rujukans".
    protected $table = 'rujukan';

    // Kolom yang boleh diisi massal untuk rujukan manual maupun otomatis sistem
    protected $fillable = [
        'user_id',
        'faskes_id',
        'alasan',
        'dibuat_oleh',
        'otomatis',
        'indikator',
        'status',
        'ditangani_oleh',
        'catatan',
    ];

    // Konversi tipe kolom agar nilai boolean tetap konsisten
    protected function casts(): array
    {
        return [
            'otomatis' => 'boolean',
        ];
    }

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
