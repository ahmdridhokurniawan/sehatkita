<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Menyimpan informasi kegiatan dan tantangan hidup sehat di wilayah.
class Program extends Model
{
    protected $table = 'program';

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

    public function getExpAttribute(): int
    {
        return (int) ($this->attributes['exp_reward'] ?? 0);
    }

    public function setExpAttribute($value): void
    {
        $this->attributes['exp_reward'] = (int) $value;
    }

    public function getBadgeAttribute(): ?string
    {
        return $this->attributes['badge_reward'] ?? null;
    }

    public function setBadgeAttribute($value): void
    {
        $this->attributes['badge_reward'] = $value;
    }

    protected function casts(): array
    {
        return [
            'mulai' => 'date',
            'selesai' => 'date',
            'target_peserta' => 'integer',
            'exp_reward' => 'integer',
            'level' => 'integer',
        ];
    }

    public function scopeSedangBerjalan($query, ?string $hariIni = null)
    {
        $hariIni ??= now()->toDateString();

        return $query->where('status', '!=', 'selesai')
            ->whereDate('mulai', '<=', $hariIni)
            ->where(fn ($q) => $q->whereNull('selesai')->orWhereDate('selesai', '>=', $hariIni));
    }

    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    public function peserta(): HasMany
    {
        return $this->hasMany(PesertaProgram::class, 'program_id');
    }

    public function pengguna()
    {
        return $this->belongsToMany(Pengguna::class, 'peserta_program', 'program_id', 'user_id')
            ->withPivot(['status', 'selesai_pada'])
            ->withTimestamps();
    }
}
