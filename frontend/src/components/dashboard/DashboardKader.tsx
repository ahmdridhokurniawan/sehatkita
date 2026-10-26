"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { tanggal } from "@/lib/format";
import { posbindu, rujukan, ApiError } from "@/lib/api";
import type { User, SesiPosbindu, Rujukan } from "@/types";

const LABEL_STATUS_RUJUKAN: Record<string, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  tertangani: "Tertangani",
  ditolak: "Ditolak",
};

const TONE_STATUS_RUJUKAN: Record<string, "warning" | "primary" | "safe" | "danger"> = {
  baru: "warning",
  dihubungi: "primary",
  tertangani: "safe",
  ditolak: "danger",
};

function bulanSekarang(iso: string) {
  return iso?.slice(0, 7) === new Date().toISOString().slice(0, 7);
}

export default function DashboardKader({ user }: { user: User }) {
  const [sesi, setSesi] = useState<SesiPosbindu[]>([]);
  const [daftarRujukan, setDaftarRujukan] = useState<Rujukan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;

    async function muat() {
      try {
        setLoading(true);
        const [s, r] = await Promise.all([
          // §10.1 — kader hanya menerima sesi miliknya.
          posbindu.sesiList({}),
          // §11.2 — kader menerima rujukan warga binaannya (tidak teredaksi).
          rujukan.list({}),
        ]);
        if (batal) return;
        setSesi(s);
        setDaftarRujukan(r);
        setError(null);
      } catch (err) {
        if (batal) return;
        setError((err as ApiError).message || "Gagal memuat dashboard kader");
      } finally {
        if (!batal) setLoading(false);
      }
    }

    muat();
    return () => {
      batal = true;
    };
  }, []);

  const sesiBulanIni = sesi.filter((s) => bulanSekarang(s.tanggal));
  const hadirBulanIni = sesiBulanIni.reduce((n, s) => n + (s.hadir || 0), 0);
  const sesiAkanDatang = sesi.filter((s) => s.tanggal >= new Date().toISOString().slice(0, 10)).length;
  const rujukanTerbuka = daftarRujukan.filter((r) => r.status === "baru" || r.status === "dihubungi");

  return (
    <AppShell greet="Halo Kader">
      {/* Ringkasan aktivitas — dihitung dari API, bukan angka demo */}
      <section>
        <div className="app-section-title">
          <h2>Aktivitas Bulan Ini</h2>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <div className="metric">
            <span className="metric-name">
              <Icon name="calendar" size={14} /> Sesi
            </span>
            <span className="metric-val">{loading ? "—" : sesiBulanIni.length}</span>
            <div className="tiny mt-4">Sesi Posbindu bulan ini</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="users" size={14} /> Kehadiran
            </span>
            <span className="metric-val">{loading ? "—" : hadirBulanIni}</span>
            <div className="tiny mt-4">Peserta hadir bulan ini</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="calendar-check" size={14} /> Terjadwal
            </span>
            <span className="metric-val">{loading ? "—" : sesiAkanDatang}</span>
            <div className="tiny mt-4">Sesi akan datang</div>
          </div>
          <div className="metric">
            <span className="metric-name">
              <Icon name="alert-circle" size={14} /> Rujukan
            </span>
            <span className="metric-val">{loading ? "—" : rujukanTerbuka.length}</span>
            <div className="tiny mt-4">Perlu tindak lanjut</div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="alert alert-danger mt-16">
          <Icon name="alert-circle" />
          <div>{error}</div>
        </div>
      ) : null}

      {/* Sesi terbaru */}
      <section>
        <div className="app-section-title">
          <h2>Sesi Posbindu</h2>
          <Link href="/posbindu">Kelola</Link>
        </div>
        <div className="card mt-12">
          {loading ? (
            <EmptyState title="Memuat..." desc="Mengambil data sesi dari server." />
          ) : sesi.length ? (
            sesi.slice(0, 5).map((s) => (
              <div className="li" key={s.id}>
                <span className="li-ico" style={{ background: "var(--primary-050)", color: "var(--primary)" }}>
                  <Icon name="calendar-check" size={18} />
                </span>
                <div className="li-main">
                  <strong>{tanggal(s.tanggal, "day")}</strong>
                  <span className="tiny">{s.lokasi}</span>
                </div>
                <div className="li-side">
                  <div className="tiny">
                    {s.hadir}/{s.jumlah_peserta} peserta
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Belum ada sesi" desc="Sesi Posbindu yang ditugaskan kepada Anda akan tampil di sini." />
          )}
        </div>
      </section>

      {/* Rujukan warga binaan — §11.2 */}
      <section>
        <div className="app-section-title">
          <h2>Rujukan Perlu Tindak Lanjut</h2>
          <Link href="/rujukan">Daftar lengkap</Link>
        </div>
        {rujukanTerbuka.length ? (
          <div className="card mt-12">
            {rujukanTerbuka.map((r) => (
              <div className="li" key={r.id}>
                <span className="li-ico" style={{ color: "var(--danger)" }}>
                  <Icon name="alert-triangle" size={18} />
                </span>
                <div className="li-main">
                  <strong>{r.faskes?.nama || "Faskes"}</strong>
                  <span className="tiny">{r.alasan || "Tanpa alasan tertulis"}</span>
                </div>
                <Badge tone={TONE_STATUS_RUJUKAN[r.status] || "primary"}>
                  {LABEL_STATUS_RUJUKAN[r.status] || r.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="card card-flat mt-12">
            <EmptyState title={loading ? "Memuat..." : "Tidak ada rujukan terbuka"} desc="Semua rujukan sudah ditindaklanjuti." />
          </div>
        )}
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="shield" size={13} /> Data peserta Anda aman dan hanya dapat diakses oleh yang berwenang.
      </p>
    </AppShell>
  );
}
