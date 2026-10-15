"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Empty";
import { PROGRAM_DEMO, DASHBOARD_PRIBADI_DEMO } from "@/lib/demo";

/* ------------------------------------------------------------------
   Program & Tantangan — halaman masyarakat.
   Porting gaya "Tantangan & Reward" dari prototype (gamifikasi:
   level, EXP, badge, peringkat kelurahan).
   ------------------------------------------------------------------ */

const LABEL_JENIS: Record<string, string> = {
  olahraga: "Olahraga",
  edukasi: "Edukasi",
  penyuluhan: "Penyuluhan",
};

const LABEL_STATUS: Record<string, string> = {
  berjalan: "Berjalan",
  akan_datang: "Akan Datang",
  selesai: "Selesai",
};

const TONE_STATUS: Record<string, "info" | "warning" | "safe"> = {
  berjalan: "warning",
  akan_datang: "info",
  selesai: "safe",
};

const FILTER = [
  { value: "semua", label: "Semua" },
  { value: "berjalan", label: "Berjalan" },
  { value: "akan_datang", label: "Akan Datang" },
  { value: "selesai", label: "Selesai" },
];

export default function ProgramPage() {
  const [filter, setFilter] = useState("semua");
  const [cari, setCari] = useState("");
  const reward = DASHBOARD_PRIBADI_DEMO.reward;

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return PROGRAM_DEMO.filter((p) => {
      const cocokStatus = filter === "semua" || p.status === filter;
      const cocokCari =
        q === "" ||
        p.nama.toLowerCase().includes(q) ||
        p.deskripsi.toLowerCase().includes(q);
      return cocokStatus && cocokCari;
    });
  }, [filter, cari]);

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Tantangan &amp; Reward</h1>
          <p className="tiny">Ikuti tantangan kesehatan wilayahmu, kumpulkan EXP &amp; badge.</p>
        </div>
      </div>

      {/* Kartu gamifikasi */}
      <div className="card mb-16">
        <div className="row gap-10">
          <span className="li-ico" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
            <Icon name="flame" size={18} />
          </span>
          <div className="flex-1">
            <strong className="text-sm">
              Level {reward.level} · {reward.level_nama}
            </strong>
            <div className="tiny">
              {reward.exp} EXP · peringkat #{reward.rank_kelurahan} dari {reward.total_peserta_kelurahan}{" "}
              peserta kelurahan
            </div>
          </div>
        </div>
        <div className="progress sm mt-12">
          <i style={{ width: `${Math.min(100, (reward.exp % 200) / 2)}%` }} />
        </div>
        <div className="row gap-6 mt-12" style={{ flexWrap: "wrap" }}>
          {reward.badge.length > 0 ? (
            reward.badge.map((b) => (
              <span className="badge badge-primary" key={b}>
                <Icon name="award" size={13} /> {b}
              </span>
            ))
          ) : (
            <span className="tiny">Belum ada badge</span>
          )}
        </div>
      </div>

      <Segmented items={FILTER} value={filter} onChange={setFilter} />

      <div className="input-icon mt-12">
        <Icon name="search" size={18} />
        <input
          className="input"
          type="search"
          placeholder="Cari tantangan…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      <div className="mt-12" style={{ display: "grid", gap: 12 }}>
        {daftar.length === 0 ? (
          <div className="card card-flat">
            <EmptyState title="Tidak ada tantangan" desc="Tidak ada tantangan dengan status ini." />
          </div>
        ) : (
          daftar.map((p) => (
            <div className="card card-flat" key={p.id}>
              <div className="row-between mb-8">
                <strong className="text-sm">{p.nama}</strong>
                <Badge tone={TONE_STATUS[p.status]}>{LABEL_STATUS[p.status]}</Badge>
              </div>
              <p className="tiny">{p.deskripsi}</p>

              <div className="row gap-16 mt-12" style={{ flexWrap: "wrap" }}>
                <div className="row gap-6">
                  <Icon name="activity" size={13} />
                  <span className="tiny">{LABEL_JENIS[p.jenis] ?? p.jenis}</span>
                </div>
                <div className="row gap-6">
                  <Icon name="clock" size={13} />
                  <span className="tiny">{p.durasi}</span>
                </div>
                <div className="row gap-6">
                  <Icon name="user" size={13} />
                  <span className="tiny">{p.peserta} peserta</span>
                </div>
              </div>

              <div className="row-between mt-12">
                <span className="tiny">Progres</span>
                <span className="tiny">
                  <b className="text-primary">{p.progress}%</b>
                </span>
              </div>
              <div className="progress sm mt-4">
                <i style={{ width: `${Math.min(100, p.progress)}%` }} />
              </div>

              <div className="row-between mt-12 items-center">
                <span className="badge badge-primary">
                  <Icon name="award" size={12} /> {p.reward?.badge ?? "Badge"} · +{p.reward?.exp ?? 0} EXP
                </span>
                <button className="btn btn-sm btn-primary" type="button">
                  {p.progress > 0 ? "Lanjutkan" : "Ikuti"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Data sementara (demo) — nanti diambil dari GET /program.
      </p>
    </AppShell>
  );
}
