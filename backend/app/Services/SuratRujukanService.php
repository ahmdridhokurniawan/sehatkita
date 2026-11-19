<?php

namespace App\Services;

use App\Models\Rujukan;
use Carbon\Carbon;

// Menyusun isi dan tata naskah resmi surat pengantar rujukan Posbindu yang siap dicetak atau disimpan PDF.
class SuratRujukanService
{
    private const BULAN_ID = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    public function nomorSurat(Rujukan $rujukan): string
    {
        $tahun = ($rujukan->created_at ?? now())->format('Y');

        return sprintf('SK-RUJ/%s/%06d', $tahun, $rujukan->id);
    }

    public function namaFile(Rujukan $rujukan): string
    {
        $nomor = str_replace('/', '-', $this->nomorSurat($rujukan));

        return "surat-rujukan-{$nomor}.html";
    }

    public function dataSurat(Rujukan $rujukan): array
    {
        $rujukan->loadMissing([
            'pengguna.profil',
            'pengguna.wilayah.kecamatan',
            'faskes.wilayah',
            'pembuat:id,name,role',
            'penangan:id,name,role',
        ]);

        $pasien = $rujukan->pengguna;
        $profil = $pasien?->profil;
        $faskes = $rujukan->faskes;
        $kelurahan = $pasien?->wilayah;
        $kecamatan = $kelurahan?->kecamatan;

        $wilayahLengkap = collect([$kelurahan?->nama, $kecamatan?->nama])
            ->filter()
            ->implode(', ');

        return [
            'id' => $rujukan->id,
            'nomor_surat' => $this->nomorSurat($rujukan),
            'tanggal_rujukan' => $rujukan->created_at?->toIso8601String(),
            'tanggal_cetak' => now()->toIso8601String(),
            'status' => $rujukan->status,
            'otomatis' => (bool) $rujukan->otomatis,
            'indikator' => $rujukan->indikator,
            'alasan' => $rujukan->alasan,
            'catatan' => $rujukan->catatan,
            'pasien' => [
                'id' => $pasien?->id,
                'name' => $pasien?->name,
                'nik' => $pasien?->nik,
                'jenis_kelamin' => $profil?->jenis_kelamin,
                'tgl_lahir' => $profil?->tgl_lahir?->toDateString(),
                'usia' => $profil?->usia,
                'wilayah' => $wilayahLengkap !== '' ? $wilayahLengkap : null,
            ],
            'faskes' => [
                'id' => $faskes?->id,
                'nama' => $faskes?->nama,
                'jenis' => $faskes?->jenis,
                'alamat' => $faskes?->alamat,
                'telepon' => $faskes?->telepon,
            ],
            'dibuat_oleh' => $rujukan->pembuat
                ? ['id' => $rujukan->pembuat->id, 'name' => $rujukan->pembuat->name, 'role' => $rujukan->pembuat->role]
                : null,
            'ditangani_oleh' => $rujukan->penangan
                ? ['id' => $rujukan->penangan->id, 'name' => $rujukan->penangan->name, 'role' => $rujukan->penangan->role]
                : null,
            'disclaimer' => 'Surat pengantar rujukan ini merupakan tindak lanjut skrining Posbindu SehatKita, bukan diagnosis medis resmi. Untuk rujukan berjenjang BPJS/RS, harap tetap melalui pemeriksaan dokter di Puskesmas/FKTP terdekat.',
        ];
    }

    public function renderHtml(Rujukan $rujukan): string
    {
        $d = $this->dataSurat($rujukan);
        $pasien = $d['pasien'];
        $faskes = $d['faskes'];

        $tanggalSurat = $this->formatTanggalId($rujukan->created_at ?? now());
        $tanggalCetak = now()->timezone('Asia/Makassar')->format('d-m-Y H:i').' WITA';
        $tglLahirLabel = $pasien['tgl_lahir'] ? $this->formatTanggalId(Carbon::parse($pasien['tgl_lahir'])) : '-';

        $jkLabel = match ($pasien['jenis_kelamin']) {
            'L' => 'Laki-laki',
            'P' => 'Perempuan',
            default => '-',
        };
        $usiaLabel = $pasien['usia'] !== null ? ($pasien['usia'].' tahun') : '-';
        $statusLabel = match ($d['status']) {
            'baru' => 'Baru',
            'dihubungi' => 'Diproses',
            'selesai' => 'Selesai',
            'ditolak' => 'Ditolak',
            default => strtoupper((string) $d['status']),
        };
        $pembuatLabel = $d['dibuat_oleh']['name'] ?? 'Sistem Skrining Otomatis SehatKita';
        $pembuatPeran = match ($d['dibuat_oleh']['role'] ?? null) {
            'kader' => 'Kader Posbindu PTM',
            'super_admin' => 'Petugas Dinas Kesehatan',
            default => 'Petugas / Sistem Skrining PTM',
        };
        $jenisFaskes = ucwords(str_replace('_', ' ', (string) ($faskes['jenis'] ?? 'Fasilitas Kesehatan')));

        $barisIndikator = $d['indikator']
            ? '<tr><td class="lbl">Indikator Pemicu</td><td class="sep">:</td><td>'.e(strtoupper((string) $d['indikator'])).'</td></tr>'
            : '';
        $barisPenangan = $d['ditangani_oleh']
            ? '<tr><td class="lbl">Petugas Penindak Lanjut</td><td class="sep">:</td><td>'.e($d['ditangani_oleh']['name']).'</td></tr>'
            : '';
        $barisCatatan = $d['catatan']
            ? '<tr><td class="lbl">Catatan Tindak Lanjut</td><td class="sep">:</td><td>'.e($d['catatan']).'</td></tr>'
            : '';

        return '<!DOCTYPE html>'
            .'<html lang="id"><head><meta charset="utf-8">'
            .'<title>Surat Pengantar Rujukan - '.e($d['nomor_surat']).'</title>'
            .'<style>'
            .'@page{size:A4;margin:16mm 18mm;}'
            .'*{box-sizing:border-box;}'
            .'body{font-family:"Times New Roman",Times,Georgia,serif;color:#111812;margin:0;padding:24px;background:#f3f5f3;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:12pt;line-height:1.45;}'
            .'.actions{max-width:780px;margin:0 auto 14px;text-align:right;font-family:Arial,Helvetica,sans-serif;}'
            .'.btn{background:#184a33;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:13px;}'
            .'.sheet{max-width:780px;margin:0 auto;background:#fff;padding:34px 42px;border:1px solid #d5dcd7;}'
            .'.kop{display:flex;align-items:center;gap:18px;padding-bottom:10px;border-bottom:3px solid #14281d;position:relative;margin-bottom:14px;}'
            .'.kop::after{content:"";position:absolute;left:0;right:0;bottom:-5px;border-bottom:1px solid #14281d;}'
            .'.kop-logo{flex:none;display:flex;align-items:center;}'
            .'.kop-teks{flex:1;text-align:center;}'
            .'.kop-pemerintah{font-size:11pt;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}'
            .'.kop-dinas{font-size:13.5pt;font-weight:700;letter-spacing:.03em;text-transform:uppercase;margin:1px 0;}'
            .'.kop-unit{font-size:11pt;font-weight:700;}'
            .'.kop-alamat{font-size:9.5pt;color:#3d4942;margin-top:2px;font-family:Arial,Helvetica,sans-serif;}'
            .'.tgl-surat{text-align:right;margin:14px 0 10px;font-size:11pt;}'
            .'.meta-grid{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:16px;}'
            .'.meta-kiri{flex:1.15;}'
            .'.meta-kanan{flex:0.85;font-size:11pt;}'
            .'.meta-tbl{width:100%;border-collapse:collapse;font-size:11pt;}'
            .'.meta-tbl td{padding:2px 0;vertical-align:top;}'
            .'.meta-tbl td.lbl{width:88px;}'
            .'.meta-tbl td.sep{width:14px;text-align:center;}'
            .'.judul-surat{text-align:center;margin:14px 0 12px;}'
            .'.judul-surat h1{margin:0;font-size:12.5pt;text-transform:uppercase;text-decoration:underline;letter-spacing:.04em;}'
            .'.judul-surat span{display:block;font-size:10.5pt;margin-top:2px;}'
            .'p.paragraf{margin:10px 0;text-align:justify;text-indent:28px;font-size:11.5pt;}'
            .'.bagian-judul{font-size:11pt;font-weight:700;margin:14px 0 4px;text-transform:uppercase;letter-spacing:.03em;}'
            .'.data-tbl{width:100%;border-collapse:collapse;font-size:11pt;margin-left:14px;width:calc(100% - 14px);}'
            .'.data-tbl td{padding:3.5px 4px;vertical-align:top;}'
            .'.data-tbl td.lbl{width:185px;color:#27332c;}'
            .'.data-tbl td.sep{width:16px;text-align:center;}'
            .'.ttd-grid{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;margin-top:28px;font-size:11pt;}'
            .'.ttd-kolom{width:46%;}'
            .'.ttd-kolom.kanan{text-align:left;}'
            .'.ttd-ruang{height:64px;}'
            .'.ttd-nama{font-weight:700;text-decoration:underline;}'
            .'.ttd-peran{font-size:10pt;color:#3d4942;}'
            .'.catatan-kaki{margin-top:24px;padding:9px 12px;border:1px solid #ccd7d0;border-left:3.5px solid #184a33;background:#f7faf8;font-family:Arial,Helvetica,sans-serif;font-size:9pt;line-height:1.45;color:#334039;}'
            .'.cetak-info{margin-top:8px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:8.5pt;color:#5a6860;}'
            .'@media print{body{background:#fff;padding:0;}.sheet{border:none;padding:0;max-width:none;}.actions{display:none;}}'
            .'</style></head><body>'
            .'<div class="actions"><button class="btn" onclick="window.print()">Cetak / Simpan PDF</button></div>'
            .'<div class="sheet">'
            .'<div class="kop">'
            .'<div class="kop-logo">'.$this->logoSehatKitaSvg().'</div>'
            .'<div class="kop-teks">'
            .'<div class="kop-pemerintah">Pemerintah Kota Banjarbaru</div>'
            .'<div class="kop-dinas">Dinas Kesehatan</div>'
            .'<div class="kop-unit">Pos Pembinaan Terpadu (Posbindu) PTM — SehatKita</div>'
            .'<div class="kop-alamat">Kota Banjarbaru, Kalimantan Selatan · Layanan Skrining &amp; Pemantauan Faktor Risiko PTM</div>'
            .'</div></div>'
            .'<div class="tgl-surat">Banjarbaru, '.e($tanggalSurat).'</div>'
            .'<div class="meta-grid">'
            .'<div class="meta-kiri"><table class="meta-tbl">'
            .'<tr><td class="lbl">Nomor</td><td class="sep">:</td><td><strong>'.e($d['nomor_surat']).'</strong></td></tr>'
            .'<tr><td class="lbl">Sifat</td><td class="sep">:</td><td>Penting</td></tr>'
            .'<tr><td class="lbl">Lampiran</td><td class="sep">:</td><td>-</td></tr>'
            .'<tr><td class="lbl">Perihal</td><td class="sep">:</td><td><strong>Pengantar Rujukan Pemeriksaan Lanjutan</strong></td></tr>'
            .'</table></div>'
            .'<div class="meta-kanan">'
            .'<div>Kepada Yth.</div>'
            .'<div><strong>Kepala / Dokter Pemeriksa</strong></div>'
            .'<div>'.e($faskes['nama'] ?? 'Fasilitas Kesehatan Tujuan').'</div>'
            .($faskes['alamat'] ? '<div>'.e($faskes['alamat']).'</div>' : '')
            .($faskes['telepon'] ? '<div>Telp. '.e($faskes['telepon']).'</div>' : '')
            .'<div>di Tempat</div>'
            .'</div></div>'
            .'<div class="judul-surat"><h1>SURAT PENGANTAR RUJUKAN POSBINDU</h1><span>Nomor: '.e($d['nomor_surat']).'</span></div>'
            .'<p class="paragraf">Dengan hormat, berdasarkan hasil pemantauan dan skrining faktor risiko Penyakit Tidak Menular (PTM) pada layanan Posbindu SehatKita, bersama ini kami sampaikan pengantar rujukan untuk warga/pasien dengan keterangan sebagai berikut:</p>'
            .'<div class="bagian-judul">A. Identitas Warga / Pasien</div>'
            .'<table class="data-tbl">'
            .'<tr><td class="lbl">Nama Lengkap</td><td class="sep">:</td><td><strong>'.e($pasien['name'] ?? '-').'</strong></td></tr>'
            .'<tr><td class="lbl">NIK</td><td class="sep">:</td><td>'.e($pasien['nik'] ?? '-').'</td></tr>'
            .'<tr><td class="lbl">Tanggal Lahir</td><td class="sep">:</td><td>'.e($tglLahirLabel).'</td></tr>'
            .'<tr><td class="lbl">Jenis Kelamin / Usia</td><td class="sep">:</td><td>'.e($jkLabel).' / '.e($usiaLabel).'</td></tr>'
            .'<tr><td class="lbl">Wilayah Domisili</td><td class="sep">:</td><td>'.e($pasien['wilayah'] ?? '-').'</td></tr>'
            .'</table>'
            .'<div class="bagian-judul">B. Keterangan Rujukan &amp; Tujuan</div>'
            .'<table class="data-tbl">'
            .'<tr><td class="lbl">Fasilitas Kesehatan Tujuan</td><td class="sep">:</td><td><strong>'.e($faskes['nama'] ?? '-').'</strong> ('.e($jenisFaskes).')</td></tr>'
            .'<tr><td class="lbl">Alasan / Indikasi Rujukan</td><td class="sep">:</td><td>'.e($d['alasan'] ?? '-').'</td></tr>'
            .$barisIndikator
            .'<tr><td class="lbl">Status Tindak Lanjut</td><td class="sep">:</td><td>'.e($statusLabel).'</td></tr>'
            .$barisPenangan
            .$barisCatatan
            .'</table>'
            .'<p class="paragraf">Demikian surat pengantar rujukan ini kami sampaikan agar warga/pasien yang bersangkutan dapat memperoleh pemeriksaan serta penanganan medis lebih lanjut. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.</p>'
            .'<div class="ttd-grid">'
            .'<div class="ttd-kolom"><div>Pemegang Surat / Warga,</div><div class="ttd-ruang"></div><div class="ttd-nama">'.e($pasien['name'] ?? '-').'</div><div class="ttd-peran">Warga Terdaftar SehatKita</div></div>'
            .'<div class="ttd-kolom kanan"><div>Banjarbaru, '.e($tanggalSurat).'</div><div>Diterbitkan oleh,</div><div class="ttd-ruang"></div><div class="ttd-nama">'.e($pembuatLabel).'</div><div class="ttd-peran">'.e($pembuatPeran).'</div></div>'
            .'</div>'
            .'<div class="catatan-kaki"><strong>Catatan Penting:</strong> '.e($d['disclaimer']).'</div>'
            .'<div class="cetak-info">Dicetak melalui SehatKita pada '.e($tanggalCetak).'</div>'
            .'</div></body></html>';
    }

    private function formatTanggalId(Carbon $dt): string
    {
        $lokal = $dt->copy()->timezone('Asia/Makassar');
        $bulan = self::BULAN_ID[$lokal->month] ?? $lokal->format('m');

        return "{$lokal->day} {$bulan} {$lokal->year}";
    }

    private function logoSehatKitaSvg(): string
    {
        return '<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
            .'<defs>'
            .'<linearGradient id="sk-gold" x1="12" y1="3" x2="52" y2="59" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#FEF08A"/><stop offset="48%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#B45309"/></linearGradient>'
            .'<linearGradient id="sk-field" x1="32" y1="6" x2="32" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#7D8D39"/><stop offset="52%" stop-color="#485B1E"/><stop offset="100%" stop-color="#202B0C"/></linearGradient>'
            .'<linearGradient id="sk-roof" x1="32" y1="15" x2="32" y2="25" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#C94117"/></linearGradient>'
            .'<linearGradient id="sk-heart" x1="32" y1="24" x2="32" y2="47" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#EAF3DC"/></linearGradient>'
            .'<linearGradient id="sk-ribbon" x1="15" y1="48" x2="49" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#4D7C0F"/><stop offset="50%" stop-color="#84CC16"/><stop offset="100%" stop-color="#3F6212"/></linearGradient>'
            .'<clipPath id="sk-clip"><path d="M32 6.8 L51.4 13.1 V29.6 C51.4 42.3 42.7 51.1 32 55.7 C21.3 51.1 12.6 42.3 12.6 29.6 V13.1 Z"/></clipPath>'
            .'</defs>'
            .'<path d="M32 3.5 L54.8 11 V29.8 C54.8 44.5 44.5 54.5 32 59.8 C19.5 54.5 9.2 44.5 9.2 29.8 V11 Z" fill="url(#sk-gold)" stroke="#232D10" stroke-opacity="0.48" stroke-width="1.2"/>'
            .'<path d="M32 6.8 L51.4 13.1 V29.6 C51.4 42.3 42.7 51.1 32 55.7 C21.3 51.1 12.6 42.3 12.6 29.6 V13.1 Z" fill="url(#sk-field)"/>'
            .'<g clip-path="url(#sk-clip)">'
            .'<path d="M32 8 L51 27 L32 46 L13 27 Z" fill="#FEF08A" fill-opacity="0.08"/>'
            .'<rect x="13.8" y="18.2" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            .'<rect x="13.8" y="22.3" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7"/>'
            .'<rect x="13.8" y="26.4" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            .'<rect x="13.8" y="30.5" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7"/>'
            .'<rect x="13.8" y="34.6" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            .'<rect x="46.7" y="18.2" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            .'<rect x="46.7" y="22.3" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7"/>'
            .'<rect x="46.7" y="26.4" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            .'<rect x="46.7" y="30.5" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7"/>'
            .'<rect x="46.7" y="34.6" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            .'<path d="M18.8 25.5 Q24.5 23.2 32 16 Q39.5 23.2 45.2 25.5 L42.5 27 H21.5 Z" fill="url(#sk-roof)" stroke="#FFFBEB" stroke-width="1.2" stroke-linejoin="round"/>'
            .'</g>'
            .'<path d="M32 6.8 L33.4 9.75 L36.65 10.2 L34.3 12.45 L34.88 15.65 L32 14.12 L29.12 15.65 L29.7 12.45 L27.35 10.2 L30.6 9.75 Z" fill="#FEF08A" stroke="#78350F" stroke-width="0.65" stroke-linejoin="round"/>'
            .'<path d="M32 45.6 C32 45.6 20 38.4 20 30.8 C20 26.9 23 24.2 26.5 24.2 C28.9 24.2 31 25.5 32 27.5 C33 25.5 35.1 24.2 37.5 24.2 C41 24.2 44 26.9 44 30.8 C44 38.4 32 45.6 32 45.6 Z" fill="url(#sk-heart)" stroke="#233012" stroke-opacity="0.38" stroke-width="1"/>'
            .'<path d="M22.2 33 H26.4 L28.4 28.9 L31.1 38 L34.2 28 L36.3 33 H41.8" stroke="#485B1E" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"/>'
            .'<circle cx="34.2" cy="28" r="1.5" fill="#FF5A22"/>'
            .'<path d="M15.2 47.4 Q32 53.6 48.8 47.4 L46.4 52.8 Q32 58.6 17.6 52.8 Z" fill="url(#sk-ribbon)" stroke="#232D10" stroke-opacity="0.42" stroke-width="1.4" stroke-linejoin="round"/>'
            .'<path d="M15.6 47.7 Q32 53.7 48.4 47.7 L46.2 52.6 Q32 58.2 17.8 52.6 Z" stroke="#FEF08A" stroke-width="0.95" stroke-linejoin="round"/>'
            .'</svg>';
    }
}
