"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import CatatModal from "@/components/catatan/CatatModal";
import { EmptyState } from "@/components/ui/Empty";
import { getUserSimulasi } from "@/lib/session";
import { CATATAN_DEMO, hariLalu } from "@/lib/demo";
import { tanggal as fmtTanggal } from "@/lib/format";

/* ------------------------------------------------------------------
   Catatan Kesehatan — riwayat pengukuran. Form catat memakai
   CatatModal (porting catatan-form.js): tanda wajib (*) & angka saja.
   ------------------------------------------------------------------ */

const langgananKosong = () => () => {};

function useSudahDiBrowser(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

const LABEL_SUMBER_LOKAL: Record<string, string> = {
  mandiri: "Mandiri",
  posbindu: "Posbindu / Kader",
  faskes: "Fasilitas Kesehatan",
};

function tampil(nilai: number | null | undefined, satuan = ""): string {
  if (nilai === null || nilai === undefined) return "—";
  return `${nilai}${satuan}`;
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tiny">{label}</div>
      <div className="text-sm fw-600">{value}</div>
    </div>
  );
}

export default function CatatanKesehatanPage() {
  const router = useRouter();
  const diBrowser = useSudahDiBrowser();
  const [formTerbuka, setFormTerbuka] = useState(false);

  const email = diBrowser ? getUserSimulasi() : "";
  // §26 — setelah login langsung boleh masuk dashboard; mengisi data diri TIDAK wajib.
  const bolehMasuk = email !== "";

  useEffect(() => {
    if (!diBrowser) return;
    if (email === "") {
      router.replace("/login");
    }
  }, [diBrowser, email, router]);

  if (!bolehMasuk) {
    return (
      <AppShell noFab>
        <p className="tiny center">Memuat…</p>
      </AppShell>
    );
  }

  return (
    <AppShell onFab={() => setFormTerbuka(true)}>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Catatan Kesehatan</h1>
          <p className="tiny">Riwayat pengukuran kamu.</p>
        </div>
        <button className="btn btn-sm btn-primary" type="button" onClick={() => setFormTerbuka(true)}>
          <Icon name="plus" size={15} /> Catat
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {CATATAN_DEMO.length === 0 ? (
          <div className="card card-flat">
            <EmptyState title="Belum ada catatan" desc="Catat pengukuran pertamamu dengan tombol di bawah." />
          </div>
        ) : (
          [...CATATAN_DEMO].reverse().map((c) => (
            <div className="card card-flat" key={c.id}>
              <div className="row-between mb-12">
                <strong className="text-sm">{fmtTanggal(hariLalu(c.hari_lalu), "day")}</strong>
                <span className="badge badge-primary">
                  <Icon name="clipboard" size={12} /> {LABEL_SUMBER_LOKAL[c.sumber] ?? c.sumber}
                </span>
              </div>

              <div className="grid grid-3" style={{ gap: 12 }}>
                <Baris label="Berat badan" value={tampil(c.bb_kg, " kg")} />
                <Baris label="Tekanan darah" value={`${c.sistol}/${c.diastol} mmHg`} />
                <Baris label="Gula darah" value={tampil(c.gula_darah, " mg/dL")} />
                <Baris label="Kolesterol" value={tampil(c.kolesterol, " mg/dL")} />
                <Baris label="Asam urat" value={tampil(c.asam_urat, " mg/dL")} />
                <Baris label="Lingkar perut" value={tampil(c.lingkar_perut, " cm")} />
                <Baris label="Jam tidur" value={tampil(c.tidur_jam, " jam")} />
                <Baris label="Merokok" value={c.merokok ? "Ya" : "Tidak"} />
              </div>
            </div>
          ))
        )}
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Data sementara (demo) — nanti tersambung ke API asli.
      </p>

      <CatatModal open={formTerbuka} onClose={() => setFormTerbuka(false)} />
    </AppShell>
  );
}
