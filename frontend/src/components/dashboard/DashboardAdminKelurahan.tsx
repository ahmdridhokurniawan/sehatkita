"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Bar from "@/components/charts/Bar";
import Line from "@/components/charts/Line";
import { ErrorState, Loading } from "@/components/ui/Empty";
import { dashboard as dashboardApi, posbindu as posbinduApi, rujukan as rujukanApi, ApiError } from "@/lib/api";
import { LABEL_KATEGORI_IMT } from "@/lib/labels";
import { tanggal, angka } from "@/lib/format";
import type { DashboardKelurahan, KunjunganPosbindu, Rujukan, User } from "@/types";
import type { KategoriImt } from "@/lib/enums";

/* Dashboard admin kelurahan — angka dari API (kontrak §9.1, §10.6, §11.2).
   Privasi (sel < 5 disembunyikan) dijalankan backend; FE hanya menerjemahkan kode. */

const LABEL_FAKTOR: Record<string, string> = {
  hipertensi: "Hipertensi",
  diabetes: "Diabetes",
  obesitas: "Obesitas",
  jantung: "Jantung",
  stroke: "Stroke",
  kolesterol: "Kolesterol tinggi",
  asma: "Asma",
};

const TONE_RUJUKAN: Record<string, "safe" | "warning" | "danger"> = {
  baru: "danger",
  dihubungi: "warning",
  tertangani: "safe",
  ditolak: "danger",
  belum_ditindaklanjuti: "warning",
};

const NAMA_STATUS: Record<string, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  tertangani: "Tertangani",
  ditolak: "Ditolak",
  belum_ditindaklanjuti: "Belum ditindaklanjuti",
};

const LABEL_PERIODE: Record<string, string> = {
  "1m": "1 bulan terakhir",
  "3m": "3 bulan terakhir",
  "6m": "6 bulan terakhir",
  "1y": "12 bulan terakhir",
};

function labelImt(kategori?: string): string {
  return LABEL_KATEGORI_IMT[kategori as KategoriImt] ?? kategori ?? "—";
}

export default function DashboardAdminKelurahan({ user }: { user: User }) {
  const wilayah = user.wilayah?.nama || "Kelurahan";
  const [d, setD] = useState<DashboardKelurahan | null>(null);
  const [kunjungan, setKunjungan] = useState<KunjunganPosbindu[]>([]);
  const [rujukan, setRujukan] = useState<Rujukan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, ruj] = await Promise.all([
        dashboardApi.kelurahan(),
        rujukanApi.list().catch(() => [] as Rujukan[]),
      ]);
      setD(dash);
      setRujukan(ruj);
      const kun = await posbinduApi.kunjungan().catch(() => [] as KunjunganPosbindu[]);
      setKunjungan(kun.slice(0, 3));
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  if (loading) {
    return (
      <AppShell greet={`Halo Admin ${wilayah}`}>
        <Loading />
      </AppShell>
    );
  }

  if (error || !d) {
    return (
      <AppShell greet={`Halo Admin ${wilayah}`}>
        <ErrorState message={error || "Data tidak tersedia"} onRetry={muat} />
      </AppShell>
    );
  }

  return (
    <AppShell greet={`Halo Admin ${wilayah}`}>
      {/* Ringkasan */}
      <section>
        <div className="app-section-title">
          <h2>Ringkasan Kelurahan</h2>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="metric">
            <span className="metric-name">
              <Icon name="users" size={14} /> Peserta Terdaftar
            </span>
            <span className="metric-val">{angka(d.total_peserta)}</span>
            <div className="tiny mt-4">Pengguna aktif: {angka(d.total_pengguna_aktif)}</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="activity" size={14} /> Pencatatan
            </span>
            <span className="metric-val">{angka(d.total_pencatatan)}</span>
            <div className="tiny mt-4">Total pengukuran</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="check-circle" size={14} /> Kepatuhan
            </span>
            <span className="metric-val">{d.kepatuhan_pencatatan_persen}%</span>
            <div className="tiny mt-4">Pencatatan rutin</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="send" size={14} /> Rujukan
            </span>
            <span className="metric-val">{angka(d.rujukan.total)}</span>
            <div className="tiny mt-4">Total rujukan</div>
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
              height={200}
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
                  <span className="text-sm fw-600">{labelImt(item.kategori)}</span>
                  <Badge
                    tone={
                      item.kategori?.toLowerCase().includes("obesitas") ||
                      item.kategori?.toLowerCase().includes("gemuk")
                        ? "danger"
                        : item.kategori?.toLowerCase().includes("normal")
                          ? "safe"
                          : "warning"
                    }
                  >
                    {angka(item.jumlah)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Distribusi Risiko */}
      <section>
        <div className="app-section-title">
          <h2>Faktor Risiko Terkemuka</h2>
        </div>
        <div className="card mt-12">
          {d.distribusi_risiko.length ? (
            d.distribusi_risiko.map((item) => (
              <div className="li" key={item.faktor}>
                <span className="li-ico" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                  <Icon name="alert-circle" size={18} />
                </span>
                <div className="li-main">
                  <strong>{LABEL_FAKTOR[item.faktor ?? ""] ?? item.faktor}</strong>
                </div>
                <Badge tone="danger">{angka(item.jumlah)}</Badge>
              </div>
            ))
          ) : (
            <p className="tiny center py-16">Belum ada faktor risiko tercatat.</p>
          )}
        </div>
      </section>

      {/* Tren pencatatan */}
      <section>
        <div className="app-section-title">
          <h2>Tren Pencatatan</h2>
          <span className="tiny">{LABEL_PERIODE[d.periode] ?? d.periode}</span>
        </div>
        <div className="card mt-12">
          {d.tren.length ? (
            <Line
              labels={d.tren.map((x) => x.periode)}
              series={[{ name: "Pencatatan", data: d.tren.map((x) => x.total_pencatatan) }]}
              unit="catatan"
              height={150}
            />
          ) : (
            <p className="tiny center py-16">Belum ada pencatatan pada periode ini.</p>
          )}
        </div>
      </section>

      {/* Kunjungan Posbindu */}
      <section>
        <div className="app-section-title">
          <h2>Kunjungan Posbindu Terbaru</h2>
          <Link href="/posbindu">Semua sesi</Link>
        </div>
        <div className="card mt-12">
          {kunjungan.length ? (
            kunjungan.map((s) => (
              <div className="li" key={s.kunjungan_id}>
                <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                  <Icon name="calendar-check" size={18} />
                </span>
                <div className="li-main">
                  <strong>{tanggal(s.tanggal, "day")}</strong>
                  <span className="tiny">{s.lokasi}</span>
                </div>
                <Badge tone={s.hadir ? "safe" : "warning"}>{s.hadir ? "Hadir" : "Tidak hadir"}</Badge>
              </div>
            ))
          ) : (
            <p className="tiny center py-16">Belum ada kunjungan Posbindu.</p>
          )}
        </div>
      </section>

      {/* Status Rujukan */}
      <section>
        <div className="app-section-title">
          <h2>Status Rujukan</h2>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="card card-flat">
            <div className="row-between">
              <span className="tiny">Baru</span>
              <Badge tone="danger">{d.rujukan.baru}</Badge>
            </div>
          </div>
          <div className="card card-flat">
            <div className="row-between">
              <span className="tiny">Dihubungi</span>
              <Badge tone="warning">{d.rujukan.dihubungi}</Badge>
            </div>
          </div>
          <div className="card card-flat">
            <div className="row-between">
              <span className="tiny">Tertangani</span>
              <Badge tone="safe">{d.rujukan.tertangani}</Badge>
            </div>
          </div>
          <div className="card card-flat">
            <div className="row-between">
              <span className="tiny">Belum tindak lanjut</span>
              <Badge tone="warning">{d.rujukan.belum_ditindaklanjuti}</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Rujukan terbaru */}
      <section>
        <div className="app-section-title">
          <h2>Rujukan Terbaru</h2>
          <Link href="/rujukan">Semua rujukan</Link>
        </div>
        <div className="card mt-12">
          {rujukan.length ? (
            rujukan.slice(0, 5).map((r) => (
              <div className="li" key={r.id}>
                <span className="li-ico">
                  <Icon name="send" size={18} />
                </span>
                <div className="li-main">
                  <strong>{r.faskes?.nama ?? "Faskes"}</strong>
                  <span className="tiny">{r.alasan.substring(0, 40)}...</span>
                </div>
                <Badge tone={TONE_RUJUKAN[r.status] || "warning"}>{NAMA_STATUS[r.status] || r.status}</Badge>
              </div>
            ))
          ) : (
            <p className="tiny center py-16">Belum ada rujukan.</p>
          )}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="shield" size={13} /> Data agregat wilayah Anda aman dan hanya dapat diakses oleh yang berwenang.
      </p>
    </AppShell>
  );
}
