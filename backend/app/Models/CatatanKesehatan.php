<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CatatanKesehatan extends Model
{
    use SoftDeletes;

    // Tanpa ini Eloquent menebak tabel "catatan_kesehatans".
    protected $table = 'catatan_kesehatan';

    // Append-only (kontrak §7.1): tidak ada UPDATE selain perlu_verifikasi.
    protected $fillable = [
        'user_id',           // milik siapa data ini
        'dicatat_oleh',      // siapa yang input (NULL kalau user input sendiri)
        'dicatat_pada',      // tanggal pemeriksaan
        'sumber',            // mandiri | kader | puskesmas
        'sesi_posbindu_id',  // terisi kalau sumbernya dari sesi Posbindu
        'bb_kg',             // berat badan (kg)
        'tinggi_cm',         // SNAPSHOT tinggi saat dicatat (kontrak §7.1)
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
        // Snapshot hasil hitung saat insert (tidak boleh diubah ambang baru)
        'kategori_imt',
        'kategori_tensi',
        'kategori_gula_darah',
        'kategori_kolesterol',
        'kategori_asam_urat',
        'status_kesehatan',
        'skor_risiko',
    ];

    // `imt` tidak disimpan: turunan dari bb_kg + tinggi_cm snapshot.
    protected $appends = ['imt'];

    protected function casts(): array
    {
        return [
            'dicatat_pada'      => 'date',
            'bb_kg'             => 'decimal:2',
            'tinggi_cm'         => 'decimal:2',
            'lingkar_perut'     => 'decimal:2',
            'asam_urat'         => 'decimal:1',
            'merokok'           => 'boolean',
            'perlu_verifikasi'  => 'boolean',
            'skor_risiko'       => 'integer',
        ];
    }

    /*
    |------------------------------------------------------------------
    | Relasi
    |------------------------------------------------------------------
    */

    public function pengguna(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function pencatat(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'dicatat_oleh');
    }

    public function sesiPosbindu(): BelongsTo
    {
        return $this->belongsTo(SesiPosbindu::class, 'sesi_posbindu_id');
    }

    /*
    |------------------------------------------------------------------
    | Field turunan
    |------------------------------------------------------------------
    */

    /**
     * IMT dari bb_kg + tinggi_cm SNAPSHOT.
     * Sengaja tidak membaca profil supaya riwayat tidak berubah saat
     * tinggi profil diperbarui (kontrak §7.1 butir Snapshot).
     */
    protected function getImtAttribute(): ?float
    {
        $bb     = $this->bb_kg;
        $tinggi = $this->tinggi_cm;

        if ($bb === null || $tinggi === null || (float) $tinggi <= 0) {
            return null;
        }

        return round((float) $bb / (((float) $tinggi / 100) ** 2), 2);
    }
}
