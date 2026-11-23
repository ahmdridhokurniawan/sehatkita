<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\KunjunganPosbindu;
use App\Models\Rujukan;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Mengunduh rekap data catatan kesehatan, Posbindu, dan rujukan dalam bentuk file tabel.
class AdminExportController extends Controller
{
    public function export(Request $request): StreamedResponse
    {
        $this->wajibPeran($request->user(), ['super_admin'], 'Hanya super admin.');

        $tipeRaw = (string) $request->query('tipe', 'catatan');
        $tipe = in_array($tipeRaw, ['catatan', 'posbindu', 'rujukan'], true) ? $tipeRaw : 'catatan';
        $formatRaw = (string) $request->query('format', 'csv');
        $format = in_array($formatRaw, ['csv', 'excel'], true) ? $formatRaw : 'csv';
        $ext = $format === 'excel' ? 'xls' : 'csv';
        $namaFile = 'sehatkita_export_'.$tipe.'_'.date('Ymd_His').'.'.$ext;

        $modelAudit = match ($tipe) {
            'posbindu' => KunjunganPosbindu::class,
            'rujukan' => Rujukan::class,
            default => CatatanKesehatan::class,
        };
        $this->catatAudit($request->user(), 'baca_data_individu', $modelAudit, null);

        $headers = [
            'Content-Type' => $format === 'excel'
                ? 'application/vnd.ms-excel; charset=UTF-8'
                : 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$namaFile}\"",
            'Cache-Control' => 'no-store, no-cache',
        ];

        return response()->stream(function () use ($tipe, $format, $request) {
            $handle = fopen('php://output', 'w');

            if ($format === 'excel') {
                fwrite($handle, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
                fwrite($handle, "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n");
                fwrite($handle, "<Worksheet ss:Name=\"".ucfirst($tipe)."\"><Table>\n");
            } else {
                fwrite($handle, "\xEF\xBB\xBF");
            }

            if ($tipe === 'posbindu') {
                $this->exportPosbindu($handle, $format, $request);
            } elseif ($tipe === 'rujukan') {
                $this->exportRujukan($handle, $format, $request);
            } else {
                $this->exportCatatanKesehatan($handle, $format, $request);
            }

            if ($format === 'excel') {
                fwrite($handle, "</Table></Worksheet></Workbook>\n");
            }

            fclose($handle);
        }, 200, $headers);
    }

    private function exportCatatanKesehatan($handle, string $format, Request $request): void
    {
        $this->tulisBaris($handle, $format, [
            'ID', 'Tanggal', 'Nama Warga', 'NIK', 'Kelurahan',
            'BB (kg)', 'TB (cm)', 'IMT', 'Kategori IMT',
            'Sistol (mmHg)', 'Diastol (mmHg)', 'Kategori Tensi',
            'Gula Darah', 'Jenis Pemeriksaan Gula Darah',
            'Kolesterol (mg/dL)', 'Asam Urat (mg/dL)',
            'Status Kesehatan', 'Skor Risiko', 'Sumber',
        ]);

        $query = CatatanKesehatan::with(['pengguna.profil', 'pengguna.wilayah'])
            ->where('perlu_verifikasi', false)
            ->latest('dicatat_pada');

        if ($request->filled('wilayah_id')) {
            $wId = (int) $request->wilayah_id;
            $query->where(function ($q) use ($wId) {
                $q->where('wilayah_id', $wId)
                    ->orWhereHas('pengguna', fn ($sub) => $sub->where('wilayah_id', $wId));
            });
        }

        $query->chunk(100, function ($rows) use ($handle, $format) {
            foreach ($rows as $r) {
                $this->tulisBaris($handle, $format, [
                    $r->id,
                    $r->dicatat_pada?->format('Y-m-d') ?? $r->dicatat_pada,
                    $this->amanCsv($r->pengguna?->name),
                    $r->pengguna?->nik ? "'".$r->pengguna->nik : '—',
                    $this->amanCsv($r->pengguna?->wilayah?->nama),
                    $r->bb_kg ?? '—',
                    $r->tinggi_cm ?? '—',
                    $r->imt ?? '—',
                    $r->kategori_imt ?? '—',
                    $r->sistol ?? '—',
                    $r->diastol ?? '—',
                    $r->kategori_tensi ?? '—',
                    $r->gula_darah ?? '—',
                    $r->jenis_gula_darah ?? '—',
                    $r->kolesterol ?? '—',
                    $r->asam_urat ?? '—',
                    $r->status_kesehatan ?? '—',
                    $r->skor_risiko ?? 0,
                    $r->sumber ?? '—',
                ]);
            }
        });
    }

    private function exportPosbindu($handle, string $format, Request $request): void
    {
        $this->tulisBaris($handle, $format, ['ID Kunjungan', 'Tanggal Sesi', 'Lokasi Posbindu', 'Kelurahan', 'Nama Warga', 'NIK', 'Kader Petugas', 'Status Kehadiran']);

        $query = KunjunganPosbindu::with(['sesi.wilayah', 'sesi.kader', 'pengguna'])->latest('id');

        if ($request->filled('wilayah_id')) {
            $wId = (int) $request->wilayah_id;
            $query->whereHas('sesi', fn ($q) => $q->where('wilayah_id', $wId));
        }

        $query->chunk(100, function ($rows) use ($handle, $format) {
            foreach ($rows as $k) {
                $this->tulisBaris($handle, $format, [
                    $k->id,
                    $k->sesi?->tanggal?->format('Y-m-d') ?? $k->sesi?->tanggal ?? '—',
                    $this->amanCsv($k->sesi?->lokasi),
                    $this->amanCsv($k->sesi?->wilayah?->nama),
                    $this->amanCsv($k->pengguna?->name),
                    $k->pengguna?->nik ? "'".$k->pengguna->nik : '—',
                    $this->amanCsv($k->sesi?->kader?->name),
                    $k->hadir ? 'Hadir' : 'Tidak Hadir',
                ]);
            }
        });
    }

    private function exportRujukan($handle, string $format, Request $request): void
    {
        $this->tulisBaris($handle, $format, ['ID Rujukan', 'Tanggal Dibuat', 'Nama Warga', 'NIK', 'Kelurahan', 'Faskes Tujuan', 'Alasan Rujukan', 'Status']);

        $query = Rujukan::with(['pengguna.wilayah', 'faskes'])->latest('id');

        if ($request->filled('wilayah_id')) {
            $wId = (int) $request->wilayah_id;
            $query->whereHas('pengguna', fn ($q) => $q->where('wilayah_id', $wId));
        }

        $query->chunk(100, function ($rows) use ($handle, $format) {
            foreach ($rows as $ruj) {
                $this->tulisBaris($handle, $format, [
                    $ruj->id,
                    $ruj->created_at?->format('Y-m-d') ?? '—',
                    $this->amanCsv($ruj->pengguna?->name),
                    $ruj->pengguna?->nik ? "'".$ruj->pengguna->nik : '—',
                    $this->amanCsv($ruj->pengguna?->wilayah?->nama),
                    $this->amanCsv($ruj->faskes?->nama),
                    $this->amanCsv($ruj->alasan),
                    $ruj->status ?? '—',
                ]);
            }
        });
    }

    private function tulisBaris($handle, string $format, array $kolom): void
    {
        if ($format === 'excel') {
            $sel = '';
            foreach ($kolom as $nilai) {
                $aman = htmlspecialchars((string) $nilai, ENT_XML1 | ENT_QUOTES, 'UTF-8');
                $sel .= "<Cell><Data ss:Type=\"String\">{$aman}</Data></Cell>";
            }
            fwrite($handle, "<Row>{$sel}</Row>\n");

            return;
        }

        fputcsv($handle, $kolom);
    }

    private function amanCsv(mixed $nilai): string
    {
        if ($nilai === null || $nilai === '') {
            return '—';
        }

        $teks = (string) $nilai;
        if (preg_match('/^[=+\-@\t\r]/', $teks) === 1) {
            return "'".$teks;
        }

        return $teks;
    }
}
