"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { rujukan as rujukanApi, ApiError } from "@/lib/api";
import { tanggal, angka } from "@/lib/format";
import type { Rujukan } from "@/types";
import type { StatusRujukan } from "@/lib/enums";

/* Rujukan tingkat kelurahan — kontrak §11.2.
   Untuk admin_kelurahan backend mengirim bentuk TEREDAKSI
   (tanpa user_id / alasan), jadi halaman ini tidak pernah
   menampilkan identitas warga. */

const LABEL_STATUS: Record<StatusRujukan, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  tertangani: "Tertangani",
  ditolak: "Ditolak",
};

const TONE_STATUS: Record<StatusRujukan, "safe" | "warning" | "danger"> = {
  baru: "danger",
  dihubungi: "warning",
  tertangani: "safe",
  ditolak: "danger",
};

const URUTAN: StatusRujukan[] = ["baru", "dihubungi", "tertangani", "ditolak"];

export default function RujukanKelurahanPage() {
  const [daftar, setDaftar] = useState<Rujukan[]>([]);
  const [filterStatus, setFilterStatus] = useState<StatusRujukan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rujukanApi.list();
      setDaftar(data);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat rujukan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const jumlahPerStatus = useMemo(() => {
    const hasil: Record<string, number> = { baru: 0, dihubungi: 0, tertangani: 0, ditolak: 0 };
    for (const r of daftar) hasil[r.status] = (hasil[r.status] ?? 0) + 1;
    return hasil;
  }, [daftar]);

  const tampil = filterStatus ? daftar.filter((r) => r.status === filterStatus) : daftar;

  return (
    <AppShell greet="Rujukan Kelurahan">
      <section>
        <div className="app-section-title">
          <h2>Status Rujukan</h2>
          <span className="tiny">Data warga disembunyikan sesuai §11.2</span>
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          {URUTAN.map((s) => (
            <div
              key={s}
              className="card card-flat li-hover"
              style={{
                cursor: "pointer",
                border: filterStatus === s ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: filterStatus === s ? "var(--primary-050)" : "transparent",
              }}
              onClick={() => setFilterStatus(filterStatus === s ? null : s)}
            >
              <div className="row-between">
                <span className="tiny fw-600">{LABEL_STATUS[s]}</span>
                <Badge tone={TONE_STATUS[s]}>{angka(jumlahPerStatus[s] ?? 0)}</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="app-section-title">
          <h2>Daftar Rujukan {filterStatus ? `(${LABEL_STATUS[filterStatus]})` : ""}</h2>
          {filterStatus ? (
            <button
              className="text-sm"
              onClick={() => setFilterStatus(null)}
              style={{
                textDecoration: "underline",
                cursor: "pointer",
                background: "none",
                border: "none",
                color: "var(--primary)",
              }}
            >
              Bersihkan filter
            </button>
          ) : null}
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={muat} />
        ) : tampil.length ? (
          <div className="card mt-12">
            {tampil.map((r) => (
              <div className="li" key={r.id}>
                <span
                  className="li-ico"
                  style={{
                    background:
                      TONE_STATUS[r.status] === "danger"
                        ? "var(--danger-bg)"
                        : TONE_STATUS[r.status] === "warning"
                          ? "var(--warning-bg)"
                          : "var(--success-bg)",
                    color:
                      TONE_STATUS[r.status] === "danger"
                        ? "var(--danger)"
                        : TONE_STATUS[r.status] === "warning"
                          ? "var(--warning)"
                          : "var(--success)",
                  }}
                >
                  <Icon name="send" size={18} />
                </span>
                <div className="li-main">
                  <strong>{r.faskes?.nama ?? "Faskes"}</strong>
                  <span className="tiny">
                    {r.otomatis ? "Rujukan otomatis sistem" : "Rujukan manual"}
                    {r.indikator ? ` • ${r.indikator}` : ""}
                  </span>
                  <span className="tiny">Dibuat: {tanggal(r.created_at, "short")}</span>
                </div>
                <Badge tone={TONE_STATUS[r.status]}>{LABEL_STATUS[r.status]}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12">
            <EmptyState
              title="Belum ada rujukan"
              desc={
                filterStatus
                  ? `Tidak ada rujukan dengan status ${LABEL_STATUS[filterStatus]}.`
                  : "Belum ada rujukan di wilayah Anda pada periode ini."
              }
            />
          </div>
        )}
      </section>

      <section>
        <div className="app-section-title">
          <h2>Analisis Rujukan</h2>
        </div>
        <div className="card mt-12">
          <div className="li">
            <div className="li-main">
              <strong>Total Rujukan</strong>
              <span className="tiny">Semua rujukan di kelurahan</span>
            </div>
            <strong>{angka(daftar.length)}</strong>
          </div>
          <div className="li">
            <div className="li-main">
              <strong>Tertangani</strong>
              <span className="tiny">Sudah ditindaklanjuti</span>
            </div>
            <strong>{angka(jumlahPerStatus.tertangani ?? 0)}</strong>
          </div>
          <div className="li">
            <div className="li-main">
              <strong>Persentase Tertangani</strong>
              <span className="tiny">Dari total rujukan</span>
            </div>
            <strong>
              {daftar.length
                ? Math.round(((jumlahPerStatus.tertangani ?? 0) / daftar.length) * 100)
                : 0}
              %
            </strong>
          </div>
        </div>
      </section>

      <p className="tiny center mt-8 mb-16">
        <Icon name="info" size={13} /> Rujukan dimonitor untuk memastikan masyarakat mendapat
        penanganan tepat.
      </p>
    </AppShell>
  );
}
