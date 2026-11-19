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

// Menampilkan ringkasan angka statistik kesehatan untuk seluruh wilayah.
class AdminStatistikController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('manage-master');

        $semingguLalu = now()->subDays(7);
        $hariIni = now()->toDateString();

        $programByStatus = Program::query()
            ->select(['id', 'status', 'mulai', 'selesai'])
            ->get()
            ->countBy(function (Program $p) use ($hariIni) {
                if ($p->status === 'selesai') {
                    return 'selesai';
                }
                $mulai = $p->mulai?->toDateString();
                $selesai = $p->selesai?->toDateString();
                if ($mulai && $hariIni < $mulai) {
                    return 'akan_datang';
                }
                if ($selesai && $hariIni > $selesai) {
                    return 'selesai';
                }

                return 'berjalan';
            })
            ->map(fn ($v) => (int) $v)
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => [

                'total_users' => Pengguna::count(),
                'users_by_role' => $this->hitungPerKolom(Pengguna::query(), 'role'),

                'total_rujukan' => Rujukan::count(),
                'rujukan_by_status' => $this->hitungPerKolom(Rujukan::query(), 'status'),

                'total_program' => Program::count(),
                'total_program_participants' => PesertaProgram::count(),
                'program_by_status' => $programByStatus,

                'total_catatan' => CatatanKesehatan::where('perlu_verifikasi', false)->count(),
                'avg_imt' => $this->rataRataImt(),
                'avg_sistol' => $this->bulatSatu(CatatanKesehatan::where('perlu_verifikasi', false)->avg('sistol')),
                'avg_diastol' => $this->bulatSatu(CatatanKesehatan::where('perlu_verifikasi', false)->avg('diastol')),

                'total_wilayah' => Wilayah::count(),
                'total_faskes' => Faskes::count(),

                'new_users_7d' => Pengguna::where('created_at', '>=', $semingguLalu)->count(),
                'new_rujukan_7d' => Rujukan::where('created_at', '>=', $semingguLalu)->count(),
                'new_catatan_7d' => CatatanKesehatan::where('perlu_verifikasi', false)->where('created_at', '>=', $semingguLalu)->count(),
                'total_audit_logs_7d' => LogAudit::where('created_at', '>=', $semingguLalu)->count(),
            ],
        ]);
    }

    private function hitungPerKolom($query, string $kolom): array
    {
        return $query->select($kolom, DB::raw('COUNT(*) as jumlah'))
            ->groupBy($kolom)
            ->pluck('jumlah', $kolom)
            ->toArray();
    }

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

    private function bulatSatu($nilai): ?float
    {
        return $nilai === null ? null : round((float) $nilai, 1);
    }
}
