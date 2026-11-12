import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import { LABEL_INDIKATOR } from "@/lib/labels";
import type { JadwalSkrining } from "@/types";

function bulanLengkap(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function tambahBulan(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function formatTanggal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function KalenderJadwal({ jadwal }: { jadwal: JadwalSkrining[] }) {
  const [bulan, setBulan] = useState(() => bulanLengkap(new Date()));

  const perTanggal = useMemo(() => {
    const m = new Map<string, JadwalSkrining[]>();
    for (const j of jadwal) {
      const k = formatTanggal(new Date(j.jatuh_tempo));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(j);
    }
    return m;
  }, [jadwal]);

  const start = bulanLengkap(bulan);
  const awalIdx = start.getDay(); // 0=Min
  const jmlHari = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const now = new Date();
  const hariIni = formatTanggal(now);
  const nowBulan = now.getMonth() === start.getMonth() && now.getFullYear() === start.getFullYear();

  const sel: (number | null)[] = [];
  for (let i = 0; i < awalIdx; i++) sel.push(null);
  for (let d = 1; d <= jmlHari; d++) sel.push(d);

  return (
    <div className="card mt-12">
      <div className="row-between mb-8">
        <button type="button" className="btn btn-icon btn-sm btn-ghost kalender-nav-btn" onClick={() => setBulan(tambahBulan(bulan, -1))} aria-label="Sebelumnya">
          <Icon name="chevron-left" size={16} />
        </button>
        <strong className="text-sm">
          {NAMA_BULAN[start.getMonth()]} {start.getFullYear()}
        </strong>
        <button type="button" className="btn btn-icon btn-sm btn-ghost kalender-nav-btn" onClick={() => setBulan(tambahBulan(bulan, 1))} aria-label="Berikutnya">
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      <div className="kalender-grid" role="grid">
        {NAMA_HARI.map((h) => (
          <div key={h} className="kalender-hari-head">
            {h}
          </div>
        ))}
        {sel.map((d, i) => {
          if (d === null) return <div key={`k${i}`} />;
          const k = formatTanggal(new Date(start.getFullYear(), start.getMonth(), d));
          const items = perTanggal.get(k) ?? null;
          const aktif = nowBulan && k === hariIni;
          return (
            <div key={k} className={`kalender-hari ${aktif ? "aktif" : ""} ${items ? "ada" : ""}`}>
              <span className="kalender-tgl">{d}</span>
              {items && (
                <div className="kalender-dot">
                  {items.map((it, idx) => (
                    <Badge
                      key={idx}
                      tone={it.status === "akan_datang" ? "warning" : "danger"}
                      className="dot"
                    >
                      {LABEL_INDIKATOR[it.indikator] || ""}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {perTanggal.size > 0 && (
        <div className="mt-12">
          {[...perTanggal.entries()].slice(0, 3).map(([k, items]) => (
            <div key={k} className="li">
              <span className="li-ico"><Icon name="calendar-check" size={18} /></span>
              <div className="li-main">
                <strong className="text-sm">{k}</strong>
                {items.map((it, i) => (
                  <span key={i} className="tiny">
                    {LABEL_INDIKATOR?.[it.indikator] || it.indikator} —{" "}
                    {it.status === "akan_datang" ? "Akan datang" : "Terlambat"}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
