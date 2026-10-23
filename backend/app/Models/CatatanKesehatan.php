<?php

namespace App\Models;

use App\Services\HealthCalculatorService;
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

    // Accessor di bawah OTOMATIS muncul di response JSON (kontrak 7.1 read-only).
    protected $appends = [
        'imt',
        'tinggi_cm',
        'kategori_imt',
        'kategori_tensi',
        'kategori_gula_darah',
        'kategori_kolesterol',
        'kategori_asam_urat',
        'status_kesehatan',
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

    /*
    |------------------------------------------------------------------
    | Relasi
    |------------------------------------------------------------------
    */

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

    /*
    |------------------------------------------------------------------
    | Field hitung-server (dihitung, bukan disimpan di kolom)
    |------------------------------------------------------------------
    */

    // Tinggi badan diambil dari profil pemilik data (kontrak 7.2).
    protected function getTinggiCmAttribute(): ?float
    {
        return ($this->pengguna?->profil?->tinggi_cm !== null)
            ? (float) $this->pengguna->profil->tinggi_cm
            : null;
    }

    // IMT = bb / tinggi(m)². Pakai tinggi profil, bukan input user.
    protected function getImtAttribute(): ?float
    {
        $tinggi = $this->tinggi_cm;

        if ($this->bb_kg === null || $tinggi === null || $tinggi <= 0) {
            return null;
        }

        return round((float) $this->bb_kg / (($tinggi / 100) ** 2), 2);
    }

    // Shortcut ke service supaya accessor di bawah ringkas.
    private function kalkulator(): HealthCalculatorService
    {
        // app() = ambil instance service (Laravel auto-resolve).
        return app(HealthCalculatorService::class);
    }

    // Kategori IMT: "kurus" | "normal" | "berat badan berlebih" | "gemuk" | "obesitas"
    protected function getKategoriImtAttribute(): ?string
    {
        return $this->kalkulator()->kategori('imt', $this->imt)['kategori'] ?? null;
    }

    // Kategori tekanan darah (gabungan sistol+diastol, ambil status terburuk).
    protected function getKategoriTensiAttribute(): ?string
    {
        $hasil = $this->kalkulator()->kategoriTensi($this->sistol, $this->diastol);

        return $hasil['status'] ?? null;
    }

    protected function getKategoriGulaDarahAttribute(): ?string
    {
        return $this->kalkulator()->kategori('gula_darah', $this->gula_darah)['status'] ?? null;
    }

    protected function getKategoriKolesterolAttribute(): ?string
    {
        return $this->kalkulator()->kategori('kolesterol', $this->kolesterol)['status'] ?? null;
    }

    protected function getKategoriAsamUratAttribute(): ?string
    {
        return $this->kalkulator()->kategori('asam_urat', $this->asam_urat)['status'] ?? null;
    }

    // Status keseluruhan = status terburuk dari semua indikator terisi.
    protected function getStatusKesehatanAttribute(): string
    {
        return $this->kalkulator()->statusKesehatan($this);
    }
}