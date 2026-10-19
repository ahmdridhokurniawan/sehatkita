"use client";

import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Bar from "@/components/charts/Bar";
import Line from "@/components/charts/Line";
import { dummyDashboardKelurahan, dummySesiPosbindu, dummyRujukan } from "@/lib/dummy";
import { tanggal, angka } from "@/lib/format";
import type { User } from "@/types";

const LABEL_STATUS_RUJUKAN: Record<string, "safe" | "warning" | "danger"> = {
  baru: "danger",
  dihubungi: "warning",
  tertangani: "safe",
  ditolak: "danger",
  belum_ditindaklanjuti: "warning",
};

export default function DashboardAdminKelurahan({ user }: { user: User }) {
  const d = dummyDashboardKelurahan;
  const wilayah = user.wilayah?.nama || "Kelurahan";

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
          <Bar
            labels={d.distribusi_imt.map((x) => x.kategori || "")}
            values={d.distribusi_imt.map((x) => x.jumlah)}
            height={200}
          />
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          {d.distribusi_imt.map((item) => (
            <div className="card card-flat" key={item.kategori}>
              <div className="row-between">
                <span className="text-sm fw-600">{item.kategori}</span>
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
      </section>

      {/* Distribusi Risiko */}
      <section>
        <div className="app-section-title">
          <h2>Faktor Risiko Terkemuka</h2>
        </div>
        <div className="card mt-12">
          {d.distribusi_risiko.map((item) => (
            <div className="li" key={item.faktor}>
              <span className="li-ico" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                <Icon name="alert-circle" size={18} />
              </span>
              <div className="li-main">
                <strong>{item.faktor}</strong>
              </div>
              <Badge tone="danger">{angka(item.jumlah)}</Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Tren pencatatan */}
      <section>
        <div className="app-section-title">
          <h2>Tren Pencatatan</h2>
          <span className="tiny">3 bulan terakhir</span>
        </div>
        <div className="card mt-12">
          <Line
            labels={d.tren.map((x) => x.periode)}
            series={[{ name: "Pencatatan", data: d.tren.map((x) => x.total_pencatatan) }]}
            unit="catatan"
            height={150}
          />
        </div>
      </section>

      {/* Sesi Posbindu */}
      <section>
        <div className="app-section-title">
          <h2>Sesi Posbindu Terbaru</h2>
          <Link href="/kader/sesi">Semua sesi</Link>
        </div>
        <div className="card mt-12">
          {dummySesiPosbindu.length ? (
            dummySesiPosbindu.map((s) => (
              <div className="li" key={s.id}>
                <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                  <Icon name="calendar-check" size={18} />
                </span>
                <div className="li-main">
                  <strong>{tanggal(s.tanggal, "day")}</strong>
                  <span className="tiny">{s.lokasi}</span>
                </div>
                <span className="badge badge-warning">
                  {s.hadir}/{s.jumlah_peserta}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center text-muted py-16">
              <p className="tiny">Tidak ada sesi</p>
            </div>
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
          {dummyRujukan.slice(0, 5).map((r) => (
            <div className="li" key={r.id}>
              <span className="li-ico">
                <Icon name="send" size={18} />
              </span>
              <div className="li-main">
                <strong>{r.faskes.nama}</strong>
                <span className="tiny">{r.alasan.substring(0, 40)}...</span>
              </div>
              <Badge tone={LABEL_STATUS_RUJUKAN[r.status] || "warning"}>{r.status}</Badge>
            </div>
          ))}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="shield" size={13} /> Data agregat wilayah Anda aman dan hanya dapat diakses oleh yang berwenang.
      </p>
    </AppShell>
  );
}
