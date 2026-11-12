<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    // Tanpa ini Eloquent menebak tabel "programs".
    protected $table = 'program';

    // Kolom yang boleh diisi massal termasuk deskripsi, syarat misi, dan hadiah gamifikasi
    protected $fillable = [
        'wilayah_id',
        'judul',
        'deskripsi',
        'kriteria_misi',
        'jenis',
        'kategori_aktivitas',
        'target_peserta',
        'mulai',
        'selesai',
        'status',
        'badge',
        'exp',
        'badge_reward',
        'exp_reward',
        'level',
        'rank_kelurahan',
    ];

    // Accessor / Mutator alias exp <-> exp_reward
    public function getExpAttribute(): int
    {
        return (int) ($this->attributes['exp_reward'] ?? 0);
    }

    public function setExpAttribute($value): void
    {
        $this->attributes['exp_reward'] = (int) $value;
    }

    // Accessor / Mutator alias badge <-> badge_reward
    public function getBadgeAttribute(): ?string
    {
        return $this->attributes['badge_reward'] ?? null;
    }

    public function setBadgeAttribute($value): void
    {
        $this->attributes['badge_reward'] = $value;
    }

    // Konversi tipe kolom tanggal dan angka program
    protected function casts(): array
    {
        return [
            'mulai'          => 'date',
            'selesai'        => 'date',
            'target_peserta' => 'integer',
            'exp_reward'     => 'integer',
            'level'          => 'integer',
        ];
    }

    // Scope untuk menyaring program yang sedang berjalan berdasarkan tanggal
    public function scopeSedangBerjalan($query, ?string $hariIni = null)
    {
        $hariIni ??= now()->toDateString();

        return $query->where('status', '!=', 'selesai')
            ->whereDate('mulai', '<=', $hariIni)
            ->where(fn ($q) => $q->whereNull('selesai')->orWhereDate('selesai', '>=', $hariIni));
    }

    // Label level dalam bahasa Indonesia, dipakai saat menampilkan ke user.
    public function labelLevel(): string
    {
        return match ((int) $this->level) {
            1       => 'Pemula',
            2       => 'Menengah',
            3       => 'Lanjut',
            default => 'Pemula',
        };
    }

    // Relasi: program ini milik wilayah (kelurahan) mana.
    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    // Relasi: daftar peserta program ini (lewat pivot peserta_program).
    public function peserta(): HasMany
    {
        return $this->hasMany(PesertaProgram::class, 'program_id');
    }

    // Relasi: daftar user yang mengikuti program ini (many-to-many).
    public function pengguna()
    {
        return $this->belongsToMany(Pengguna::class, 'peserta_program', 'program_id', 'user_id')
                    ->withPivot(['status', 'selesai_pada'])
                    ->withTimestamps();
    }
}