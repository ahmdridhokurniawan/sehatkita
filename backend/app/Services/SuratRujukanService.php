<?php

namespace App\Services;

use App\Models\Rujukan;

// Layanan penyusun data resmi dan template cetak HTML Surat Pengantar Rujukan
class SuratRujukanService
{
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

    // Susun data lengkap surat pengantar rujukan beserta identitas pasien & faskes tujuan
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
            'id'              => $rujukan->id,
            'nomor_surat'     => $this->nomorSurat($rujukan),
            'tanggal_rujukan' => $rujukan->created_at?->toIso8601String(),
            'tanggal_cetak'   => now()->toIso8601String(),
            'status'          => $rujukan->status,
            'otomatis'        => (bool) $rujukan->otomatis,
            'indikator'       => $rujukan->indikator,
            'alasan'          => $rujukan->alasan,
            'catatan'         => $rujukan->catatan,
            'pasien'          => [
                'id'            => $pasien?->id,
                'name'          => $pasien?->name,
                'nik'           => $pasien?->nik,
                'jenis_kelamin' => $profil?->jenis_kelamin,
                'tgl_lahir'     => $profil?->tgl_lahir?->toDateString(),
                'usia'          => $profil?->usia,
                'wilayah'       => $wilayahLengkap !== '' ? $wilayahLengkap : null,
            ],
            'faskes'          => [
                'id'      => $faskes?->id,
                'nama'    => $faskes?->nama,
                'jenis'   => $faskes?->jenis,
                'alamat'  => $faskes?->alamat,
                'telepon' => $faskes?->telepon,
            ],
            'dibuat_oleh'     => $rujukan->pembuat
                ? ['id' => $rujukan->pembuat->id, 'name' => $rujukan->pembuat->name, 'role' => $rujukan->pembuat->role]
                : null,
            'ditangani_oleh'  => $rujukan->penangan
                ? ['id' => $rujukan->penangan->id, 'name' => $rujukan->penangan->name, 'role' => $rujukan->penangan->role]
                : null,
            'disclaimer'      => 'Surat pengantar rujukan ini merupakan tindak lanjut skrining Posbindu SehatKita, bukan diagnosis medis resmi. Untuk rujukan berjenjang BPJS/RS, harap tetap melalui pemeriksaan dokter di Puskesmas/FKTP terdekat.',
        ];
    }

    // Render dokumen HTML A4 siap cetak / simpan sebagai PDF lewat browser
    public function renderHtml(Rujukan $rujukan): string
    {
        $d = $this->dataSurat($rujukan);
        $pasien = $d['pasien'];
        $faskes = $d['faskes'];

        $tanggalRujukan = $rujukan->created_at
            ? $rujukan->created_at->timezone('Asia/Makassar')->format('d-m-Y H:i') . ' WITA'
            : '-';
        $tanggalCetak = now()->timezone('Asia/Makassar')->format('d-m-Y H:i') . ' WITA';
        $jkLabel = match ($pasien['jenis_kelamin']) {
            'L' => 'Laki-laki',
            'P' => 'Perempuan',
            default => '-',
        };
        $usiaLabel = $pasien['usia'] !== null ? ($pasien['usia'] . ' tahun') : '-';
        $statusLabel = match ($d['status']) {
            'baru' => 'Baru',
            'dihubungi' => 'Diproses',
            'selesai' => 'Selesai',
            'ditolak' => 'Ditolak',
            default => strtoupper((string) $d['status']),
        };
        $pembuatLabel = $d['dibuat_oleh']['name'] ?? 'Sistem Skrining Otomatis SehatKita';
        $penanganHtml = $d['ditangani_oleh']
            ? '<tr><th>Ditangani Oleh</th><td>' . e($d['ditangani_oleh']['name']) . '</td></tr>'
            : '';
        $catatanHtml = $d['catatan']
            ? '<tr><th>Catatan Petugas</th><td>' . e($d['catatan']) . '</td></tr>'
            : '';
        $indikatorHtml = $d['indikator']
            ? '<tr><th>Indikator Pemicu</th><td>' . e(strtoupper((string) $d['indikator'])) . '</td></tr>'
            : '';

        return '<!DOCTYPE html>'
            . '<html lang="id"><head><meta charset="utf-8">'
            . '<title>Surat Pengantar Rujukan - ' . e($d['nomor_surat']) . '</title>'
            . '<style>'
            . '@page{size:A4;margin:14mm;}'
            . '*{box-sizing:border-box;}'
            . 'body{font-family:Arial,Helvetica,sans-serif;color:#182015;margin:0;padding:24px;background:#f7f8f5;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
            . '.sheet{max-width:760px;margin:0 auto;background:#fff;padding:32px 36px;border:1px solid #d5dccf;border-radius:10px;}'
            . '.head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2.5px solid #1f3319;padding-bottom:14px;margin-bottom:20px;}'
            . '.brand{display:flex;align-items:center;gap:12px;}'
            . '.instansi{margin:0 0 2px;font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#3d5333;}'
            . '.head h1{margin:0;font-size:17px;color:#1f3319;}'
            . '.head p.sub{margin:3px 0 0;font-size:11.5px;color:#4e5846;}'
            . '.num{text-align:right;font-size:11.5px;color:#4e5846;white-space:nowrap;}'
            . '.num strong{display:block;font-size:13.5px;color:#182015;margin-bottom:3px;}'
            . '.num span{display:block;line-height:1.45;}'
            . 'h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#3d5333;margin:18px 0 8px;}'
            . 'table{width:100%;border-collapse:collapse;font-size:12.5px;}'
            . 'th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #edf0ea;vertical-align:top;}'
            . 'th{width:185px;color:#4e5846;font-weight:600;}'
            . '.sign{margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-size:12px;}'
            . '.sign-space{height:48px;}'
            . '.note{margin-top:20px;padding:10px 12px;background:#f4f7f0;border-left:3.5px solid #638b3f;font-size:11px;line-height:1.45;color:#3a4533;}'
            . '.actions{max-width:760px;margin:0 auto 14px;text-align:right;}'
            . '.btn{background:#1f3319;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:13px;}'
            . '@media print{body{background:#fff;padding:0;}.sheet{border:none;border-radius:0;padding:0;max-width:none;}.actions{display:none;}}'
            . '</style></head><body>'
            . '<div class="actions"><button class="btn" onclick="window.print()">Cetak / Simpan PDF</button></div>'
            . '<div class="sheet">'
            . '<div class="head"><div class="brand">' . $this->logoSehatKitaSvg()
            . '<div><div class="instansi">PEMERINTAH KOTA BANJARBARU · DINAS KESEHATAN</div>'
            . '<h1>SURAT PENGANTAR RUJUKAN POSBINDU</h1>'
            . '<p class="sub">Program Pengendalian PTM SehatKita</p></div></div>'
            . '<div class="num"><strong>' . e($d['nomor_surat']) . '</strong>'
            . '<span>Tanggal: ' . e($tanggalRujukan) . '</span>'
            . '<span>Dicetak: ' . e($tanggalCetak) . '</span></div></div>'
            . '<h2>Identitas Warga / Pasien</h2>'
            . '<table>'
            . '<tr><th>Nama Lengkap</th><td>' . e($pasien['name'] ?? '-') . '</td></tr>'
            . '<tr><th>NIK</th><td>' . e($pasien['nik'] ?? '-') . '</td></tr>'
            . '<tr><th>Tanggal Lahir</th><td>' . e($pasien['tgl_lahir'] ?? '-') . '</td></tr>'
            . '<tr><th>Jenis Kelamin / Usia</th><td>' . e($jkLabel) . ' / ' . e($usiaLabel) . '</td></tr>'
            . '<tr><th>Wilayah Domisili</th><td>' . e($pasien['wilayah'] ?? '-') . '</td></tr>'
            . '</table>'
            . '<h2>Fasilitas Kesehatan Tujuan</h2>'
            . '<table>'
            . '<tr><th>Nama Faskes</th><td>' . e($faskes['nama'] ?? '-') . '</td></tr>'
            . '<tr><th>Jenis Faskes</th><td>' . e(ucwords(str_replace('_', ' ', (string) ($faskes['jenis'] ?? '-')))) . '</td></tr>'
            . '<tr><th>Alamat</th><td>' . e($faskes['alamat'] ?? '-') . '</td></tr>'
            . '<tr><th>Telepon</th><td>' . e($faskes['telepon'] ?? '-') . '</td></tr>'
            . '</table>'
            . '<h2>Keterangan Rujukan</h2>'
            . '<table>'
            . '<tr><th>Alasan Rujukan</th><td>' . e($d['alasan'] ?? '-') . '</td></tr>'
            . $indikatorHtml
            . '<tr><th>Status Tindak Lanjut</th><td>' . e($statusLabel) . '</td></tr>'
            . $penanganHtml
            . $catatanHtml
            . '</table>'
            . '<div class="sign">'
            . '<div><span>Diterbitkan oleh,</span><div class="sign-space"></div><strong>' . e($pembuatLabel) . '</strong></div>'
            . '<div style="text-align:right"><span>Pemegang Surat / Warga,</span><div class="sign-space"></div><strong>' . e($pasien['name'] ?? '-') . '</strong></div>'
            . '</div>'
            . '<div class="note">' . e($d['disclaimer']) . '</div>'
            . '</div></body></html>';
    }

    // Emblem vektor SehatKita x Kota Banjarbaru agar lampiran HTML mandiri tetap menampilkan logo tanpa aset eksternal
    private function logoSehatKitaSvg(): string
    {
        return '<svg width="46" height="46" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
            . '<defs>'
            . '<linearGradient id="sk-gold" x1="12" y1="3" x2="52" y2="59" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#FEF08A"/><stop offset="48%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#B45309"/></linearGradient>'
            . '<linearGradient id="sk-field" x1="32" y1="6" x2="32" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#7D8D39"/><stop offset="52%" stop-color="#485B1E"/><stop offset="100%" stop-color="#202B0C"/></linearGradient>'
            . '<linearGradient id="sk-roof" x1="32" y1="15" x2="32" y2="25" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#C94117"/></linearGradient>'
            . '<linearGradient id="sk-heart" x1="32" y1="24" x2="32" y2="47" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#EAF3DC"/></linearGradient>'
            . '<linearGradient id="sk-ribbon" x1="15" y1="48" x2="49" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#4D7C0F"/><stop offset="50%" stop-color="#84CC16"/><stop offset="100%" stop-color="#3F6212"/></linearGradient>'
            . '<clipPath id="sk-clip"><path d="M32 6.8 L51.4 13.1 V29.6 C51.4 42.3 42.7 51.1 32 55.7 C21.3 51.1 12.6 42.3 12.6 29.6 V13.1 Z"/></clipPath>'
            . '</defs>'
            . '<path d="M32 3.5 L54.8 11 V29.8 C54.8 44.5 44.5 54.5 32 59.8 C19.5 54.5 9.2 44.5 9.2 29.8 V11 Z" fill="url(#sk-gold)" stroke="#232D10" stroke-opacity="0.48" stroke-width="1.2"/>'
            . '<path d="M32 6.8 L51.4 13.1 V29.6 C51.4 42.3 42.7 51.1 32 55.7 C21.3 51.1 12.6 42.3 12.6 29.6 V13.1 Z" fill="url(#sk-field)"/>'
            . '<g clip-path="url(#sk-clip)">'
            . '<path d="M32 8 L51 27 L32 46 L13 27 Z" fill="#FEF08A" fill-opacity="0.08"/>'
            . '<rect x="13.8" y="18.2" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            . '<rect x="13.8" y="22.3" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7"/>'
            . '<rect x="13.8" y="26.4" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            . '<rect x="13.8" y="30.5" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7"/>'
            . '<rect x="13.8" y="34.6" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            . '<rect x="46.7" y="18.2" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            . '<rect x="46.7" y="22.3" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7"/>'
            . '<rect x="46.7" y="26.4" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            . '<rect x="46.7" y="30.5" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7"/>'
            . '<rect x="46.7" y="34.6" width="3.5" height="3.1" rx="0.7" fill="#FF5A22"/>'
            . '<path d="M18.8 25.5 Q24.5 23.2 32 16 Q39.5 23.2 45.2 25.5 L42.5 27 H21.5 Z" fill="url(#sk-roof)" stroke="#FFFBEB" stroke-width="1.2" stroke-linejoin="round"/>'
            . '</g>'
            . '<path d="M32 6.8 L33.4 9.75 L36.65 10.2 L34.3 12.45 L34.88 15.65 L32 14.12 L29.12 15.65 L29.7 12.45 L27.35 10.2 L30.6 9.75 Z" fill="#FEF08A" stroke="#78350F" stroke-width="0.65" stroke-linejoin="round"/>'
            . '<path d="M32 45.6 C32 45.6 20 38.4 20 30.8 C20 26.9 23 24.2 26.5 24.2 C28.9 24.2 31 25.5 32 27.5 C33 25.5 35.1 24.2 37.5 24.2 C41 24.2 44 26.9 44 30.8 C44 38.4 32 45.6 32 45.6 Z" fill="url(#sk-heart)" stroke="#233012" stroke-opacity="0.38" stroke-width="1"/>'
            . '<path d="M22.2 33 H26.4 L28.4 28.9 L31.1 38 L34.2 28 L36.3 33 H41.8" stroke="#485B1E" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"/>'
            . '<circle cx="34.2" cy="28" r="1.5" fill="#FF5A22"/>'
            . '<path d="M15.2 47.4 Q32 53.6 48.8 47.4 L46.4 52.8 Q32 58.6 17.6 52.8 Z" fill="url(#sk-ribbon)" stroke="#232D10" stroke-opacity="0.42" stroke-width="1.4" stroke-linejoin="round"/>'
            . '<path d="M15.6 47.7 Q32 53.7 48.4 47.7 L46.2 52.6 Q32 58.2 17.8 52.6 Z" stroke="#FEF08A" stroke-width="0.95" stroke-linejoin="round"/>'
            . '</svg>';
    }
}
