"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Segmented from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Empty";
import { NOTIFIKASI_DEMO } from "@/lib/demo";
import { relatif } from "@/lib/format";

const FILTER = [
  { value: "semua", label: "Semua" },
  { value: "belum", label: "Belum dibaca" },
  { value: "rujukan", label: "Rujukan" },
  { value: "insight", label: "Insight" },
];

const IKON: Record<string, string> = {
  rujukan: "send",
  insight: "alert-triangle",
  jadwal: "calendar-check",
  reward: "award",
  sistem: "info",
};

export default function NotifikasiPage() {
  const [filter, setFilter] = useState("semua");
  const [dibaca, setDibaca] = useState<number[]>(
    NOTIFIKASI_DEMO.filter((n) => n.dibaca).map((n) => n.id)
  );

  const daftar = useMemo(() => {
    if (filter === "belum") return NOTIFIKASI_DEMO.filter((n) => !dibaca.includes(n.id));
    if (filter === "semua") return NOTIFIKASI_DEMO;
    return NOTIFIKASI_DEMO.filter((n) => n.tipe === filter);
  }, [filter, dibaca]);

  const belumDibaca = NOTIFIKASI_DEMO.filter((n) => !dibaca.includes(n.id)).length;

  return (
    <AppShell noFab unread={belumDibaca}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Notifikasi</h1>
          <p className="tiny">
            {belumDibaca > 0 ? `${belumDibaca} notifikasi belum dibaca.` : "Semua notifikasi sudah dibaca."}
          </p>
        </div>
        {belumDibaca > 0 ? (
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setDibaca(NOTIFIKASI_DEMO.map((n) => n.id))}
          >
            <Icon name="check" size={15} /> Tandai dibaca
          </button>
        ) : null}
      </div>

      <Segmented items={FILTER} value={filter} onChange={setFilter} />

      <div className="card mt-12">
        {daftar.length === 0 ? (
          <EmptyState title="Tidak ada notifikasi" desc="Notifikasi baru akan muncul di sini." />
        ) : (
          daftar.map((n) => {
            const sudah = dibaca.includes(n.id);
            return (
              <button
                key={n.id}
                type="button"
                className="li"
                style={{ width: "100%", textAlign: "left", background: sudah ? "transparent" : "var(--primary-050)" }}
                onClick={() => setDibaca((d) => (d.includes(n.id) ? d : [...d, n.id]))}
              >
                <span className="li-ico">
                  <Icon name={IKON[n.tipe] || "bell"} size={18} />
                </span>
                <div className="li-main">
                  <strong>
                    {n.judul}
                    {!sudah ? (
                      <span
                        style={{
                          display: "inline-block",
                          width: 7,
                          height: 7,
                          borderRadius: 99,
                          background: "var(--primary)",
                          marginLeft: 6,
                        }}
                      />
                    ) : null}
                  </strong>
                  <span>{n.pesan}</span>
                </div>
                <div className="li-side">
                  <span className="tiny">{relatif(n.dibuat_pada)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
