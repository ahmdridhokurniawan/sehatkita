<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RekamMedis extends Model
{
    protected $table = 'rekam_medis'; // Sesuaikan nama tabel baru

    protected $fillable = [
        'user_id',
        'judul',
        'isi',
        // tambah field lain sesuai tabel tren
    ];
}
