<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatatanKesehatan extends Model
{
    // Tanpa ini Eloquent menebak tabel "catatan_kesehatans".
    protected $table = 'catatan_kesehatan';

    // Kolom yang boleh diisi massal (user/kader mencatat hasil pengukuran).
    protected $fillable = [
        'user_id',           // milik siapa data ini
        'dicatat_oleh',      // siapa yang input (NULL kalau user input sendiri)
        'dicatat_pada',      // tanggal pemeriksaan
        'sumber',            // mandiri | kader | puskesmas
        'sesi_posbindu_id',  // terisi kalau sumbernya dari sesi Posbindu
        'bb_kg',             // berat badan (kg)
        'lingkar_perut',     // lingkar perut (cm)
        'sistol',            // tekanan darah angka atas
        'diastol',           // tekanan darah angka bawah
        'gula_darah',        // gula darah (mg/dL)
        'jenis_gula_darah',  // puasa | 2jam_pp
        'kolesterol',        // kolesterol total (mg/dL)
        'asam_urat',         // asam urat (mg/dL)
        'tidur_jam',         // durasi tidur (jam)
        'merokok',           // true = merokok saat itu
        'konsumsi_manis',    // jarang | sering | setiap_hari
        'catatan',           // catatan bebas user (opsional)
        'perlu_verifikasi',  // true = nilai tidak wajar, dikeluarkan dari agregat
    ];

    // Cast tipe kolom numerik & tanggal.
    protected function casts(): array
    {
        return [
            'dicatat_pada'      => 'date',
            'bb_kg'             => 'decimal:2',
            'lingkar_perut'     => 'decimal:2',
            'asam_urat'         => 'decimal:1',
            'merokok'           => 'boolean',
            'perlu_verifikasi'  => 'boolean',
        ];
    }

    // Relasi: catatan ini milik user mana.
    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    // Relasi: siapa yang menginput catatan ini.
    public function pencatat(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'dicatat_oleh');
    }

    // Relasi: catatan ini diambil saat sesi Posbindu mana (opsional).
    public function sesiPosbindu(): BelongsTo
    {
        return $this->belongsTo(SesiPosbindu::class, 'sesi_posbindu_id');
    }
}
