"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { tanggal } from "@/lib/format";
import { admin as adminApi, ApiError } from "@/lib/api";

const AKSI_BADGE: Record<string, string> = {
  create: "safe",
  read: "info",
  update: "warning",
  delete: "danger",
};

export default function AdminLogAuditPage() {
  const [daftar, setDaftar] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("semua");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch log-audit on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await adminApi.logAudit.list();
        setDaftar(res);
        setError("");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Gagal muat log";
        setError(msg);
        console.error("Fetch log:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "semua") return daftar;
    return daftar.filter((log: any) => log.aksi === filter);
  }, [filter, daftar]);

  const hitungAksi = (aksi: string) => daftar.filter((l: any) => l.aksi === aksi).length;

  return (
    <AppShell noFab roles={["super_admin"]}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Log Audit</h1>
          <p className="tiny">Riwayat aktivitas sistem & perubahan data.</p>
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

      {loading ? (
        <div className="card">
          <p className="tiny center">Memuat…</p>
        </div>
      ) : (
        <>
          <div className="grid grid-4 mb-12" style={{ gap: 10 }}>
            <div className="metric" style={{ alignItems: "center" }}>
              <span className="metric-val">{daftar.length}</span>
              <span className="tiny">Total</span>
            </div>
            <div className="metric" style={{ alignItems: "center" }}>
              <span className="metric-val">{hitungAksi("create")}</span>
              <span className="tiny">Create</span>
            </div>
            <div className="metric" style={{ alignItems: "center" }}>
              <span className="metric-val">{hitungAksi("update")}</span>
              <span className="tiny">Update</span>
            </div>
            <div className="metric" style={{ alignItems: "center" }}>
              <span className="metric-val">{hitungAksi("delete")}</span>
              <span className="tiny">Delete</span>
            </div>
          </div>

          <div className="segmented mb-12">
            <button
              className={`segmented-item ${filter === "semua" ? "active" : ""}`}
              onClick={() => setFilter("semua")}
            >
              Semua
            </button>
            <button
              className={`segmented-item ${filter === "create" ? "active" : ""}`}
              onClick={() => setFilter("create")}
            >
              Create
            </button>
            <button
              className={`segmented-item ${filter === "update" ? "active" : ""}`}
              onClick={() => setFilter("update")}
            >
              Update
            </button>
            <button
              className={`segmented-item ${filter === "delete" ? "active" : ""}`}
              onClick={() => setFilter("delete")}
            >
              Delete
            </button>
          </div>

          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="card card-flat">
                <EmptyState title="Tidak ada log" desc="Tidak ada aktivitas dengan filter ini." />
              </div>
            ) : (
              filtered.map((log: any) => (
                <div className="card card-flat" key={log.id}>
                  <div className="row items-start gap-10">
                    <span className="li-ico">
                      <Icon name="file-text" size={18} />
                    </span>
                    <div className="flex-1">
                      <div className="row-between">
                        <strong className="text-sm">{log.model}</strong>
                        <Badge tone={AKSI_BADGE[log.aksi] as any || "muted"}>{log.aksi}</Badge>
                      </div>
                      <p className="tiny mt-4">User: {log.pengguna?.name || log.user_id}</p>
                      <p className="tiny mt-2">Model ID: {log.model_id}</p>
                      <p className="tiny mt-2">IP: {log.ip}</p>
                      <p className="tiny mt-2">
                        <Icon name="calendar" size={12} /> {tanggal(log.created_at, "day")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Log mencatat akses super admin ke data individu.
          </p>
        </>
      )}
    </AppShell>
  );
}
