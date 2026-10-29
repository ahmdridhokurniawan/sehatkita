"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Bar from "@/components/charts/Bar";
import Line from "@/components/charts/Line";
import { ErrorState, Loading } from "@/components/ui/Empty";
import { laporan as laporanApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { LABEL_KATEGORI_IMT, LABEL_FAKTOR } from "@/lib/labels";
import { angka } from "@/lib/format";
import type { LaporanKelurahan, Wilayah } from "@/types";
import type { KategoriImt } from "@/lib/enums";

/* Laporan agregat kelurahan — kontrak §14.2.
   Suppression sel < 5 dijalankan backend (§9.2); FE tidak pernah
   menerima angka mentah, jadi tidak ada yang perlu disaring di sini. */

type Periode = "1m" | "3m" | "6m" | "1y";

const LABEL_PERIODE: Record<Periode, string> = {
  "1m": "1 bulan",
  "3m": "3 bulan",
  "6m": "6 bulan",
  "1y": "12 bulan",
};

export default function LaporanKelurahanPage() {
  const { user, loading: loadingUser } = useUser();
  const [periode, setPeriode] = useState<Periode>("3m");
  const [d, setD] = useState<LaporanKelurahan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* super_admin tidak punya wilayah sendiri, jadi backend menolak tanpa
     `wilayah_id` (422 "wilayah_id wajib untuk super_admin"). Dulu halaman ini
     langsung memanggil API tanpa parameter itu dan selalu berakhir
     "Gagal memuat data". Sekarang super_admin memilih kelurahan dulu. */
  const perluPilihWilayah = user?.role === "super_admin";
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [wilayahId, setWilayahId] = useState<number | null>(null);

  useEffect(() => {
    if (!perluPilihWilayah) return;
    let aktif = true;
    wilayahApi
      .list({ tipe: "kelurahan" })
      .then((rows) => {
        if (!aktif) return;
        setWilayahList(rows);
        if (rows.length) setWilayahId((kini) => kini ?? rows[0].id);
      })
      .catch(() => aktif && setWilayahList([]));
    return () => {
      aktif = false;
    };
  }, [perluPilihWilayah]);

  const muat = useCallback(async () => {
    /* Role baru diketahui setelah /auth/me selesai. Jangan memanggil API
       selagi role belum pasti — kalau tidak, super_admin terlanjur memanggil
       tanpa `wilayah_id` dan backend membalas 422 "Validasi gagal". */
    if (loadingUser) return;
    // Tunggu pilihan kelurahan; jangan memanggil API yang pasti 422.
    if (perluPilihWilayah && !wilayahId) {
      setLoading(false);
      setD(null);
      setError("");
      return;
    }
    setLoading(true);
    try {
      const data = await laporanApi.kelurahan({
        periode,
        ...(perluPilihWilayah && wilayahId ? { wilayah_id: wilayahId } : {}),
      });
      setD(data);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }, [periode, perluPilihWilayah, wilayahId, loadingUser]);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <AppShell greet="Laporan Kelurahan" roles={["admin_kelurahan", "super_admin"]}>
      <section>
        <div className="app-section-title">
          <h2>Laporan Agregat</h2>
          <div className="row-end" style={{ gap: 8 }}>
            {perluPilihWilayah ? (
              <select
                value={wilayahId ?? ""}
                onChange={(e) => setWilayahId(Number(e.target.value) || null)}
                className="input"
                aria-label="Pilih kelurahan"
                style={{ maxWidth: 200 }}
              >
                {wilayahList.length ? null : <option value="">Pilih kelurahan…</option>}
                {wilayahList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value as Periode)}
              className="input"
              aria-label="Pilih periode laporan"
              style={{ maxWidth: 140 }}
            >
              {(Object.keys(LABEL_PERIODE) as Periode[]).map((p) => (
                <option key={p} value={p}>
                  {LABEL_PERIODE[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading || (perluPilihWilayah && !wilayahId && !error) ? (
        <Loading />
      ) : error || !d ? (
        <ErrorState message={error || "Data tidak tersedia"} onRetry={muat} />
      ) : (
        <>
          {/* Ringkasan metrik */}
          <section>
            <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
              <div className="card card-metric">
                <div className="tiny">Peserta Terdaftar</div>
                <div className="metric-val">{angka(d.total_peserta)}</div>
              </div>
              <div className="card card-metric">
                <div className="tiny">Pengguna Aktif</div>
                <div className="metric-val">{angka(d.total_pengguna_aktif)}</div>
              </div>
              <div className="card card-metric">
                <div className="tiny">Total Pencatatan</div>
                <div className="metric-val">{angka(d.total_pencatatan)}</div>
              </div>
              <div className="card card-metric">
                <div className="tiny">Kepatuhan</div>
                <div className="metric-val">{d.kepatuhan_pencatatan_persen}%</div>
              </div>
            </div>
          </section>

          {/* Distribusi IMT */}
          <section>
            <div className="app-section-title">
              <h2>Distribusi IMT</h2>
            </div>
            <div className="card mt-12">
              {d.distribusi_imt.length ? (
                <Bar
                  labels={d.distribusi_imt.map((x) => labelImt(x.kategori))}
                  values={d.distribusi_imt.map((x) => x.jumlah)}
                  height={250}
                />
              ) : (
                <p className="tiny center py-16">Belum ada data IMT pada periode ini.</p>
              )}
            </div>
            {d.distribusi_imt.length ? (
              <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
                {d.distribusi_imt.map((item) => (
                  <div className="card card-flat" key={item.kategori}>
                    <div className="row-between">
                      <span>{labelImt(item.kategori)}</span>
                      <strong>{persen(item.jumlah, d.total_peserta)}%</strong>
                    </div>
                    <div className="progress mt-8" style={{ height: 4 }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${persen(item.jumlah, d.total_peserta)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* Riwayat keluarga (self-report) */}
          <section>
            <div className="app-section-title">
              <h2>Riwayat Keluarga</h2>
              <span className="tiny">Self-report peserta</span>
            </div>
            <div className="card mt-12">
              {d.distribusi_riwayat_keluarga.length ? (
                <Bar
                  labels={d.distribusi_riwayat_keluarga.map(
                    (x) => LABEL_FAKTOR[x.faktor ?? ""] ?? x.faktor ?? "",
                  )}
                  values={d.distribusi_riwayat_keluarga.map((x) => x.jumlah)}
                  height={250}
                  horizontal
                />
              ) : (
                <p className="tiny center py-16">Belum ada riwayat keluarga tercatat.</p>
              )}
            </div>
          </section>

          {/* Tren pencatatan */}
          <section>
            <div className="app-section-title">
              <h2>Tren Pencatatan ({LABEL_PERIODE[periode]})</h2>
            </div>
            <div className="card mt-12">
              {d.tren.length ? (
                <Line
                  labels={d.tren.map((x) => x.periode)}
                  series={[{ name: "Pencatatan", data: d.tren.map((x) => x.total_pencatatan) }]}
                  unit="catatan"
                  height={200}
                />
              ) : (
                <p className="tiny center py-16">Belum ada pencatatan pada periode ini.</p>
              )}
            </div>
          </section>

          {/* Kelompok usia */}
          <section>
            <div className="app-section-title">
              <h2>Distribusi Kelompok Usia</h2>
            </div>
            <div className="card mt-12">
              {d.distribusi_kelompok_usia.length ? (
                d.distribusi_kelompok_usia.map((item) => (
                  <div className="li" key={item.kelompok}>
                    <div className="li-main">
                      <strong>{item.kelompok} tahun</strong>
                    </div>
                    <div className="text-right">
                      <strong>{angka(item.jumlah)}</strong>
                      <span className="tiny block mt-4">
                        {persen(item.jumlah, d.total_peserta)}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="tiny center py-16">
                  Kelompok dengan jumlah &lt; 5 tidak ditampilkan.
                </p>
              )}
            </div>
          </section>

          {/* Status rujukan — hanya status yang lolos suppression */}
          <section>
            <div className="app-section-title">
              <h2>Status Rujukan</h2>
              <span className="tiny">Jumlah &lt; 5 disembunyikan</span>
            </div>
            <div className="card mt-12">
              {Object.keys(d.rujukan).length ? (
                (
                  [
                    ["baru", "Baru", "danger"],
                    ["dihubungi", "Dihubungi", "warning"],
                    ["tertangani", "Tertangani", "safe"],
                    ["ditolak", "Ditolak", "danger"],
                  ] as const
                )
                  .filter(([kunci]) => d.rujukan[kunci] !== undefined)
                  .map(([kunci, label, tone]) => (
                    <div className="li" key={kunci}>
                      <div className="li-main">
                        <strong>{label}</strong>
                      </div>
                      <Badge tone={tone}>{d.rujukan[kunci]}</Badge>
                    </div>
                  ))
              ) : (
                <p className="tiny center py-16">
                  {d.ada_data_disembunyikan
                    ? "Jumlah rujukan disembunyikan karena di bawah 5 (privasi)."
                    : "Belum ada rujukan pada periode ini."}
                </p>
              )}
            </div>
          </section>

          {d.ada_data_disembunyikan ? (
            <p className="tiny center mt-8">
              <Icon name="shield" size={13} /> Sebagian sel disembunyikan untuk melindungi privasi
              (jumlah &lt; 5).
            </p>
          ) : null}

          <p className="tiny center mt-8 mb-16">{d.disclaimer}</p>
        </>
      )}
    </AppShell>
  );
}

function labelImt(kategori?: string): string {
  return LABEL_KATEGORI_IMT[kategori as KategoriImt] ?? kategori ?? "—";
}

function persen(nilai: number, total: number): number {
  return total > 0 ? Math.round((nilai / total) * 100) : 0;
}
