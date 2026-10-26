<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\HasApiTokens;

class Pengguna extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role',
        'wilayah_id', 'consent_at', 'versi_kebijakan',
    ];

    protected $hidden = ['password', 'remember_token'];

    // relasi ke wilayah
    public function wilayah(): BelongsTo
    {
        return $this->belongsTo(Wilayah::class, 'wilayah_id');
    }

    // relasi ke profil
    public function profil()
    {
        return $this->hasOne(Profil::class, 'user_id');
    }
}
