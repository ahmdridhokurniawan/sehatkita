<?php

/*
|--------------------------------------------------------------------------
| Pesan validasi Bahasa Indonesia
|--------------------------------------------------------------------------
| Laravel memakai locale `id` (lihat config/app.php). File ini melengkapi
| terjemahan aturan yang dipakai controller SehatKita supaya pesan 422
| tidak tampil dalam Bahasa Inggris.
|
*/

return [

    'required' => 'Kolom :attribute wajib diisi.',
    'required_if' => 'Kolom :attribute wajib diisi bila :other bernilai :value.',
    'required_with' => 'Kolom :attribute wajib diisi bersama :values.',
    'required_without' => 'Kolom :attribute wajib diisi bila :values kosong.',
    'filled' => 'Kolom :attribute tidak boleh kosong.',
    'present' => 'Kolom :attribute harus disertakan.',

    'string' => 'Kolom :attribute harus berupa teks.',
    'integer' => 'Kolom :attribute harus berupa bilangan bulat.',
    'numeric' => 'Kolom :attribute harus berupa angka.',
    'boolean' => 'Kolom :attribute harus bernilai ya atau tidak.',
    'array' => 'Kolom :attribute harus berupa daftar.',
    'in' => 'Nilai :attribute tidak sah.',
    'not_in' => 'Nilai :attribute tidak diperbolehkan.',

    'min' => [
        'numeric' => 'Kolom :attribute minimal :min.',
        'string' => 'Kolom :attribute minimal :min karakter.',
        'array' => 'Kolom :attribute minimal berisi :min item.',
    ],
    'max' => [
        'numeric' => 'Kolom :attribute maksimal :max.',
        'string' => 'Kolom :attribute maksimal :max karakter.',
        'array' => 'Kolom :attribute maksimal berisi :max item.',
    ],
    'between' => [
        'numeric' => 'Kolom :attribute harus antara :min sampai :max.',
        'string' => 'Kolom :attribute harus :min sampai :max karakter.',
        'array' => 'Kolom :attribute harus berisi :min sampai :max item.',
    ],
    'size' => [
        'numeric' => 'Kolom :attribute harus bernilai :size.',
        'string' => 'Kolom :attribute harus :size karakter.',
    ],

    'email' => 'Format email tidak valid.',
    'unique' => 'Alamat :attribute sudah terdaftar.',
    'exists' => 'Pilihan :attribute tidak ditemukan.',
    'confirmed' => 'Konfirmasi :attribute tidak sama.',
    'same' => 'Kolom :attribute harus sama dengan :other.',
    'different' => 'Kolom :attribute harus berbeda dengan :other.',

    'date' => 'Kolom :attribute harus berupa tanggal yang sah.',
    'date_format' => 'Format :attribute harus :format.',
    'before' => 'Kolom :attribute harus sebelum :date.',
    'before_or_equal' => 'Kolom :attribute tidak boleh melewati :date.',
    'after' => 'Kolom :attribute harus setelah :date.',
    'after_or_equal' => 'Kolom :attribute tidak boleh sebelum :date.',

    'digits' => 'Kolom :attribute harus :digits digit.',
    'digits_between' => 'Kolom :attribute harus :min sampai :max digit.',
    'regex' => 'Format :attribute tidak sesuai.',

    'in_array' => 'Nilai :attribute tidak ada di dalam :other.',
    'distinct' => 'Kolom :attribute berisi nilai ganda.',

    'accepted' => 'Kolom :attribute harus disetujui.',
    'declined' => 'Kolom :attribute harus ditolak.',

    /*
    |--------------------------------------------------------------------------
    | Nama field yang ramah dibaca
    |--------------------------------------------------------------------------
    */
    'attributes' => [
        'name' => 'nama',
        'email' => 'email',
        'password' => 'password',
        'password_confirmation' => 'konfirmasi password',
        'wilayah_id' => 'kelurahan',
        'tgl_lahir' => 'tanggal lahir',
        'jenis_kelamin' => 'jenis kelamin',
        'tinggi_cm' => 'tinggi badan',
        'berat_kg' => 'berat badan',
        'tingkat_aktivitas' => 'tingkat aktivitas',
        'merokok' => 'status merokok',
        'riwayat_keluarga' => 'riwayat penyakit keluarga',
        'tampil_di_peringkat' => 'tampil di peringkat',
        'sistol' => 'tekanan sistol',
        'diastol' => 'tekanan diastol',
        'gula_darah' => 'gula darah',
        'kolesterol' => 'kolesterol',
        'asam_urat' => 'asam urat',
        'imt' => 'IMT',
        'jenis_gula_darah' => 'jenis pemeriksaan gula darah',
        'waktu_periksa' => 'waktu pemeriksaan',
        'sumber' => 'sumber data',
        'catatan' => 'catatan',
        'user_id' => 'pengguna',
        'program_id' => 'program',
        'sesi_id' => 'sesi posbindu',
        'setuju' => 'persetujuan',
        'consent' => 'persetujuan data',
        'periode' => 'periode',
        'search' => 'kata kunci',
        'status' => 'status',
        'level' => 'tingkat',
        'role' => 'peran',
        'kader_id' => 'kader',
        'nama_faskes' => 'nama fasilitas kesehatan',
        'jenis_faskes' => 'jenis fasilitas kesehatan',
        'alamat' => 'alamat',
        'kode' => 'kode',
        'kode_indikator' => 'kode indikator',
        'label' => 'label',
        'satuan' => 'satuan',
        'kategori' => 'kategori',
        'skor' => 'skor',
        'memicu_rujukan' => 'pemicu rujukan',
        'batas_bawah' => 'batas bawah',
        'batas_atas' => 'batas atas',
        'judul' => 'judul',
        'deskripsi' => 'deskripsi',
        'target' => 'target',
        'exp_reward' => 'EXP hadiah',
        'badge' => 'badge',
        'tanggal_mulai' => 'tanggal mulai',
        'tanggal_selesai' => 'tanggal selesai',
        'alasan' => 'alasan',
        'tujuan_faskes' => 'fasilitas kesehatan tujuan',
        'urgensi' => 'tingkat urgensi',
    ],
];
