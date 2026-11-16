"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { rujukan as rujukanApi, ApiError } from "@/lib/api";
import { tanggal, angka } from "@/lib/format";
import { useMinLoading } from "@/hooks/useMinLoading";
import type { Rujukan } from "@/types";
import type { StatusRujukan } from "@/lib/enums";

/* Rujukan tingkat kelurahan — kontrak §11.2.
   Untuk admin_kelurahan backend mengirim bentuk TEREDAKSI
   (tanpa user_id / alasan), jadi halaman ini tidak pernah
   menampilkan identitas warga. */

const LABEL_STATUS: Record<StatusRujukan, string> = {
  baru: "Baru",
  dihubungi: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

const TONE_STATUS: Record<StatusRujukan, "safe" | "warning" | "danger"> = {
  baru: "danger",
  dihubungi: "warning",
  selesai: "safe",
  ditolak: "danger",
};

const URUTAN: StatusRujukan[] = ["baru", "dihubungi", "selesai", "ditolak"];

const META_STATUS: Record<StatusRujukan, { icon: string; color: string; bg: string }> = {
  baru: { icon: "bell", color: "var(--danger)", bg: "var(--danger-bg)" },
  dihubungi: { icon: "clock", color: "var(--warning)", bg: "var(--warning-bg)" },
  selesai: { icon: "check-circle", color: "var(--safe)", bg: "var(--safe-bg)" },
  ditolak: { icon: "alert-circle", color: "var(--danger)", bg: "var(--danger-bg)" },
};

function opsiLanjut(status: StatusRujukan): StatusRujukan[] {
  if (status === "baru") return ["dihubungi", "selesai", "ditolak"];
  if (status === "dihubungi") return ["selesai", "ditolak"];
  return [];
}

export default function RujukanKelurahanPage() {
  const toast = useToast();
  const [daftar, setDaftar] = useState<Rujukan[]>([]);
  const [filterStatus, setFilterStatus] = useState<StatusRujukan | null>(null);
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");

  const [ubahItem, setUbahItem] = useState<Rujukan | null>(null);
  const [statusBaru, setStatusBaru] = useState<StatusRujukan>("dihubungi");
  const [catatanStatus, setCatatanStatus] = useState("");
  const [ubahErr, setUbahErr] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rujukanApi.list({ per_page: 100 });
      setDaftar(data);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat rujukan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    rujukanApi
      .list({ per_page: 100 })
      .then((data) => {
        if (!aktif) return;
        setDaftar(data);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat rujukan");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  function bukaModalStatus(r: Rujukan) {
    const opsi = opsiLanjut(r.status);
    if (!opsi.length) return;
    setUbahItem(r);
    setStatusBaru(opsi[0]);
    setCatatanStatus("");
    setUbahErr("");
  }

  async function simpanStatus() {
    if (!ubahItem) return;
    setUbahErr("");
    if (statusBaru === "ditolak" && !catatanStatus.trim()) {
      setUbahErr("Catatan alasan penolakan wajib diisi.");
      return;
    }
    setMenyimpan(true);
    try {
      await rujukanApi.updateStatus(ubahItem.id, {
        status: statusBaru,
        catatan: catatanStatus.trim() || undefined,
      });
      toast.success("Status rujukan diperbarui.", { title: "Berhasil" });
      setUbahItem(null);
      await muat();
    } catch (err) {
      setUbahErr(err instanceof ApiError ? err.message : "Gagal memperbarui status");
    } finally {
      setMenyimpan(false);
    }
  }

  const jumlahPerStatus = useMemo(() => {
    const hasil: Record<string, number> = { baru: 0, dihubungi: 0, selesai: 0, ditolak: 0 };
    for (const r of daftar) hasil[r.status] = (hasil[r.status] ?? 0) + 1;
    return hasil;
  }, [daftar]);

  const tampil = useMemo(() => {
    const dasar = filterStatus ? daftar.filter((r) => r.status === filterStatus) : daftar;
    const q = cari.trim().toLowerCase();
    if (!q) return dasar;
    return dasar.filter((r) => {
      const teks = [r.faskes?.nama, r.indikator, r.status, r.catatan, r.alasan]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return teks.includes(q);
    });
  }, [daftar, filterStatus, cari]);

  return (
    <AppShell greet="Rujukan Kelurahan" roles={["admin_kelurahan", "super_admin"]}>
      <section>
        <div className="app-section-title">
          <h2>Status Rujukan</h2>
          <span className="tiny">Nama &amp; NIK warga disamarkan untuk menjaga privasi</span>
        </div>
        <div className="grid-balanced-4 mt-12">
          {URUTAN.map((s) => {
            const aktif = filterStatus === s;
            const meta = META_STATUS[s];
            return (
              <button
                type="button"
                key={s}
                className="card card-flat li-hover"
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "14px 16px",
                  border: aktif ? `1.5px solid ${meta.color}` : "1px solid var(--border)",
                  borderTop: `3px solid ${meta.color}`,
                  background: aktif ? "var(--surface-2)" : "var(--surface)",
                  display: "grid",
                  gap: 8,
                }}
                onClick={() => setFilterStatus(aktif ? null : s)}
              >
                <div className="row-between" style={{ gap: 8 }}>
                  <span className="tiny fw-600" style={{ color: "var(--text-2)" }}>
                    {LABEL_STATUS[s]}
                  </span>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: meta.bg,
                      color: meta.color,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={meta.icon} size={15} />
                  </span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>
                  {angka(jumlahPerStatus[s] ?? 0)}
                </div>
                <span className="tiny text-2">
                  {aktif ? "Filter aktif · klik untuk batal" : "Klik untuk saring"}
                </span>
              </button>
            );
          })}
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

        <div className="input-icon mt-12">
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Cari rujukan (nama, indikator, status)…"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>

        {tampilLoading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={muat} />
        ) : tampil.length === 0 && cari ? (
          <EmptyState
            title="Rujukan tidak ditemukan"
            desc={`Tidak ada rujukan yang cocok dengan “${cari}”.`}
          />
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
                  <div className="tiny">
                    {r.otomatis ? "Rujukan otomatis sistem" : "Rujukan manual"}
                    {r.indikator ? ` · ${r.indikator}` : ""}
                  </div>
                  <div className="tiny text-2">Dibuat: {tanggal(r.created_at, "short")}</div>
                </div>
                <div className="row gap-8" style={{ alignItems: "center" }}>
                  <Badge tone={TONE_STATUS[r.status]}>{LABEL_STATUS[r.status]}</Badge>
                  {opsiLanjut(r.status).length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => bukaModalStatus(r)}
                    >
                      Ubah
                    </button>
                  ) : null}
                </div>
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
              <strong>Selesai</strong>
              <span className="tiny">Sudah ditindaklanjuti</span>
            </div>
            <strong>{angka(jumlahPerStatus.selesai ?? 0)}</strong>
          </div>
          <div className="li">
            <div className="li-main">
              <strong>Persentase Selesai</strong>
              <span className="tiny">Dari total rujukan</span>
            </div>
            <strong>
              {daftar.length
                ? Math.round(((jumlahPerStatus.selesai ?? 0) / daftar.length) * 100)
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

      <Modal
        open={ubahItem !== null}
        onClose={() => setUbahItem(null)}
        title="Ubah Status Rujukan"
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button type="button" className="btn btn-outline" onClick={() => setUbahItem(null)}>
              Batal
            </button>
            <Button onClick={simpanStatus} loading={menyimpan}>
              Simpan Status
            </Button>
          </div>
        }
      >
        {ubahItem ? (
          <>
            <p className="tiny mb-12">{ubahItem.faskes?.nama || "Faskes"}</p>
            <div>
              <label className="label" htmlFor="kel-status-baru">
                Status baru
              </label>
              <select
                id="kel-status-baru"
                className="select"
                value={statusBaru}
                onChange={(e) => setStatusBaru(e.target.value as StatusRujukan)}
              >
                {opsiLanjut(ubahItem.status).map((s) => (
                  <option key={s} value={s}>
                    {LABEL_STATUS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-12">
              <label className="label" htmlFor="kel-status-catatan">
                Catatan {statusBaru === "ditolak" ? "(wajib saat menolak)" : "(opsional)"}
              </label>
              <textarea
                id="kel-status-catatan"
                className="input"
                rows={3}
                maxLength={500}
                placeholder="Tambahkan catatan tindak lanjut…"
                value={catatanStatus}
                onChange={(e) => setCatatanStatus(e.target.value)}
              />
            </div>
            {ubahErr ? <div className="err-msg show mt-8">{ubahErr}</div> : null}
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}
