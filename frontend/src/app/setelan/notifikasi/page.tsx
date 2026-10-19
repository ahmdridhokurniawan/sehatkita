"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";

export default function SetelanNotifikasiPage() {
  const [pref, setPref] = useState({
    rujukan: true,
    insight: true,
    jadwal: true,
    reward: true,
    sistem: true,
    email: false,
  });
  const [berhasil, setBerhasil] = useState(false);

  useEffect(() => {
    // Load dari localStorage (demo)
    const simpan = localStorage.getItem("notif_pref");
    if (simpan) {
      setPref(JSON.parse(simpan));
    }
  }, []);

  function ubah(key: keyof typeof pref, nilai: boolean) {
    setPref((prev) => ({ ...prev, [key]: nilai }));
  }

  function simpan(ev: React.FormEvent) {
    ev.preventDefault();
    localStorage.setItem("notif_pref", JSON.stringify(pref));
    setBerhasil(true);
    setTimeout(() => setBerhasil(false), 3000);
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Pengaturan Notifikasi</h1>
          <p className="tiny">Pilih jenis notifikasi yang ingin kamu terima.</p>
        </div>
      </div>

      {berhasil && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--safe)" }}>
          <div className="row gap-10 items-center">
            <span className="text-safe">
              <Icon name="check-circle" size={18} />
            </span>
            <span className="text-sm">Pengaturan tersimpan (demo).</span>
          </div>
        </div>
      )}

      <form onSubmit={simpan}>
        <div className="card">
          <div className="app-section-title mb-12">
            <h2>Notifikasi Aplikasi</h2>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Rujukan</div>
                  <div className="tiny">Notifikasi rujukan medis baru.</div>
                </div>
              }
              checked={pref.rujukan}
              onChange={(e) => ubah("rujukan", e.target.checked)}
            />
            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Insight</div>
                  <div className="tiny">Peringatan kesehatan dan analisis.</div>
                </div>
              }
              checked={pref.insight}
              onChange={(e) => ubah("insight", e.target.checked)}
            />
            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Jadwal Program</div>
                  <div className="tiny">Notifikasi program kesehatan yang akan datang.</div>
                </div>
              }
              checked={pref.jadwal}
              onChange={(e) => ubah("jadwal", e.target.checked)}
            />
            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Reward</div>
                  <div className="tiny">Badge & reward dari program kesehatan.</div>
                </div>
              }
              checked={pref.reward}
              onChange={(e) => ubah("reward", e.target.checked)}
            />
            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Sistem</div>
                  <div className="tiny">Notifikasi sistem & maintenance.</div>
                </div>
              }
              checked={pref.sistem}
              onChange={(e) => ubah("sistem", e.target.checked)}
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
            <div className="app-section-title mb-12">
              <h2>Email</h2>
            </div>
            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Notifikasi Email</div>
                  <div className="tiny">Terima ringkasan notifikasi penting via email.</div>
                </div>
              }
              checked={pref.email}
              onChange={(e) => ubah("email", e.target.checked)}
            />
          </div>

          <div className="mt-16">
            <Button type="submit" icon="check">
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </form>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Pengaturan disimpan di browser (demo).
      </p>
    </AppShell>
  );
}
