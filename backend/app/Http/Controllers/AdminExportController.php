<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\KunjunganPosbindu;
use App\Models\Rujukan;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Controller ekspor data rekapitulasi kesehatan ke format CSV untuk super admin
class AdminExportController extends Controller
{
    public function export(Request $request): StreamedResponse
    {
        abort_unless($request->user()->role === 'super_admin', 403, 'Hanya super admin.');

        $tipe = $request->query('tipe', 'catatan');
        $namaFile = 'sehatkita_export_' . $tipe . '_' . date('Ymd_His') . '.csv';

        return response()->stream(function () use ($tipe, $request) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");

            if ($tipe === 'posbindu') {
                $this->exportPosbindu($handle, $request);
            } elseif ($tipe === 'rujukan') {
                $this->exportRujukan($handle, $request);
            } else {
                $this->exportCatatanKesehatan($handle, $request);
            }

            fclose($handle);
        }, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$namaFile}\"",
            'Cache-Control'       => 'no-store, no-cache',
        ]);
    }

    private function exportCatatanKesehatan($handle, Request $request): void
    {
        fputcsv($handle, [
            'ID', 'Tanggal', 'Nama Warga', 'NIK', 'Kelurahan',
            'BB (kg)', 'TB (cm)', 'IMT', 'Kategori IMT',
            'Sistol (mmHg)', 'Diastol (mmHg)', 'Kategori Tensi',
            'Gula Darah (mg/dL)', 'Jenis Gula',
            'Kolesterol (mg/dL)', 'Asam Urat (mg/dL)',
            'Status Kesehatan', 'Skor Risiko', 'Sumber'
        ]);

        $query = CatatanKesehatan::with(['pengguna.profil', 'pengguna.wilayah'])->latest('dicatat_pada');

        if ($request->filled('wilayah_id')) {
            $query->where('wilayah_id', $request->wilayah_id);
        }

        $query->chunk(100, function ($rows) use ($handle) {
            foreach ($rows as $r) {
                fputcsv($handle, [
                    $r->id,
                    $r->dicatat_pada?->format('Y-m-d') ?? $r->dicatat_pada,
                    $r->pengguna?->name ?? '—',
                    $r->pengguna?->nik ? "'".$r->pengguna->nik : '—',
                    $r->pengguna?->wilayah?->nama ?? '—',
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

    private function exportPosbindu($handle, Request $request): void
    {
        fputcsv($handle, ['ID Kunjungan', 'Tanggal Sesi', 'Lokasi Posbindu', 'Kelurahan', 'Nama Warga', 'NIK', 'Kader Petugas', 'Status Kehadiran']);

        $query = KunjunganPosbindu::with(['sesi.wilayah', 'sesi.kader', 'pengguna'])->latest('id');

        $query->chunk(100, function ($rows) use ($handle) {
            foreach ($rows as $k) {
                fputcsv($handle, [
                    $k->id,
                    $k->sesi?->tanggal?->format('Y-m-d') ?? $k->sesi?->tanggal ?? '—',
                    $k->sesi?->lokasi ?? '—',
                    $k->sesi?->wilayah?->nama ?? '—',
                    $k->pengguna?->name ?? '—',
                    $k->pengguna?->nik ? "'".$k->pengguna->nik : '—',
                    $k->sesi?->kader?->name ?? '—',
                    $k->hadir ? 'Hadir' : 'Tidak Hadir',
                ]);
            }
        });
    }

    private function exportRujukan($handle, Request $request): void
    {
        fputcsv($handle, ['ID Rujukan', 'Tanggal Dibuat', 'Nama Warga', 'NIK', 'Kelurahan', 'Faskes Tujuan', 'Alasan Rujukan', 'Status']);

        $query = Rujukan::with(['pengguna.wilayah', 'faskes'])->latest('id');

        $query->chunk(100, function ($rows) use ($handle) {
            foreach ($rows as $ruj) {
                fputcsv($handle, [
                    $ruj->id,
                    $ruj->created_at?->format('Y-m-d') ?? '—',
                    $ruj->pengguna?->name ?? '—',
                    $ruj->pengguna?->nik ? "'".$ruj->pengguna->nik : '—',
                    $ruj->pengguna?->wilayah?->nama ?? '—',
                    $ruj->faskes?->nama ?? '—',
                    $ruj->alasan ?? '—',
                    $ruj->status ?? '—',
                ]);
            }
        });
    }
}
