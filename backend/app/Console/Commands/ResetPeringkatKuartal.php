<?php

namespace App\Console\Commands;

use App\Services\PeringkatService;
use Illuminate\Console\Command;

// Mengarsipkan riwayat peringkat & EXP kuartalan lalu mereset poin peringkat per 3 bulan.
class ResetPeringkatKuartal extends Command
{
    protected $signature = 'peringkat:reset-kuartal {--force : Paksa arsip & reset periode kuartal berjalan sekarang juga}';

    protected $description = 'Mengarsipkan EXP dan peringkat akhir ke riwayat_peringkat lalu mereset poin peringkat per 3 bulan';

    public function handle(PeringkatService $peringkat): int
    {
        $hasil = $peringkat->resetKuartal(now(), (bool) $this->option('force'));

        $this->info(sprintf(
            'Reset peringkat periode %s (%s): %d pengguna diarsipkan dan EXP direset ke 0.',
            $hasil['periode_kode'],
            $hasil['periode_label'],
            $hasil['jumlah_diarsipkan']
        ));

        return self::SUCCESS;
    }
}
