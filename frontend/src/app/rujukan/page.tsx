"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Segmented from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Empty";
import { RUJUKAN_DEMO } from "@/lib/demo";
import { LABEL_STATUS_RUJUKAN } from "@/lib/labels";
import { tanggal } from "@/lib/format";
import type { StatusRujukan } from "@/lib/enums";

/* ------------------------------------------------------------------
   Rujukan — halaman masyarakat. Daftar rujukan ke fasilitas kesehatan
   dengan filter status + ringkasan jumlah per status.
   ------------------------------------------------------------------ */

type Tone = "info" | "peringatan" | "sukses" | "bahaya";

const TONE_STATUS: Record<StatusRujukan, Tone> = {
  baru: "info",
  dihubungi: "peringatan",
  tertangani: "sukses",
  ditolak: "bahaya",
};

const URUTAN_STATUS: StatusRujukan[] = ["baru", "dihubungi", "tertangani", "ditolak"];

const FILTER = [
  { value: "semua", label: "Semua" },
  ...URUTAN_STATUS.map((s) => ({ value: s, label: LABEL_STATUS_RUJUKAN[s] })),
];

export default function RujukanPage() {
  const [filter, setFilter] = useState("semua");

  const daftar = useMemo(
    () => (filter === "semua" ? RUJUKAN_DEMO : RUJUKAN_DEMO.filter((r) => r.status === filter)),
    [filter]
  );

  const hitung = (s: StatusRujukan) => RUJUKAN_DEMO.filter((r) => r.status === s).length;

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Rujukan</h1>
          <p className="tiny">Daftar rujukan ke fasilitas kesehatan.</p>
        </div>
      </div>

      <div className="grid grid-4 mb-12" style={{ gap: 10 }}>
        {URUTAN_STATUS.map((s) => (
          <div className="metric" key={s} style={{ alignItems: "center" }}>
            <span className="metric-val">{hitung(s)}</span>
            <span className="tiny">{LABEL_STATUS_RUJUKAN[s]}</span>
          </div>
        ))}
      </div>

      <Segmented items={FILTER} value={filter} onChange={setFilter} />

      <div className="mt-12" style={{ display: "grid", gap: 12 }}>
        {daftar.length === 0 ? (
          <div className="card card-flat">
            <EmptyState title="Tidak ada rujukan" desc="Tidak ada rujukan dengan status ini." />
          </div>
        ) : (
          daftar.map((r) => (
            <div className="card card-flat" key={r.id}>
              <div className="row items-start gap-10">
                <span className="li-ico">
                  <Icon name="send" size={18} />
                </span>
                <div className="flex-1">
                  <div className="row-between">
                    <strong className="text-sm">{r.faskes}</strong>
                    <Badge tone={TONE_STATUS[r.status]}>{LABEL_STATUS_RUJUKAN[r.status]}</Badge>
                  </div>
                  <p className="tiny mt-4">{r.alasan}</p>
                  <p className="tiny mt-4">
                    <Icon name="calendar" size={12} /> Dibuat {tanggal(r.dibuat_pada, "day")}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Data sementara (demo) — nanti diambil dari GET /rujukan.
      </p>
    </AppShell>
  );
}
