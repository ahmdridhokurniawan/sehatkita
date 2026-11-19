<?php

use Illuminate\Support\Facades\Schedule;

// Mengatur jadwal tugas otomatis harian dan reset kuartalan peringkat.
Schedule::command('reminder:skrining-ptm')->dailyAt('08:00');
Schedule::command('peringkat:reset-kuartal')->quarterly();
