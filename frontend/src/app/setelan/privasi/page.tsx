"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import { profil as profilApi, persetujuan as consentApi, ApiError } from "@/lib/api";
import { useUser, refreshUser } from "@/hooks/useUser";
import type { Profil } from "@/types";

/**
 * Privasi — hanya field yang benar-benar ada di kontrak:
 *  - `tampil_di_peringkat` (§5.2, PUT /profil)
 *  - tarik/beri persetujuan data (§5.3/§5.4, POST & DELETE /persetujuan)
 * Tidak ada endpoint notifikasi/analytics/download data di kontrak,
 * jadi tidak ditampilkan (§20: notifikasi ditunda).
 */
export default function SetelanPrivasiPage() {
  const { user } = useUser();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [tampil, setTampil] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simpan, setSimpan] = useState(false);
  const [pesan, setPesan] = useState<{ tone: "ok" | "err"; teks: string } | null>(null);

  useEffect(() => {
    let batal = false;
    profilApi
      .get()
      .then((p) => {
        if (batal) return;
        setProfil(p);
        setTampil(p.tampil_di_peringkat);
      })
      .catch((err) => {
        if (!batal) setPesan({ tone: "err", teks: (err as ApiError).message });
      })
      .finally(() => {
        if (!batal) setLoading(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  async function simpanPreferensi() {
    if (!profil || !profil.profil_lengkap) {
      setPesan({
        tone: "err",
        teks: "Lengkapi profil dulu di menu Profil — PUT /profil wajib mengirim seluruh field (§5.2).",
      });
      return;
    }
    try {
      setSimpan(true);
      const p = await profilApi.update({
        tgl_lahir: profil.tgl_lahir as string,
        jenis_kelamin: profil.jenis_kelamin as string,
        tinggi_cm: profil.tinggi_cm as number,
        tingkat_aktivitas: profil.tingkat_aktivitas as string,
        merokok: Boolean(profil.merokok),
        riwayat_keluarga: profil.riwayat_keluarga,
        tampil_di_peringkat: tampil,
      });
      setProfil(p);
      setPesan({ tone: "ok", teks: "Preferensi privasi tersimpan." });
    } catch (err) {
      setPesan({ tone: "err", teks: (err as ApiError).message });
    } finally {
      setSimpan(false);
    }
  }

  async function tarikIzin() {
    if (!window.confirm("Tarik persetujuan? Kamu tidak bisa mencatat kesehatan baru sampai memberi izin lagi.")) {
      return;
    }
    try {
      await consentApi.tarik();
      await refreshUser();
      setPesan({ tone: "ok", teks: "Persetujuan dicabut. Data lama tetap tersimpan untuk audit." });
    } catch (err) {
      setPesan({ tone: "err", teks: (err as ApiError).message });
    }
  }

  async function beriIzin() {
    try {
      await consentApi.setuju("1.0");
      await refreshUser();
      setPesan({ tone: "ok", teks: "Persetujuan diberikan." });
    } catch (err) {
      setPesan({ tone: "err", teks: (err as ApiError).message });
    }
  }

  const consentAktif = Boolean(user?.consent_at);

  return (
    <AppShell noFab>
      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Privasi</h1>
          <p className="tiny">Kelola visibilitas nama di peringkat dan persetujuan data.</p>
        </div>
      </div>

      {pesan && (
        <div
          className="card card-flat mb-12"
          style={{ borderLeft: `4px solid var(--${pesan.tone === "ok" ? "safe" : "danger"})` }}
        >
          <div className="row gap-10 items-center">
            <span className={pesan.tone === "ok" ? "text-safe" : "text-danger"}>
              <Icon name={pesan.tone === "ok" ? "check-circle" : "alert-circle"} size={18} />
            </span>
            <span className="text-sm">{pesan.teks}</span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="app-section-title mb-12">
          <h2>Peringkat Kelurahan</h2>
        </div>

        <Checkbox
          label={
            <div>
              <div className="text-sm fw-600">Tampilkan nama saya di peringkat</div>
              <div className="tiny">
                Bila dimatikan, kamu tetap ikut peringkat tetapi tampil sebagai &quot;Peserta anonim&quot;.
              </div>
            </div>
          }
          checked={tampil}
          disabled={loading}
          onChange={(e) => setTampil(e.target.checked)}
        />

        <div className="mt-16">
          <Button type="button" icon="check" onClick={simpanPreferensi} disabled={loading || simpan}>
            {simpan ? "Menyimpan…" : "Simpan Preferensi"}
          </Button>
        </div>
      </div>

      <div className="card mt-16">
        <div className="app-section-title mb-12">
          <h2>Persetujuan Data</h2>
        </div>

        <p className="text-sm mb-12">
          Tanpa persetujuan, kamu tidak bisa mencatat kesehatan baru dan data kamu dikeluarkan dari agregat
          kelurahan. Data lama tetap tersimpan untuk audit.
        </p>

        <div className="row gap-8">
          {consentAktif ? (
            <Button type="button" variant="danger" icon="x" onClick={tarikIzin}>
              Tarik Persetujuan
            </Button>
          ) : (
            <Button type="button" icon="check" onClick={beriIzin}>
              Beri Persetujuan
            </Button>
          )}
        </div>
      </div>

      <p className="tiny center mt-16 mb-16">
        <Icon name="lock" size={13} /> Data kesehatan hanya bisa dibuka pemilik akun, kader pembina, dan super admin
        (dengan log audit).
      </p>
    </AppShell>
  );
}
