"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import TombolKembaliAdmin from "@/components/admin/TombolKembaliAdmin";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import { EmptyState, Loading } from "@/components/ui/Empty";
import { tanggal } from "@/lib/format";
import { admin as adminApi, ApiError } from "@/lib/api";
import { useMinLoading } from "@/hooks/useMinLoading";
import type { LogAudit } from "@/types";

const AKSI_META: Record<string, { label: string; tone: "safe" | "info" | "warning" | "danger" }> = {
  baca_data_individu: { label: "Baca Data", tone: "info" },
  ubah_data_individu: { label: "Ubah Data", tone: "warning" },
  verifikasi_setujui_catatan: { label: "Setujui Catatan", tone: "safe" },
  verifikasi_tolak_catatan: { label: "Tolak Catatan", tone: "danger" },
  ubah_status_rujukan: { label: "Ubah Rujukan", tone: "warning" },
};

const FILTER_AKSI = [
  { value: "semua", label: "Semua" },
  { value: "baca_data_individu", label: "Baca Data" },
  { value: "ubah_data_individu", label: "Ubah Data" },
  { value: "verifikasi", label: "Verifikasi" },
  { value: "ubah_status_rujukan", label: "Rujukan" },
];

export default function AdminLogAuditPage() {
  const [daftar, setDaftar] = useState<LogAudit[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string>("");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.logAudit.listPaged({
        page,
        per_page: 20,
        aksi: filter !== "semua" ? filter : undefined,
        search: cari.trim() || undefined,
      });
      setDaftar(res.data);
      setMeta(res.meta);
      setError("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Gagal muat log";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, filter, cari]);

  useEffect(() => {
    const t = setTimeout(() => {
      muat();
    }, 250);
    return () => clearTimeout(t);
  }, [muat]);

  const hitungAksi = (prefix: string) => daftar.filter((l) => l.aksi.includes(prefix)).length;

  return (
    <AppShell noFab roles={["super_admin"]}>
      <TombolKembaliAdmin />
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Log Audit</h1>
          <p className="tiny">Riwayat aktivitas sistem & akses data individu.</p>
        </div>
      </div>

      {error && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="row gap-10 items-center">
            <span className="text-danger">
              <Icon name="alert-circle" size={18} />
            </span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <>
        <div className="summary-strip mb-12">
          <span className="summary-strip-item">
            Total Log: <strong>{meta?.total ?? daftar.length}</strong>
          </span>
          <span className="summary-strip-item">
            Baca Data: <strong>{hitungAksi("baca_")}</strong>
          </span>
          <span className="summary-strip-item">
            Ubah/Rujukan: <strong>{hitungAksi("ubah_")}</strong>
          </span>
          <span className="summary-strip-item">
            Verifikasi: <strong>{hitungAksi("verifikasi_")}</strong>
          </span>
        </div>

        <div className="segment mb-12">
          {FILTER_AKSI.map((f) => (
            <button
              key={f.value}
              type="button"
              className={filter === f.value ? "active" : undefined}
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="input-icon mb-12">
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Cari log (aksi atau model)…"
            value={cari}
            onChange={(e) => {
              setCari(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {tampilLoading ? (
          <div className="mt-12">
            <Loading variant="list" text="Memuat log audit…" />
          </div>
        ) : daftar.length === 0 ? (
          <div className="mt-12">
            <EmptyState icon="shield" title="Tidak ada log" desc="Tidak ada aktivitas dengan filter ini." />
          </div>
        ) : (
          <div className="card card-list mt-12">
            {daftar.map((log) => {
              const info = AKSI_META[log.aksi];
              return (
                <div className="li" key={log.id} style={{ alignItems: "flex-start" }}>
                  <span className="li-ico">
                    <Icon name="file-text" size={18} />
                  </span>
                  <div className="li-main">
                    <div className="row-between wrap gap-8">
                      <strong className="text-sm">{log.model}</strong>
                      <Badge tone={info?.tone || "default"}>{info?.label || log.aksi}</Badge>
                    </div>
                    <p className="tiny mt-4">
                      Aksi: {log.aksi} · User: {log.pengguna?.name || log.user_id}
                      {log.model_id != null ? ` · Model ID: ${log.model_id}` : ""}
                    </p>
                    <p className="tiny mt-2">
                      IP: {log.ip} · <Icon name="calendar" size={12} /> {tanggal(log.created_at, "day")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {meta ? (
          <div className="mt-12">
            <Pagination meta={meta} onPage={setPage} />
          </div>
        ) : null}

        <p className="tiny center mt-16 mb-16">
          <Icon name="info" size={13} /> Log mencatat akses super admin ke data individu & verifikasi.
        </p>
      </>
    </AppShell>
  );
}
