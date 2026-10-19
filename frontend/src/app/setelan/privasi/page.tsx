"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";

export default function SetelanPrivasiPage() {
  const [pref, setPref] = useState({
    profilPublik: false,
    bagiBadge: true,
    bagiInsight: false,
    analytics: true,
  });
  const [berhasil, setBerhasil] = useState(false);

  useEffect(() => {
    const simpan = localStorage.getItem("privacy_pref");
    if (simpan) {
      setPref(JSON.parse(simpan));
    }
  }, []);

  function ubah(key: keyof typeof pref, nilai: boolean) {
    setPref((prev) => ({ ...prev, [key]: nilai }));
  }

  function simpan(ev: React.FormEvent) {
    ev.preventDefault();
    localStorage.setItem("privacy_pref", JSON.stringify(pref));
    setBerhasil(true);
    setTimeout(() => setBerhasil(false), 3000);
  }

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Privasi</h1>
          <p className="tiny">Kelola data pribadi & sharing preferensi.</p>
        </div>
      </div>

      {berhasil && (
        <div className="card card-flat mb-12" style={{ borderLeft: "4px solid var(--safe)" }}>
          <div className="row gap-10 items-center">
            <span className="text-safe">
              <Icon name="check-circle" size={18} />
            </span>
            <span className="text-sm">Pengaturan privasi tersimpan (demo).</span>
          </div>
        </div>
      )}

      <form onSubmit={simpan}>
        <div className="card">
          <div className="app-section-title mb-12">
            <h2>Visibilitas Profil</h2>
          </div>

          <Checkbox
            label={
              <div>
                <div className="text-sm fw-600">Profil Publik</div>
                <div className="tiny">Izinkan kader & tim kesehatan melihat profil kesehatan kamu.</div>
              </div>
            }
            checked={pref.profilPublik}
            onChange={(e) => ubah("profilPublik", e.target.checked)}
          />

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
            <div className="app-section-title mb-12">
              <h2>Sharing Data</h2>
            </div>

            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Bagikan Badge & Pencapaian</div>
                  <div className="tiny">Tampilkan badge program ke tim kesehatan.</div>
                </div>
              }
              checked={pref.bagiBadge}
              onChange={(e) => ubah("bagiBadge", e.target.checked)}
            />

            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Bagikan Insight Anonim</div>
                  <div className="tiny">Gunakan data untuk analisis kelurahan (tanpa nama).</div>
                </div>
              }
              checked={pref.bagiInsight}
              onChange={(e) => ubah("bagiInsight", e.target.checked)}
              className="mt-12"
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
            <div className="app-section-title mb-12">
              <h2>Analitik & Tracking</h2>
            </div>

            <Checkbox
              label={
                <div>
                  <div className="text-sm fw-600">Analytics</div>
                  <div className="tiny">Bantu kami improve app dengan data usage (anonymous).</div>
                </div>
              }
              checked={pref.analytics}
              onChange={(e) => ubah("analytics", e.target.checked)}
            />
          </div>

          <div className="mt-16">
            <Button type="submit" icon="check">
              Simpan Pengaturan Privasi
            </Button>
          </div>
        </div>
      </form>

      <div className="card mt-16">
        <div className="app-section-title mb-12">
          <h2>Data Personal</h2>
        </div>

        <p className="text-sm mb-12">
          Download atau hapus semua data pribadi kamu dari server sehatkita.
        </p>

        <div className="row gap-8">
          <Button type="button" variant="outline" icon="download">
            Download Data
          </Button>
          <Button type="button" variant="danger" icon="trash-2">
            Hapus Akun
          </Button>
        </div>
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="info" size={13} /> Kebijakan privasi penuh ada di situs sehatkita.
      </p>
    </AppShell>
  );
}
