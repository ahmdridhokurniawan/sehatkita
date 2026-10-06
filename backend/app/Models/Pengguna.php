<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pengguna extends Model
{
    // Tabel asli kita pakai nama Indonesia — Eloquent akan menebak "penggunas".
    protected $table = 'pengguna';

    // Kolom yang boleh diisi massal (register / update profil).
    protected $fillable = [
        'name',              // nama lengkap
        'email',             // untuk login
        'password',          // sudah di-hash (lihat casts())
        'role',              // super_admin | admin_kelurahan | kader | user
        'wilayah_id',        // user terdaftar di kelurahan mana
        'consent_at',        // kapan setuju kebijakan privasi
        'versi_kebijakan',   // versi kebijakan yang disetujui
    ];

    // Kolom sensitif — tidak boleh muncul di response JSON secara default.
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Cast: bagaimana Laravel membaca/menulis tipe kolom tertentu.
    protected function casts(): array
    {
        return [
            'password'          => 'hashed',         // otomatis hash saat di-set (Laravel 11+)
            'consent_at'        => 'datetime',
            'email_verified_at' => 'datetime',
        ];
    }

    // Relasi: user ini terdaftar di wilayah (kelurahan) mana.
    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    // Relasi: profil pribadi user (1:1).
    public function profil()
    {
        return $this->hasOne(Profil::class, 'user_id');
    }

    // Relasi: semua catatan kesehatan milik user ini (1:N).
    public function catatanKesehatan(): HasMany
    {
        return $this->hasMany(CatatanKesehatan::class, 'user_id');
    }

    // Relasi: semua rujukan milik user ini.
    public function rujukan(): HasMany
    {
        return $this->hasMany(Rujukan::class, 'user_id');
    }

    // Relasi: daftar program yang diikuti user (lewat tabel pivot peserta_program).
    public function program()
    {
        return $this->belongsToMany(Program::class, 'peserta_program', 'user_id', 'program_id')
                    ->withPivot(['status', 'selesai_pada'])
                    ->withTimestamps();
    }

    // Relasi: daftar pengobatan user ini.
    public function pengobatan(): HasMany
    {
        return $this->hasMany(Pengobatan::class, 'user_id');
    }

    // Relasi: daftar refleksi mingguan user ini.
    public function refleksi(): HasMany
    {
        return $this->hasMany(Refleksi::class, 'user_id');
    }

    // Relasi: daftar kunjungan Posbindu user ini.
    public function kunjunganPosbindu(): HasMany
    {
        return $this->hasMany(KunjunganPosbindu::class, 'user_id');
    }

    // Relasi: user ini menjadi kader di sesi-sesi mana saja.
    public function sesiSebagaiKader(): HasMany
    {
        return $this->hasMany(SesiPosbindu::class, 'kader_id');
    }

    // Relasi: rujukan yang DIBUAT user ini (sebagai kader/admin).
    public function rujukanDibuat(): HasMany
    {
        return $this->hasMany(Rujukan::class, 'dibuat_oleh');
    }

    // Relasi: rujukan yang DITANGANI user ini.
    public function rujukanDitangani(): HasMany
    {
        return $this->hasMany(Rujukan::class, 'ditangani_oleh');
    }

    // Relasi: catatan kesehatan yang diinput user ini untuk orang lain (sebagai kader).
    public function catatanYangDicatat(): HasMany
    {
        return $this->hasMany(CatatanKesehatan::class, 'dicatat_oleh');
    }
}
