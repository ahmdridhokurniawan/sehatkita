<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Pengingat skrining berkala bulanan PTM via bot Telegram setiap pagi
Schedule::command('reminder:skrining-ptm')->dailyAt('08:00');

