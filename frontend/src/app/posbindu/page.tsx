"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import { useUser } from "@/hooks/useUser";
import { angka, tanggal } from "@/lib/format";
import { posbindu as posbinduApi, ApiError } from "@/lib/api";
import type { KunjunganPosbindu, SesiPosbindu, SesiPosbinduDetail } from "@/types";

/* ------------------------------------------------------------------
   Posbindu — sesi pemeriksaan & kunjungan warga.
   kader / admin_kelurahan / super_admin: daftar sesi + buat sesi + peserta.
   masyarakat: riwayat kunjungan sendiri.
   ------------------------------------------------------------------ */

const ROLE_KELOLA = ["kader", "admin_kelurahan", "super_admin"];
// POST /posbindu/sesi hanya admin_kelurahan & super_admin (kader 403).
const ROLE_BUAT_SESI = ["admin_kelurahan", "super_admin"];

function statusSesi(tgl: string): { label: string; tone: "info" | "peringatan" | "sukses" } {
  const hariIni = new Date().toISOString().slice(0, 10);
  const t = (tgl || "").slice(0, 10);
  if (t > hariIni) return { label: "Akan datang", tone: "info" };
  if (t === hariIni) return { label: "Berlangsung", tone: "peringatan" };
  return { label: "Selesai", tone: "sukses" };
}

export default function PosbinduPage() {
  const { user, loading: loadingUser } = useUser();
  const bolehKelola = ROLE_KELOLA.includes(user?.role || "");
  const bolehBuatSesi = ROLE_BUAT_SESI.includes(user?.role || "");

  const [sesi, setSesi] = useState<SesiPosbindu[]>([]);
  const [cari, setCari] = useState("");
  const [kunjungan, setKunjungan] = useState<KunjunganPosbindu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- buat sesi ---
  const [buatOpen, setBuatOpen] = useState(false);
  const [fTanggal, setFTanggal] = useState("");
  const [fLokasi, setFLokasi] = useState("");
  const [fCatatan, setFCatatan] = useState("");
  const [fErr, setFErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // --- detail sesi + peserta ---
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SesiPosbinduDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [pUserId, setPUserId] = useState("");
  const [pHadir, setPHadir] = useState(true);
  const [pBb, setPBb] = useState("");
  const [pSistol, setPSistol] = useState("");
  const [pDiastol, setPDiastol] = useState("");
  const [pGula, setPGula] = useState("");
  const [pJenisGula, setPJenisGula] = useState("");
  const [pTinggi, setPTinggi] = useState("");
  const [pSaving, setPSaving] = useState(false);
  const [pErr, setPErr] = useState("");

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      if (bolehKelola) {
        setSesi(await posbinduApi.sesiList());
      } else {
        setKunjungan(await posbinduApi.kunjungan());
      }
      setError("");
    } catch (err) {
      const e = err as ApiError;
      setError(e.message || "Gagal memuat data Posbindu");
    } finally {
      setLoading(false);
    }
  }, [bolehKelola]);

  useEffect(() => {
    if (!loadingUser && user) muat();
  }, [loadingUser, user, muat]);

  async function bukaDetail(id: number) {
    setDetailId(id);
    setDetail(null);
    setDetailErr("");
    setDetailLoading(true);
    setPErr("");
    try {
      setDetail(await posbinduApi.sesiDetail(id));
    } catch (err) {
      const e = err as ApiError;
      setDetailErr(e.message || "Gagal memuat detail sesi");
    } finally {
      setDetailLoading(false);
    }
  }

  async function simpanSesi() {
    const e: Record<string, string> = {};
    if (!fTanggal) e.tanggal = "Tanggal wajib diisi.";
    if (!fLokasi.trim()) e.lokasi = "Lokasi wajib diisi.";
    setFErr(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await posbinduApi.sesiBuat({
        wilayah_id: user?.wilayah_id || 0,
        tanggal: fTanggal,
        lokasi: fLokasi.trim(),
        catatan: fCatatan.trim() || undefined,
      });
      setBuatOpen(false);
      setFTanggal("");
      setFLokasi("");
      setFCatatan("");
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.errors)) map[k] = v[0] ?? "Tidak valid";
        setFErr(map);
      }
      setPErr(apiErr.message || "Gagal membuat sesi");
    } finally {
      setSaving(false);
    }
  }

  async function tambahPeserta() {
    if (!detailId) return;
    setPErr("");
    const uid = Number(pUserId);
    if (!uid) {
      setPErr("Isi ID warga.");
      return;
    }

    const catatanKesehatan: Record<string, number | string> = {};
    if (pHadir) {
      if (pBb.trim()) catatanKesehatan.bb_kg = Number(pBb);
      if (pSistol.trim() && pDiastol.trim()) {
        catatanKesehatan.sistol = Number(pSistol);
        catatanKesehatan.diastol = Number(pDiastol);
      }
      if (pGula.trim()) {
        catatanKesehatan.gula_darah = Number(pGula);
        if (pJenisGula) catatanKesehatan.jenis_gula_darah = pJenisGula;
      }
      if (pTinggi.trim()) catatanKesehatan.tinggi_cm = Number(pTinggi);
    }

    setPSaving(true);
    try {
      await posbinduApi.tambahPeserta(detailId, {
        user_id: uid,
        hadir: pHadir,
        catatan_kesehatan:
          Object.keys(catatanKesehatan).length > 0
            ? (catatanKesehatan as never)
            : undefined,
      });
      setPUserId("");
      setPBb("");
      setPSistol("");
      setPDiastol("");
      setPGula("");
      setPJenisGula("");
      setPTinggi("");
      await bukaDetail(detailId);
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      setPErr(apiErr.message || "Gagal menambah peserta");
    } finally {
      setPSaving(false);
    }
  }

  if (loadingUser) {
    return (
      <AppShell noFab>
        <Loading />
      </AppShell>
    );
  }

  const sesiTersaring = (() => {
    const q = cari.trim().toLowerCase();
    if (!q) return sesi;
    return sesi.filter(
      (s) =>
        (s.lokasi ?? "").toLowerCase().includes(q) ||
        tanggal(s.tanggal).toLowerCase().includes(q) ||
        s.tanggal.toLowerCase().includes(q),
    );
  })();

  const kunjunganTersaring = (() => {
    const q = cari.trim().toLowerCase();
    if (!q) return kunjungan;
    return kunjungan.filter(
      (k) =>
        (k.lokasi ?? "").toLowerCase().includes(q) ||
        tanggal(k.tanggal).toLowerCase().includes(q) ||
        k.tanggal.toLowerCase().includes(q),
    );
  })();

  return (
    <AppShell noFab>
      <div className="row-between mb-16" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="h3">Posbindu</h1>
          <p className="tiny">Sesi pemeriksaan dan kunjungan warga.</p>
        </div>
        {bolehBuatSesi ? (
          <Button icon="plus" onClick={() => setBuatOpen(true)}>
            Sesi baru
          </Button>
        ) : null}
      </div>

      {loading ? <Loading /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {!loading && !error ? (
        <div className="input-icon mb-12">
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder="Cari sesi (tanggal atau lokasi)…"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>
      ) : null}

      {!loading && !error && bolehKelola ? (
        sesi.length === 0 ? (
          <EmptyState
            title="Belum ada sesi"
            desc={
              bolehBuatSesi
                ? "Buat sesi Posbindu pertama untuk wilayah Anda."
                : "Admin kelurahan belum membuat sesi Posbindu untuk wilayah Anda."
            }
          />
        ) : (
          <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
            {sesiTersaring.length === 0 ? (
              <div className="card card-flat">
                <EmptyState title="Sesi tidak ditemukan" desc={`Tidak ada sesi yang cocok dengan “${cari}”.`} />
              </div>
            ) : null}
            {sesiTersaring.map((s) => {
              const st = statusSesi(s.tanggal);
              return (
                <div className="card" key={s.id}>
                  <div className="row-between mb-8">
                    <strong className="text-sm">{tanggal(s.tanggal)}</strong>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <p className="tiny">
                    <Icon name="map-pin" size={12} /> {s.lokasi}
                  </p>
                  {s.catatan ? <p className="tiny mt-4">{s.catatan}</p> : null}
                  <div className="row-between mt-12">
                    <span className="tiny">
                      {angka(s.hadir)} / {angka(s.jumlah_peserta)} peserta hadir
                    </span>
                    <button className="btn btn-sm btn-outline" onClick={() => bukaDetail(s.id)} type="button">
                      Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {!loading && !error && !bolehKelola ? (
        kunjungan.length === 0 ? (
          <EmptyState title="Belum ada kunjungan" desc="Riwayat kunjungan Posbindu Anda akan tampil di sini." />
        ) : (
          <div className="grid mt-12" style={{ gap: 10 }}>
            {kunjunganTersaring.length === 0 ? (
              <div className="card card-flat">
                <EmptyState title="Kunjungan tidak ditemukan" desc={`Tidak ada yang cocok dengan “${cari}”.`} />
              </div>
            ) : null}
            {kunjunganTersaring.map((k) => (
              <div className="card" key={k.kunjungan_id}>
                <div className="row-between">
                  <div>
                    <strong className="text-sm">{tanggal(k.tanggal)}</strong>
                    <p className="tiny">
                      <Icon name="map-pin" size={12} /> {k.lokasi}
                    </p>
                  </div>
                  <Badge tone={k.hadir ? "sukses" : "peringatan"}>
                    {k.hadir ? "Hadir" : "Tidak hadir"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* Modal buat sesi */}
      <Modal
        open={buatOpen}
        onClose={() => setBuatOpen(false)}
        title="Sesi Posbindu Baru"
        footer={
          <div className="row-between" style={{ width: "100%" }}>
            <button className="btn btn-outline" onClick={() => setBuatOpen(false)} type="button">
              Batal
            </button>
            <Button onClick={simpanSesi} loading={saving}>
              Simpan
            </Button>
          </div>
        }
      >
        <Input
          label="Tanggal"
          type="date"
          value={fTanggal}
          onChange={(e) => setFTanggal(e.target.value)}
          error={fErr.tanggal}
          required
        />
        <div className="mt-12">
          <Input
            label="Lokasi"
            placeholder="Balai kelurahan / posyandu"
            value={fLokasi}
            onChange={(e) => setFLokasi(e.target.value)}
            error={fErr.lokasi}
            required
          />
        </div>
        <div className="mt-12">
          <Input
            label="Catatan"
            optional
            placeholder="Pemeriksaan rutin bulanan"
            value={fCatatan}
            onChange={(e) => setFCatatan(e.target.value)}
          />
        </div>
        {pErr ? <div className="err-msg show mt-8">{pErr}</div> : null}
      </Modal>

      {/* Modal detail sesi */}
      <Modal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `Sesi ${tanggal(detail.tanggal)}` : "Detail Sesi"}
        size="lg"
      >
        {detailLoading ? <Loading text="Memuat peserta…" /> : null}
        {detailErr ? <ErrorState message={detailErr} /> : null}

        {detail ? (
          <>
            <p className="tiny">
              <Icon name="map-pin" size={12} /> {detail.lokasi} · {detail.hadir}/{detail.jumlah_peserta} hadir
            </p>

            <div className="mt-16">
              <strong className="text-sm">Peserta</strong>
              {detail.peserta.length === 0 ? (
                <p className="tiny mt-4">Belum ada peserta terdaftar.</p>
              ) : (
                <div className="mt-8" style={{ display: "grid", gap: 8 }}>
                  {detail.peserta.map((p) => (
                    <div className="row-between" key={p.kunjungan_id}>
                      <span className="text-sm">{p.name}</span>
                      <span className="row gap-8">
                        {p.dicatat ? <Badge tone="info">Tercatat</Badge> : null}
                        <Badge tone={p.hadir ? "sukses" : "peringatan"}>
                          {p.hadir ? "Hadir" : "Tidak hadir"}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="mt-16 mb-16" />

            <strong className="text-sm">Tambah peserta</strong>
            <p className="tiny mt-4">
              Masukkan ID warga binaan (belum ada endpoint daftar warga untuk kader).
            </p>
            <div className="mt-8">
              <Input
                label="ID warga"
                type="number"
                placeholder="14"
                value={pUserId}
                onChange={(e) => setPUserId(e.target.value)}
                required
              />
            </div>

            <label className="check mt-12">
              <input type="checkbox" checked={pHadir} onChange={(e) => setPHadir(e.target.checked)} />
              <span className="tiny">Hadir</span>
            </label>

            {pHadir ? (
              <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
                <Input label="Berat badan" suffix="kg" type="number" value={pBb} onChange={(e) => setPBb(e.target.value)} />
                <Input label="Tinggi badan" suffix="cm" type="number" value={pTinggi} onChange={(e) => setPTinggi(e.target.value)} />
                <Input label="Sistol" suffix="mmHg" type="number" value={pSistol} onChange={(e) => setPSistol(e.target.value)} />
                <Input label="Diastol" suffix="mmHg" type="number" value={pDiastol} onChange={(e) => setPDiastol(e.target.value)} />
                <Input label="Gula darah" suffix="mg/dL" type="number" value={pGula} onChange={(e) => setPGula(e.target.value)} />
                <div>
                  <label className="label">Jenis gula</label>
                  <select className="select" value={pJenisGula} onChange={(e) => setPJenisGula(e.target.value)}>
                    <option value="">-- pilih --</option>
                    <option value="puasa">Puasa</option>
                    <option value="2jam_pp">2 jam setelah makan</option>
                  </select>
                </div>
              </div>
            ) : null}

            {pErr ? <div className="err-msg show mt-8">{pErr}</div> : null}

            <Button className="mt-16" onClick={tambahPeserta} loading={pSaving} block>
              Tambah peserta
            </Button>
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}
