<?php

use Illuminate\Support\Facades\Schedule;

// Mengatur jadwal tugas otomatis harian seperti pengiriman pengingat pemeriksaan lewat Telegram.
Schedule::command('reminder:skrining-ptm')->dailyAt('08:00');
