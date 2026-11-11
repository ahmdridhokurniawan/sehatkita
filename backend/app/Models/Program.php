<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    // Tanpa ini Eloquent menebak tabel "programs".
    protected $table = 'program';

    // Kolom yang boleh diisi massal.
    // 4 kolom terakhir = gamifikasi (kontrak v1.2 25).
    protected $fillable = [
        'wilayah_id',      // program ini dibuat oleh kelurahan mana
        'judul',           // nama program, mis. "Program 21 Hari Hidup Sehat"
        'jenis',           // olahraga | edukasi | pemeriksaan | lainnya
        'target_peserta',  // target jumlah peserta, mis. 100
        'mulai',           // tanggal mulai
        'selesai',         // tanggal selesai (opsional)
        'status',          // akan_datang | berjalan | selesai
        'badge',           // alias frontend
        'exp',             // alias frontend
        'badge_reward',    // kolom resmi kontrak v1.5
        'exp_reward',      // kolom resmi kontrak v1.5
        'level',           // gamifikasi: tingkat kesulitan (1-3)
        'rank_kelurahan',  // gamifikasi: peringkat kelurahan
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

    // Cast tipe kolom.
    protected function casts(): array
    {
        return [
            'mulai'   => 'date',
            'selesai' => 'date',
            'exp'     => 'integer',
            'level'   => 'integer',
        ];
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