"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Empty";
import { admin as adminApi, ApiError } from "@/lib/api";
import type { Role } from "@/lib/enums";

const FILTER = [
  { value: "semua", label: "Semua" },
  { value: "user", label: "User" },
  { value: "kader", label: "Kader" },
  { value: "admin_kelurahan", label: "Admin Kelurahan" },
  { value: "super_admin", label: "Super Admin" },
];

const ROLE_BADGE: Record<Role, string> = {
  user: "muted",
  kader: "info",
  admin_kelurahan: "warning",
  super_admin: "danger",
};

const ROLE_LABEL: Record<Role, string> = {
  user: "User",
  kader: "Kader",
  admin_kelurahan: "Admin Kelurahan",
  super_admin: "Super Admin",
};

export default function AdminPenggunaPage() {
  const [filter, setFilter] = useState<string>("semua");
  const [cari, setCari] = useState("");
  const [daftar, setDaftar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch pengguna on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await adminApi.pengguna.list();
        setDaftar(res);
        setError("");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Gagal muat pengguna";
        setError(msg);
        console.error("Fetch pengguna:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return daftar.filter((p: any) => {
      const cocokRole = filter === "semua" || p.role === filter;
      const cocokCari =
        q === "" ||
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.wilayah?.nama?.toLowerCase().includes(q);
      return cocokRole && cocokCari;
    });
  }, [filter, cari, daftar]);

  return (
    <AppShell noFab roles={["super_admin"]}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Kelola Pengguna</h1>
          <p className="tiny">Daftar pengguna & manajemen role/wilayah.</p>
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
          <div className="metric mb-12">
            <span className="metric-val">{daftar.length}</span>
            <span className="tiny">Total Pengguna</span>
          </div>

          <Segmented items={FILTER} value={filter} onChange={setFilter} />

          <div className="input-icon mt-12">
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder="Cari pengguna…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>

          <div className="mt-12" style={{ display: "grid", gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="card card-flat">
                <EmptyState title="Tidak ada pengguna" desc="Tidak ada pengguna dengan filter ini." />
              </div>
            ) : (
              filtered.map((p: any) => (
                <div className="card card-flat" key={p.id}>
                  <div className="row items-start gap-10">
                    <span className="li-ico">
                      <Icon name="user" size={18} />
                    </span>
                    <div className="flex-1">
                      <div className="row-between">
                        <strong className="text-sm">{p.name}</strong>
                        <Badge tone={ROLE_BADGE[p.role as Role] as any}>{ROLE_LABEL[p.role as Role]}</Badge>
                      </div>
                      <p className="tiny mt-4">{p.email}</p>
                      <p className="tiny mt-2">Wilayah: {p.wilayah?.nama || "—"}</p>
                      <p className="tiny mt-2">
                        <Icon name="calendar" size={12} /> Terdaftar {new Date(p.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="tiny center mt-16 mb-16">
            <Icon name="info" size={13} /> Ubah role atau wilayah lewat tombol di tiap baris.
          </p>
        </>
      )}
    </AppShell>
  );
}
