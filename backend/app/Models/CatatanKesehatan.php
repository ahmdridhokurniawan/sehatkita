<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

// Menyimpan setiap hasil pemeriksaan kesehatan warga beserta penilaiannya.
class CatatanKesehatan extends Model
{
    use SoftDeletes;

    protected $table = 'catatan_kesehatan';

    protected $fillable = [
        'user_id',
        'wilayah_id',
        'dicatat_oleh',
        'dicatat_pada',
        'sumber',
        'sesi_posbindu_id',
        'bb_kg',
        'tinggi_cm',
        'lingkar_perut',
        'sistol',
        'diastol',
        'gula_darah',
        'jenis_gula_darah',
        'kolesterol',
        'asam_urat',
        'tidur_jam',
        'merokok',
        'konsumsi_manis',
        'catatan',
        'perlu_verifikasi',

        'kategori_imt',
        'kategori_tensi',
        'kategori_gula_darah',
        'kategori_kolesterol',
        'kategori_asam_urat',
        'status_kesehatan',
        'skor_risiko',
    ];

    protected $appends = ['imt'];

    protected function casts(): array
    {
        return [
            'dicatat_pada' => 'date',
            'bb_kg' => 'decimal:2',
            'tinggi_cm' => 'decimal:2',
            'lingkar_perut' => 'decimal:2',
            'gula_darah' => 'float',
            'asam_urat' => 'decimal:1',
            'merokok' => 'boolean',
            'perlu_verifikasi' => 'boolean',
            'skor_risiko' => 'integer',
        ];
    }

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

    public static function beratTerakhir(int $userId): ?float
    {
        $bb = static::where('user_id', $userId)
            ->where('perlu_verifikasi', false)
            ->whereNotNull('bb_kg')
            ->orderByDesc('dicatat_pada')
            ->orderByDesc('id')
            ->value('bb_kg');

        return $bb !== null ? (float) $bb : null;
    }

    protected function getImtAttribute(): ?float
    {
        $bb = $this->bb_kg;
        $tinggi = $this->tinggi_cm;

        if ($bb === null || $tinggi === null || (float) $tinggi <= 0) {
            return null;
        }

        return round((float) $bb / (((float) $tinggi / 100) ** 2), 2);
    }
}
