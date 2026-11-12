<?php

namespace App\Http\Controllers;

use App\Models\CatatanKesehatan;
use App\Models\Faskes;
use App\Models\LogAudit;
use App\Models\Pengguna;
use App\Models\PesertaProgram;
use App\Models\Program;
use App\Models\Rujukan;
use App\Models\Wilayah;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class AdminStatistikController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | STATISTIK SISTEM - GET /api/v1/admin/statistik
    |--------------------------------------------------------------------------
    | Hanya super_admin (Gate "manage-master" di AuthServiceProvider).
    | Nama field mengikuti pemakaian frontend:
    | frontend/src/app/admin/statistik/page.tsx
    */
    public function index(Request $request)
    {
        Gate::authorize('manage-master');

        $semingguLalu = now()->subDays(7);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                // Pengguna
                'total_users'                => Pengguna::count(),
                'users_by_role'              => $this->hitungPerKolom(Pengguna::query(), 'role'),

                // Rujukan (status: baru | dihubungi | tertangani | ditolak)
                'total_rujukan'              => Rujukan::count(),
                'rujukan_by_status'          => $this->hitungPerKolom(Rujukan::query(), 'status'),

                // Program (status: akan_datang | berjalan | selesai)
                'total_program'              => Program::count(),
                'total_program_participants' => PesertaProgram::count(),
                'program_by_status'          => $this->hitungPerKolom(Program::query(), 'status'),

                // Catatan kesehatan
                'total_catatan'              => CatatanKesehatan::count(),
                'avg_imt'                    => $this->rataRataImt(),
                'avg_sistol'                 => $this->bulatSatu(CatatanKesehatan::avg('sistol')),
                'avg_diastol'                => $this->bulatSatu(CatatanKesehatan::avg('diastol')),

                // Master data
                'total_wilayah'              => Wilayah::count(),
                'total_faskes'               => Faskes::count(),

                // Aktivitas 7 hari terakhir
                'new_users_7d'               => Pengguna::where('created_at', '>=', $semingguLalu)->count(),
                'new_rujukan_7d'             => Rujukan::where('created_at', '>=', $semingguLalu)->count(),
                'new_catatan_7d'             => CatatanKesehatan::where('created_at', '>=', $semingguLalu)->count(),
                'total_audit_logs_7d'        => LogAudit::where('created_at', '>=', $semingguLalu)->count(),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Bantu: hitung jumlah baris per nilai satu kolom.
    | Contoh hasil untuk kolom role: { "user": 12, "kader": 3 }
    */
    private function hitungPerKolom($query, string $kolom): array
    {
        return $query->select($kolom, DB::raw('COUNT(*) as jumlah'))
            ->groupBy($kolom)
            ->pluck('jumlah', $kolom)
            ->toArray();
    }

    /*
    |--------------------------------------------------------------------------
    | Bantu: IMT rata-rata = bb_kg / (tinggi_m)^2.
    | Tinggi diambil dari tabel profil (bukan disimpan di catatan).
    */
    // Hitung rata-rata IMT hanya dari catatan terverifikasi dan belum dihapus
    private function rataRataImt(): ?float
    {
        $imt = DB::table('catatan_kesehatan as c')
            ->leftJoin('profil as p', 'p.user_id', '=', 'c.user_id')
            ->whereNull('c.deleted_at')
            ->where('c.perlu_verifikasi', false)
            ->whereNotNull('c.bb_kg')
            ->whereRaw('COALESCE(c.tinggi_cm, p.tinggi_cm) > 0')
            ->selectRaw('AVG(c.bb_kg / POW(COALESCE(c.tinggi_cm, p.tinggi_cm) / 100, 2)) as imt')
            ->value('imt');

        return $imt === null ? null : round((float) $imt, 2);
    }

    // Bulatkan angka satu desimal dan kembalikan null jika datanya kosong
    private function bulatSatu($nilai): ?float
    {
        return $nilai === null ? null : round((float) $nilai, 1);
    }
}