<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// Menyimpan data akun pengguna SehatKita beserta hubungannya ke profil, wilayah, dan catatan kesehatan.
class Pengguna extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'pengguna';

    protected $fillable = [
        'name',
        'nik',
        'email',
        'telegram_chat_id',
        'telegram_connect_token',
        'password',
        'role',
        'wilayah_id',
        'kader_id',
        'consent_at',
        'versi_kebijakan',
        'aktif',
        'exp_total',
        'level_gamifikasi',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'telegram_chat_id',
        'telegram_connect_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'consent_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'aktif' => 'boolean',
            'exp_total' => 'integer',
            'level_gamifikasi' => 'integer',
        ];
    }

    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    public function profil()
    {
        return $this->hasOne(Profil::class, 'user_id');
    }

    public function catatanKesehatan(): HasMany
    {
        return $this->hasMany(CatatanKesehatan::class, 'user_id');
    }

    public function rujukan(): HasMany
    {
        return $this->hasMany(Rujukan::class, 'user_id');
    }

    public function program()
    {
        return $this->belongsToMany(Program::class, 'peserta_program', 'user_id', 'program_id')
            ->withPivot(['status', 'selesai_pada'])
            ->withTimestamps();
    }

    public function refleksi(): HasMany
    {
        return $this->hasMany(Refleksi::class, 'user_id');
    }

    public function kunjunganPosbindu(): HasMany
    {
        return $this->hasMany(KunjunganPosbindu::class, 'user_id');
    }

    public function kader(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'kader_id');
    }

    public function binaan(): HasMany
    {
        return $this->hasMany(Pengguna::class, 'kader_id');
    }

    public function badge(): HasMany
    {
        return $this->hasMany(BadgePengguna::class, 'user_id');
    }

    public function riwayatWilayah(): HasMany
    {
        return $this->hasMany(RiwayatWilayah::class, 'user_id')->latest();
    }

    public function riwayatPeringkat(): HasMany
    {
        return $this->hasMany(RiwayatPeringkat::class, 'user_id')->orderByDesc('selesai_periode');
    }

    public function progresEdukasi(): HasMany
    {
        return $this->hasMany(ProgresEdukasi::class, 'user_id');
    }
}
