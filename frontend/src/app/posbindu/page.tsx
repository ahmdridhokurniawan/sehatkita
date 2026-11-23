"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { EmptyState, ErrorState, Loading } from "@/components/ui/Empty";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import { BentoKpiRow, type BentoCardItem } from "@/components/dashboard/BentoDashboard";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import PilihWarga from "@/components/warga/PilihWarga";
import { angka, tanggal, todayLocalISO } from "@/lib/format";
import { satuanGulaDarah } from "@/lib/labels";
import { validGulaDarah } from "@/lib/validasi";
import { admin as adminApi, posbindu as posbinduApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import type { AdminPengguna, KunjunganPosbindu, SesiPosbindu, SesiPosbinduDetail, WargaCari, Wilayah } from "@/types";

/* ------------------------------------------------------------------
   Posbindu — sesi pemeriksaan & kunjungan warga.
   kader / admin_kelurahan / super_admin: daftar sesi + buat/ubah sesi + peserta.
   masyarakat: riwayat kunjungan sendiri.
   ------------------------------------------------------------------ */

const ROLE_KELOLA = ["kader", "admin_kelurahan", "super_admin"];
// POST / PUT /posbindu/sesi hanya admin_kelurahan & super_admin (kader 403).
const ROLE_BUAT_SESI = ["admin_kelurahan", "super_admin"];
// POST /posbindu/sesi/{id}/peserta hanya kader & super_admin (admin_kelurahan 403).
const ROLE_CATAT_PESERTA = ["kader", "super_admin"];

type KodeStatusSesi = "akan_datang" | "berlangsung" | "selesai";

function statusSesi(s: SesiPosbindu): {
  kode: KodeStatusSesi;
  label: string;
  tone: "info" | "peringatan" | "sukses";
  warna: string;
} {
  const st = (s.status || "").toLowerCase();
  if (st === "akan_datang") {
    return { kode: "akan_datang", label: "Akan datang", tone: "info", warna: "var(--info, #4B6251)" };
  }
  if (st === "berlangsung" || st === "berjalan") {
    return { kode: "berlangsung", label: "Berlangsung", tone: "peringatan", warna: "var(--warning)" };
  }
  if (st === "selesai") {
    return { kode: "selesai", label: "Selesai", tone: "sukses", warna: "var(--safe)" };
  }

  const hariIni = todayLocalISO();
  const t = (s.tanggal || "").slice(0, 10);
  if (t > hariIni) {
    return { kode: "akan_datang", label: "Akan datang", tone: "info", warna: "var(--info, #4B6251)" };
  }
  if (t === hariIni) {
    return { kode: "berlangsung", label: "Berlangsung", tone: "peringatan", warna: "var(--warning)" };
  }
  return { kode: "selesai", label: "Selesai", tone: "sukses", warna: "var(--safe)" };
}

export default function PosbinduPage() {
  const { user, loading: loadingUser } = useUser();
  const bolehKelola = ROLE_KELOLA.includes(user?.role || "");
  const bolehBuatSesi = ROLE_BUAT_SESI.includes(user?.role || "");
  const bolehCatatPeserta = ROLE_CATAT_PESERTA.includes(user?.role || "");

  const [sesi, setSesi] = useState<SesiPosbindu[]>([]);
  const [cari, setCari] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | KodeStatusSesi>("semua");
  const [kunjungan, setKunjungan] = useState<KunjunganPosbindu[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");

  // --- buat / edit sesi ---
  const [buatOpen, setBuatOpen] = useState(false);
  const [editSesiId, setEditSesiId] = useState<number | null>(null);
  const [fTanggal, setFTanggal] = useState("");
  const [fLokasi, setFLokasi] = useState("");
  const [fCatatan, setFCatatan] = useState("");
  const [fKaderId, setFKaderId] = useState("");
  const [kaderList, setKaderList] = useState<AdminPengguna[]>([]);
  const [fErr, setFErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // super_admin tidak punya wilayah sendiri — wajib pilih kelurahan saat buat sesi.
  const perluPilihWilayah = user?.role === "super_admin";
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [fWilayah, setFWilayah] = useState("");

  // --- detail sesi + peserta ---
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SesiPosbinduDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [pWarga, setPWarga] = useState<WargaCari | null>(null);
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
        const res = await posbinduApi.sesiListPaged({
          page,
          per_page: perPage,
          search: cari.trim() || undefined,
        });
        setSesi(res.data);
        setMeta(res.meta);
      } else {
        const res = await posbinduApi.kunjunganPaged({ page, per_page: perPage });
        setKunjungan(res.data);
        setMeta(res.meta);
      }
      setError("");
    } catch (err) {
      const e = err as ApiError;
      setError(e.message || "Gagal memuat data Posbindu");
    } finally {
      setLoading(false);
    }
  }, [bolehKelola, page, perPage, cari]);

  useEffect(() => {
    if (loadingUser || !user) return;
    let aktif = true;
    const req = bolehKelola
      ? posbinduApi
          .sesiListPaged({ page, per_page: perPage, search: cari.trim() || undefined })
          .then((res) => {
            if (aktif) {
              setSesi(res.data);
              setMeta(res.meta);
            }
          })
      : posbinduApi.kunjunganPaged({ page, per_page: perPage }).then((res) => {
          if (aktif) {
            setKunjungan(res.data);
            setMeta(res.meta);
          }
        });
    req
      .then(() => {
        if (aktif) setError("");
      })
      .catch((err) => {
        if (!aktif) return;
        const e = err as ApiError;
        setError(e.message || "Gagal memuat data Posbindu");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [loadingUser, user, bolehKelola, page, perPage, cari]);

  useEffect(() => {
    if (!perluPilihWilayah) return;
    let aktif = true;
    Promise.all([
      wilayahApi.list({ tipe: "kelurahan" }),
      adminApi.pengguna.list({ role: "kader", per_page: 100 }).catch(() => [] as AdminPengguna[]),
    ])
      .then(([rows, kaders]) => {
        if (!aktif) return;
        setWilayahList(rows);
        setKaderList(kaders);
        if (rows.length) setFWilayah((kini) => kini || String(rows[0].id));
      })
      .catch(() => aktif && setWilayahList([]));
    return () => {
      aktif = false;
    };
  }, [perluPilihWilayah]);

  function bukaBuatSesi() {
    setEditSesiId(null);
    setFTanggal("");
    setFLokasi("");
    setFCatatan("");
    setFKaderId("");
    setFErr({});
    setPErr("");
    setBuatOpen(true);
  }

  function bukaEditSesi(s: SesiPosbindu) {
    setEditSesiId(s.id);
    setFWilayah(String(s.wilayah_id));
    setFTanggal((s.tanggal || "").slice(0, 10));
    setFLokasi(s.lokasi || "");
    setFCatatan(s.catatan || "");
    setFKaderId(s.kader?.id ? String(s.kader.id) : "");
    setFErr({});
    setPErr("");
    setBuatOpen(true);
  }

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
    if (perluPilihWilayah && !fWilayah) e.wilayah = "Kelurahan wajib diisi.";
    setFErr(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const payload = {
        wilayah_id:
          user?.role === "super_admin" ? Number(fWilayah) || 0 : user?.wilayah_id || 0,
        tanggal: fTanggal,
        lokasi: fLokasi.trim(),
        kader_id: fKaderId ? Number(fKaderId) : undefined,
        catatan: fCatatan.trim() || undefined,
      };
      if (editSesiId !== null) {
        await posbinduApi.sesiUbah(editSesiId, payload);
      } else {
        await posbinduApi.sesiBuat(payload);
      }
      setBuatOpen(false);
      setEditSesiId(null);
      setFTanggal("");
      setFLokasi("");
      setFCatatan("");
      setFKaderId("");
      await muat();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiErr.errors)) map[k] = v[0] ?? "Tidak valid";
        setFErr(map);
      }
      setPErr(apiErr.message || "Gagal menyimpan sesi");
    } finally {
      setSaving(false);
    }
  }

  async function tambahPeserta() {
    if (!detailId) return;
    setPErr("");
    if (!pWarga) {
      setPErr("Pilih warga terlebih dahulu.");
      return;
    }
    const adaSistol = pSistol.trim() !== "";
    const adaDiastol = pDiastol.trim() !== "";
    if (pHadir && adaSistol !== adaDiastol) {
      setPErr("Isi sistol dan diastol secara bersamaan.");
      return;
    }
    if (pHadir && pGula.trim()) {
      if (!pJenisGula) {
        setPErr("Pilih jenis pemeriksaan gula darah (Puasa / Sewaktu / 2 Jam PP / HbA1c).");
        return;
      }
      const cekGula = validGulaDarah(pGula, pJenisGula);
      if (!cekGula.ok) {
        setPErr(cekGula.msg || "Nilai gula darah tidak valid.");
        return;
      }
    }
    const uid = pWarga.id;

    const catatanKesehatan: Record<string, number | string> = {};
    if (pHadir) {
      if (pBb.trim()) catatanKesehatan.bb_kg = Number(pBb);
      if (adaSistol && adaDiastol) {
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
      setPWarga(null);
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
    return sesi.filter((s) => {
      if (statusFilter !== "semua" && statusSesi(s).kode !== statusFilter) return false;
      if (!q) return true;
      return (
        (s.lokasi ?? "").toLowerCase().includes(q) ||
        tanggal(s.tanggal).toLowerCase().includes(q) ||
        s.tanggal.toLowerCase().includes(q) ||
        (s.kader?.name ?? "").toLowerCase().includes(q)
      );
    });
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

  const totalPesertaSesi = sesi.reduce((acc, s) => acc + (s.jumlah_peserta || 0), 0);
  const totalHadirSesi = sesi.reduce((acc, s) => acc + (s.hadir || 0), 0);
  const rasioHadir = totalPesertaSesi > 0 ? Math.round((totalHadirSesi / totalPesertaSesi) * 100) : 0;
  const jumlahAktifSesi = sesi.filter((s) => {
    const k = statusSesi(s).kode;
    return k === "akan_datang" || k === "berlangsung";
  }).length;
  const jumlahSelesaiSesi = sesi.filter((s) => statusSesi(s).kode === "selesai").length;

  const posbinduKpi: BentoCardItem[] = bolehKelola
    ? [
        {
          id: "total-sesi",
          label: "Total Sesi",
          value: angka(sesi.length),
          subtitle: "Jadwal Posbindu tercatat",
          icon: "calendar",
          accent: "primary",
        },
        {
          id: "sesi-aktif",
          label: "Terjadwal / Aktif",
          value: angka(jumlahAktifSesi),
          subtitle: "Akan datang & berlangsung",
          icon: "clock",
          accent: "info",
        },
        {
          id: "sesi-selesai",
          label: "Selesai",
          value: angka(jumlahSelesaiSesi),
          subtitle: "Sesi terlaksana",
          icon: "check-circle",
          accent: "safe",
        },
        {
          id: "kehadiran",
          label: "Kehadiran Warga",
          value: `${rasioHadir}%`,
          subtitle: `${angka(totalHadirSesi)} dari ${angka(totalPesertaSesi)} peserta`,
          icon: "users",
          accent: rasioHadir >= 70 ? "safe" : "warning",
          ringPercent: rasioHadir,
        },
      ]
    : [];

  return (
    <AppShell noFab>
      <div className="row-between mb-16" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="h3">Posbindu</h1>
          <p className="tiny">
            {bolehKelola
              ? "Kelola jadwal pemeriksaan Posbindu wilayah, penugasan kader, dan tingkat kehadiran warga."
              : "Riwayat pemeriksaan dan kunjungan Posbindu Anda."}
          </p>
        </div>
        {bolehBuatSesi ? (
          <Button icon="plus" onClick={bukaBuatSesi}>
            Sesi baru
          </Button>
        ) : null}
      </div>

      {tampilLoading ? <Loading /> : null}
      {!tampilLoading && error ? <ErrorState message={error} onRetry={muat} /> : null}

      {!tampilLoading && !error && bolehKelola && sesi.length > 0 ? (
        <div className="mb-16">
          <BentoKpiRow items={posbinduKpi} />
        </div>
      ) : null}

      {!tampilLoading && !error ? (
        <div className="row-between wrap gap-10 mb-12" style={{ alignItems: "center" }}>
          <div className="input-icon" style={{ flex: "1 1 240px", minWidth: 220 }}>
            <Icon name="search" size={18} />
            <input
              className="input"
              type="search"
              placeholder={bolehKelola ? "Cari lokasi, tanggal, atau kader…" : "Cari tanggal atau lokasi…"}
              value={cari}
              onChange={(e) => {
                setCari(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {bolehKelola ? (
            <div className="segment" role="group" aria-label="Filter status sesi">
              {(
                [
                  ["semua", "Semua"],
                  ["akan_datang", "Akan datang"],
                  ["berlangsung", "Berlangsung"],
                  ["selesai", "Selesai"],
                ] as const
              ).map(([kode, label]) => (
                <button
                  key={kode}
                  type="button"
                  className={statusFilter === kode ? "active" : ""}
                  onClick={() => setStatusFilter(kode)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!tampilLoading && !error && bolehKelola ? (
        sesi.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Belum ada sesi"
            desc={
              bolehBuatSesi
                ? "Buat sesi Posbindu pertama untuk wilayah Anda."
                : "Admin kelurahan belum membuat sesi Posbindu untuk wilayah Anda."
            }
          />
        ) : sesiTersaring.length === 0 ? (
          <div className="card card-flat">
            <EmptyState
              icon="search"
              title="Sesi tidak ditemukan"
              desc={
                cari.trim()
                  ? `Tidak ada sesi yang cocok dengan “${cari}”.`
                  : "Belum ada sesi pada status filter ini."
              }
            />
          </div>
        ) : (
          <div className="card card-list mt-12">
            {sesiTersaring.map((s) => {
              const st = statusSesi(s);
              const pctHadir =
                s.jumlah_peserta > 0 ? Math.min(100, Math.round((s.hadir / s.jumlah_peserta) * 100)) : 0;
              return (
                <div
                  className="li"
                  key={s.id}
                  style={{
                    borderLeft: `3px solid ${st.warna}`,
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 10,
                  }}
                >
                  <div className="row-between wrap" style={{ gap: 8 }}>
                    <div>
                      <strong className="text-sm">{tanggal(s.tanggal, "long")}</strong>
                      <div
                        className="tiny mt-4"
                        style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text)" }}
                      >
                        <Icon name="map-pin" size={14} className="shrink-0 text-primary" />
                        <span>{s.lokasi}</span>
                      </div>
                      {s.kader?.name ? (
                        <div
                          className="tiny mt-4"
                          style={{ display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <Icon name="user" size={13} className="shrink-0" />
                          <span>Kader: {s.kader.name}</span>
                        </div>
                      ) : null}
                      {s.catatan ? <p className="tiny mt-4">{s.catatan}</p> : null}
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>

                  <div className="row-between wrap gap-10">
                    <div style={{ flex: "1 1 220px" }}>
                      <div className="row-between tiny mb-4">
                        <span>Kehadiran peserta</span>
                        <strong>
                          {angka(s.hadir)} / {angka(s.jumlah_peserta)} ({pctHadir}%)
                        </strong>
                      </div>
                      <div className="progress" style={{ height: 6 }}>
                        <i style={{ width: `${pctHadir}%`, background: st.warna }} />
                      </div>
                    </div>
                    <div className="row gap-6">
                      {bolehBuatSesi && s.status !== "selesai" ? (
                        <button className="btn btn-sm btn-ghost" onClick={() => bukaEditSesi(s)} type="button">
                          <Icon name="edit" size={14} /> Ubah
                        </button>
                      ) : null}
                      <button className="btn btn-sm btn-outline" onClick={() => bukaDetail(s.id)} type="button">
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {!tampilLoading && !error && !bolehKelola ? (
        kunjungan.length === 0 ? (
          <EmptyState icon="calendar-check" title="Belum ada kunjungan" desc="Riwayat kunjungan Posbindu Anda akan tampil di sini." />
        ) : (
          <div className="card card-list mt-12">
            {kunjunganTersaring.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState icon="search" title="Kunjungan tidak ditemukan" desc={`Tidak ada yang cocok dengan “${cari}”.`} />
              </div>
            ) : null}
            {kunjunganTersaring.map((k) => (
              <div
                className="li row-between"
                key={k.kunjungan_id}
                style={{ borderLeft: `3px solid ${k.hadir ? "var(--safe)" : "var(--warning)"}`, gap: 10 }}
              >
                <div className="li-main">
                  <strong className="text-sm">{tanggal(k.tanggal, "long")}</strong>
                  <div
                    className="tiny mt-4"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Icon name="map-pin" size={13} className="shrink-0 text-primary" />
                    <span>{k.lokasi}</span>
                  </div>
                </div>
                <Badge tone={k.hadir ? "sukses" : "peringatan"}>
                  {k.hadir ? "Hadir" : "Tidak hadir"}
                </Badge>
              </div>
            ))}
          </div>
        )
      ) : null}

      {!tampilLoading && !error && meta ? (
        <Pagination
          meta={meta}
          onPage={setPage}
          perPage={perPage}
          onPerPage={(n) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      ) : null}

      {/* Modal buat / ubah sesi */}
      <Modal
        open={buatOpen}
        onClose={() => setBuatOpen(false)}
        title={editSesiId !== null ? "Ubah Sesi Posbindu" : "Sesi Posbindu Baru"}
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
        {perluPilihWilayah ? (
          <div className="mt-12">
            <label className="label">Kelurahan</label>
            <select
              className="select"
              value={fWilayah}
              onChange={(e) => {
                setFWilayah(e.target.value);
                setFKaderId("");
              }}
            >
              {wilayahList.length ? null : <option value="">Pilih kelurahan…</option>}
              {wilayahList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nama}
                </option>
              ))}
            </select>
            {fErr.wilayah ? <span className="err-text">{fErr.wilayah}</span> : null}
          </div>
        ) : null}
        {perluPilihWilayah ? (
          <div className="mt-12">
            <label className="label">Kader penanggung jawab (opsional)</label>
            <select
              className="select"
              value={fKaderId}
              onChange={(e) => setFKaderId(e.target.value)}
            >
              <option value="">-- Belum ditentukan --</option>
              {kaderList
                .filter((k) => !fWilayah || Number(k.wilayah_id) === Number(fWilayah))
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
            </select>
            {fErr.kader_id ? <span className="err-text">{fErr.kader_id}</span> : null}
          </div>
        ) : null}
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
        {detailLoading ? <Loading text="Memuat peserta…" variant="list" /> : null}
        {detailErr ? <ErrorState message={detailErr} /> : null}

        {detail ? (
          <>
            <p className="tiny">
              <Icon name="map-pin" size={12} /> {detail.lokasi} · {detail.hadir}/{detail.jumlah_peserta} hadir
            </p>

            <div className="mt-16">
              <strong className="text-sm">Peserta</strong>
              {!bolehCatatPeserta ? (
                <p className="tiny mt-4">
                  Daftar peserta individu disembunyikan untuk menjaga privasi warga (agregat: {detail.hadir}/{detail.jumlah_peserta} hadir).
                </p>
              ) : detail.peserta.length === 0 ? (
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

            {bolehCatatPeserta ? (
              <>
                <hr className="mt-16 mb-16" />

                <strong className="text-sm">Tambah peserta</strong>
                <p className="tiny mt-4">
                  Cari warga dengan NIK, lalu pilih dari daftar hasil.
                </p>
                <div className="mt-8">
                  <PilihWarga
                    value={pWarga}
                    onChange={setPWarga}
                    id="posbindu-warga"
                    label="Warga"
                    wilayahId={user?.role === "kader" ? user.wilayah_id : null}
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
                    <Input
                      label="Gula darah"
                      suffix={satuanGulaDarah(pJenisGula)}
                      type="number"
                      step="any"
                      placeholder={pJenisGula === "hba1c" ? "misalnya 5.7" : "misalnya 110"}
                      hint={
                        pJenisGula === "hba1c"
                          ? "Rentang HbA1c 3–25 %"
                          : "Rentang wajar 20–700 mg/dL (bukan mmol/L)"
                      }
                      value={pGula}
                      onChange={(e) => setPGula(e.target.value)}
                    />
                    <div>
                      <label className="label">Jenis Pemeriksaan Gula Darah</label>
                      <select className="select" value={pJenisGula} onChange={(e) => setPJenisGula(e.target.value)}>
                        <option value="">-- pilih jenis pemeriksaan --</option>
                        <option value="puasa">Gula Darah Puasa (normal &lt; 100 mg/dL)</option>
                        <option value="sewaktu">Gula Darah Sewaktu (normal &lt; 140 mg/dL)</option>
                        <option value="2jam_pp">2 Jam Setelah Makan (normal &lt; 140 mg/dL)</option>
                        <option value="hba1c">HbA1c % (normal &lt; 5,7%)</option>
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
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}
