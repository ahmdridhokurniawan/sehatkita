"use client";

import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { tanggal, relatif } from "@/lib/format";
import type { User } from "@/types";

// Demo data untuk kader dashboard
const KADER_DEMO = {
  sesi_bulan_ini: 4,
  peserta_aktif: 12,
  kunjungan_bulan_ini: 28,
  rujukan_proses: 3,
  sesi_terbaru: [
    {
      id: 1,
      tanggal: "2026-10-15",
      lokasi: "Balai Kelurahan",
      peserta_hadir: 8,
      peserta_target: 10,
      indikator: ["BB", "TD", "GD"],
    },
    {
      id: 2,
      tanggal: "2026-10-08",
      lokasi: "Balai RW",
      peserta_hadir: 6,
      peserta_target: 8,
      indikator: ["BB", "TD"],
    },
  ],
  peserta_perlu_tindak_lanjut: [
    { id: 1, nama: "Ibu Siti", masalah: "Tekanan darah tinggi", status: "rujukan_proses" },
    { id: 2, nama: "Bapak Hendra", masalah: "Gula darah tinggi", status: "pantau" },
    { id: 3, nama: "Ibu Ratna", masalah: "BB naik 3 kg", status: "konsultasi" },
  ],
  notifikasi: [
    { id: 1, judul: "Sesi minggu depan terjadwal", pesan: "Sesi Posbindu Senin 21 Okt di Balai Kelurahan", dibuat_pada: "2026-10-17T10:30:00Z" },
    { id: 2, judul: "Ada peserta baru", pesan: "Bu Dewi mendaftar untuk mengikuti Posbindu", dibuat_pada: "2026-10-16T14:15:00Z" },
  ],
};

const STATUS_COLOR: Record<string, "primary" | "warning" | "danger"> = {
  rujukan_proses: "danger",
  pantau: "warning",
  konsultasi: "primary",
};

export default function DashboardKader({ user }: { user: User }) {
  const unread = KADER_DEMO.notifikasi.length;

  return (
    <AppShell greet="Halo Kader" unread={unread}>
      {/* Ringkasan aktivitas */}
      <section>
        <div className="app-section-title">
          <h2>Aktivitas Bulan Ini</h2>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="metric">
            <span className="metric-name">
              <Icon name="calendar" size={14} /> Sesi
            </span>
            <span className="metric-val">{KADER_DEMO.sesi_bulan_ini}</span>
            <div className="tiny mt-4">Sesi Posbindu diadakan</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="users" size={14} /> Peserta Aktif
            </span>
            <span className="metric-val">{KADER_DEMO.peserta_aktif}</span>
            <div className="tiny mt-4">Terdaftar di Posbindu</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="check-circle" size={14} /> Kunjungan
            </span>
            <span className="metric-val">{KADER_DEMO.kunjungan_bulan_ini}</span>
            <div className="tiny mt-4">Pencatatan dilakukan</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="alert-circle" size={14} /> Rujukan
            </span>
            <span className="metric-val">{KADER_DEMO.rujukan_proses}</span>
            <div className="tiny mt-4">Proses tindak lanjut</div>
          </div>
        </div>
      </section>

      {/* Sesi terbaru */}
      <section>
        <div className="app-section-title">
          <h2>Sesi Posbindu Terbaru</h2>
          <Link href="/kader/sesi">Lihat semua</Link>
        </div>
        <div className="card mt-12">
          {KADER_DEMO.sesi_terbaru.map((sesi) => (
            <div className="li" key={sesi.id}>
              <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
                <Icon name="calendar-check" size={18} />
              </span>
              <div className="li-main">
                <strong>{tanggal(sesi.tanggal, "day")}</strong>
                <span className="tiny">{sesi.lokasi}</span>
              </div>
              <div className="li-side">
                <div className="tiny">
                  {sesi.peserta_hadir}/{sesi.peserta_target} peserta
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Peserta perlu tindak lanjut */}
      <section>
        <div className="app-section-title">
          <h2>Peserta Perlu Tindak Lanjut</h2>
          <Link href="/kader/peserta">Daftar lengkap</Link>
        </div>
        {KADER_DEMO.peserta_perlu_tindak_lanjut.length ? (
          <div className="card mt-12">
            {KADER_DEMO.peserta_perlu_tindak_lanjut.map((p) => (
              <div className="li" key={p.id}>
                <span className="li-ico" style={{ color: "var(--danger)" }}>
                  <Icon name="alert-triangle" size={18} />
                </span>
                <div className="li-main">
                  <strong>{p.nama}</strong>
                  <span className="tiny">{p.masalah}</span>
                </div>
                <Badge tone={STATUS_COLOR[p.status] || "primary"}>{p.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="card card-flat mt-12">
            <EmptyState title="Semua peserta dalam kondisi baik" />
          </div>
        )}
      </section>

      {/* Notifikasi */}
      <section>
        <div className="app-section-title">
          <h2>Notifikasi</h2>
          <Link href="/notifikasi">Semua</Link>
        </div>
        <div className="card mt-12">
          {KADER_DEMO.notifikasi.length ? (
            KADER_DEMO.notifikasi.map((n) => (
              <div className="li" key={n.id}>
                <span className="li-ico">
                  <Icon name="bell" size={18} />
                </span>
                <div className="li-main">
                  <strong>{n.judul}</strong>
                  <span>{n.pesan}</span>
                </div>
                <div className="li-side">
                  <span className="tiny">{relatif(n.dibuat_pada)}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Tidak ada notifikasi baru" />
          )}
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="shield" size={13} /> Data peserta Anda aman dan hanya dapat diakses oleh yang berwenang.
      </p>
    </AppShell>
  );
}
