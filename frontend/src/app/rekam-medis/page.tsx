"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Segmented from "@/components/ui/Segmented";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import Line from "@/components/charts/Line";
import CatatModal from "@/components/catatan/CatatModal";
import PilihWarga from "@/components/warga/PilihWarga";
import { EmptyState, Loading } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import { admin as adminApi, catatanKesehatan, rekamMedis, ApiError } from "@/lib/api";
import { tanggal } from "@/lib/format";
import {
  LABEL_JENIS_GULA_DARAH,
  LABEL_STATUS_KESEHATAN,
  LABEL_SUMBER,
  labelKategoriIndikator,
  satuanGulaDarah,
} from "@/lib/labels";
import type { StatusKesehatan } from "@/lib/enums";
import type { CatatanKesehatan, RekamMedis as RekamMedisType, WargaCari } from "@/types";

const INDIKATOR = [
  { k: "bb_kg", label: "Berat Badan", unit: "kg", dec: 0 },
  { k: "imt", label: "IMT", unit: "kg/m²", dec: 1 },
  { k: "sistol", label: "Sistol", unit: "mmHg", dec: 0 },
  { k: "diastol", label: "Diastol", unit: "mmHg", dec: 0 },
  { k: "gula_darah", label: "Gula Darah", unit: "mg/dL", dec: 0 },
  { k: "kolesterol", label: "Kolesterol", unit: "mg/dL", dec: 0 },
  { k: "asam_urat", label: "Asam Urat", unit: "mg/dL", dec: 1 },
  { k: "lingkar_perut", label: "Lingkar Perut", unit: "cm", dec: 0 },
] as const;

const PERIODE = [
  { value: "1m", label: "1 Bulan" },
  { value: "3m", label: "3 Bulan" },
  { value: "6m", label: "6 Bulan" },
  { value: "1y", label: "1 Tahun" },
];

const NAMA_BULAN_KAL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const NAMA_HARI_KAL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatIsoTanggal(y: number, mZero: number, d: number): string {
  return `${y}-${String(mZero + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isoTanggalLokal(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return s.slice(0, 10);
  return formatIsoTanggal(d.getFullYear(), d.getMonth(), d.getDate());
}

const PER_HALAMAN = 10;

function toneKategori(k = ""): "safe" | "warning" | "danger" {
  if (/derajat 2|obesitas|tinggi|berisiko/i.test(k)) return "danger";
  if (/derajat 1|gemuk|batas|prehipertensi/i.test(k)) return "warning";
  return "safe";
}

function toneStatusKesehatan(s?: StatusKesehatan | null): "safe" | "warning" | "danger" | "default" {
  if (s === "berisiko") return "danger";
  if (s === "perlu_perhatian") return "warning";
  if (s === "normal") return "safe";
  return "default";
}

function ringkasAlasanRujukan(c: CatatanKesehatan): string {
  const bagian: string[] = [];
  if (c.sistol !== null && c.diastol !== null && c.kategori_tensi && c.kategori_tensi !== "normal") {
    bagian.push(`Tensi ${c.sistol}/${c.diastol} mmHg (${LABEL_STATUS_KESEHATAN[c.kategori_tensi]})`);
  }
  if (c.gula_darah !== null && c.kategori_gula_darah && c.kategori_gula_darah !== "normal") {
    bagian.push(
      `Gula darah ${c.gula_darah} ${satuanGulaDarah(c.jenis_gula_darah)} (${LABEL_STATUS_KESEHATAN[c.kategori_gula_darah]})`,
    );
  }
  if (c.kolesterol !== null && c.kategori_kolesterol && c.kategori_kolesterol !== "normal") {
    bagian.push(`Kolesterol ${c.kolesterol} mg/dL (${LABEL_STATUS_KESEHATAN[c.kategori_kolesterol]})`);
  }
  if (c.asam_urat !== null && c.kategori_asam_urat && c.kategori_asam_urat !== "normal") {
    bagian.push(`Asam urat ${c.asam_urat} mg/dL (${LABEL_STATUS_KESEHATAN[c.kategori_asam_urat]})`);
  }
  const detail = bagian.join(", ");
  const tgl = tanggal(c.dicatat_pada, "short");
  return detail
    ? `Tindak lanjut pemeriksaan ${tgl}: ${detail}`.slice(0, 250)
    : `Tindak lanjut pemeriksaan ${tgl} dengan status ${c.status_kesehatan ? LABEL_STATUS_KESEHATAN[c.status_kesehatan] : "berisiko"}`;
}

function urlRujukDariCatatan(c: CatatanKesehatan): string {
  if (!c.pengguna) return "/rujukan";
  const params = new URLSearchParams({
    rujuk_user_id: String(c.pengguna.id),
    rujuk_nama: c.pengguna.name,
    rujuk_alasan: ringkasAlasanRujukan(c),
  });
  if (c.pengguna.nik) params.set("rujuk_nik", c.pengguna.nik);
  if (c.pengguna.wilayah?.nama) params.set("rujuk_wilayah", c.pengguna.wilayah.nama);
  return `/rujukan?${params.toString()}`;
}

export default function RekamMedisPage() {
  const toast = useToast();
  const { user } = useUser();
  const petugas = user?.role === "kader" || user?.role === "admin_kelurahan" || user?.role === "super_admin";
  const bisaPilihWarga = user?.role === "kader" || user?.role === "super_admin";
  const isAdminKel = user?.role === "admin_kelurahan";
  const bisaCatat = !isAdminKel;
  const bisaHapus = !isAdminKel;
  const bisaVerifikasi = isAdminKel || user?.role === "super_admin";
  const [periode, setPeriode] = useState<"1m" | "3m" | "6m" | "1y">("3m");
  const [indikator, setIndikator] = useState<string>("bb_kg");
  const [wargaDipilih, setWargaDipilih] = useState<WargaCari | null>(null);
  const [filterStatus, setFilterStatus] = useState<"semua" | "berisiko" | "perlu_perhatian" | "verifikasi">("semua");
  const [cari, setCari] = useState("");
  const [dariTgl, setDariTgl] = useState("");
  const [sampaiTgl, setSampaiTgl] = useState("");
  const [menungguAkhir, setMenungguAkhir] = useState(false);
  const [hoverTgl, setHoverTgl] = useState<string | null>(null);
  const [kalenderBuka, setKalenderBuka] = useState(false);
  const [bulanKalender, setBulanKalender] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [halaman, setHalaman] = useState(1);
  const [detail, setDetail] = useState<CatatanKesehatan | null>(null);
  const [catatTerbuka, setCatatTerbuka] = useState(false);
  const [hapusItem, setHapusItem] = useState<CatatanKesehatan | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  const [verifikasiId, setVerifikasiId] = useState<number | null>(null);

  async function putuskanVerifikasi(item: CatatanKesehatan, setuju: boolean) {
    setVerifikasiId(item.id);
    try {
      await adminApi.verifikasi.putuskan(item.id, setuju);
      if (setuju) {
        setCatatan((prev) => prev.map((row) => (row.id === item.id ? { ...row, perlu_verifikasi: false } : row)));
        toast.success("Catatan diverifikasi dan masuk agregat.");
      } else {
        setCatatan((prev) => prev.filter((row) => row.id !== item.id));
        toast.success("Catatan ditolak dan dihapus.");
      }
    } catch (err) {
      toast.warning(err instanceof ApiError ? err.message : "Gagal memproses verifikasi catatan.");
    } finally {
      setVerifikasiId(null);
    }
  }

  // Fetch data awal & refresh manual
  const [catatan, setCatatan] = useState<CatatanKesehatan[]>([]);
  const [grafik, setGrafik] = useState<RekamMedisType | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = bisaPilihWarga ? wargaDipilih?.id : undefined;

  useEffect(() => {
    if (!user) return;
    let aktif = true;
    catatanKesehatan
      .list({ per_page: 100, user_id: targetUserId })
      .then((cList) => {
        if (!aktif) return;
        setCatatan(cList);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!aktif) return;
        const apiErr = err instanceof ApiError ? err : null;
        console.error("Rekam medis list error:", err);
        setError(apiErr?.message || "Gagal memuat data");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [user, targetUserId]);

  useEffect(() => {
    if (!user || isAdminKel) return;
    if (bisaPilihWarga && !wargaDipilih) {
      return;
    }
    let aktif = true;
    rekamMedis
      .get({ indikator, periode, user_id: wargaDipilih?.id })
      .then((gData) => {
        if (!aktif) return;
        setGrafik(gData);
      })
      .catch((err: unknown) => {
        if (!aktif) return;
        const apiErr = err instanceof ApiError ? err : null;
        console.error("Rekam medis chart error:", err);
        setError((prev) => prev || apiErr?.message || "Gagal memuat grafik");
      });
    return () => {
      aktif = false;
    };
  }, [user, isAdminKel, bisaPilihWarga, wargaDipilih, indikator, periode]);

  async function muat() {
    try {
      setLoading(true);
      const butuhGrafik = !isAdminKel && (!bisaPilihWarga || Boolean(wargaDipilih));
      const [cList, gData] = await Promise.all([
        catatanKesehatan.list({ per_page: 100, user_id: targetUserId }),
        butuhGrafik ? rekamMedis.get({ indikator, periode, user_id: wargaDipilih?.id }) : Promise.resolve(null),
      ]);
      setCatatan(cList);
      setGrafik(gData);
      setError(null);
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      console.error("Rekam medis fetch error:", err);
      setError(apiErr?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  const ind = INDIKATOR.find((i) => i.k === indikator) || INDIKATOR[0];

  // Grafik
  const seri = useMemo(() => {
    if (!grafik?.series?.[0]) return [];
    const s = grafik.series[0];
    return s.titik.map((t) => ({ tanggal: t.tanggal, nilai: t.nilai }));
  }, [grafik]);

  const jumlahBerisiko = useMemo(
    () => catatan.filter((c) => c.status_kesehatan === "berisiko").length,
    [catatan]
  );
  const jumlahPerhatian = useMemo(
    () => catatan.filter((c) => c.status_kesehatan === "perlu_perhatian").length,
    [catatan]
  );
  const jumlahVerifikasi = useMemo(
    () => catatan.filter((c) => c.perlu_verifikasi).length,
    [catatan]
  );

  const catatanPerTanggal = useMemo(() => {
    const map = new Map<string, CatatanKesehatan[]>();
    for (const c of catatan) {
      const iso = isoTanggalLokal(c.dicatat_pada);
      if (!iso) continue;
      const arr = map.get(iso) || [];
      arr.push(c);
      map.set(iso, arr);
    }
    return map;
  }, [catatan]);

  function resetFilterTanggal() {
    setDariTgl("");
    setSampaiTgl("");
    setMenungguAkhir(false);
    setHalaman(1);
  }

  function pilihTanggalKalender(iso: string) {
    setHalaman(1);
    if (!menungguAkhir || !dariTgl) {
      setDariTgl(iso);
      setSampaiTgl(iso);
      setMenungguAkhir(true);
      return;
    }
    if (iso < dariTgl) {
      setSampaiTgl(dariTgl);
      setDariTgl(iso);
    } else {
      setSampaiTgl(iso);
    }
    setMenungguAkhir(false);
  }

  // Daftar catatan: filter tanggal + filter status + cari + paginasi
  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const batasBawah = dariTgl || sampaiTgl;
    const batasAtas = sampaiTgl || dariTgl;
    return catatan.filter((c) => {
      const tglIso = isoTanggalLokal(c.dicatat_pada);
      if (batasBawah && tglIso < batasBawah) return false;
      if (batasAtas && tglIso > batasAtas) return false;
      if (filterStatus === "berisiko" && c.status_kesehatan !== "berisiko") return false;
      if (filterStatus === "perlu_perhatian" && c.status_kesehatan !== "perlu_perhatian") return false;
      if (filterStatus === "verifikasi" && !c.perlu_verifikasi) return false;
      if (!q) return true;
      const labelStatus = c.status_kesehatan ? LABEL_STATUS_KESEHATAN[c.status_kesehatan] : "";
      return [
        tanggal(c.dicatat_pada, "day"),
        c.sumber,
        c.kategori_imt || "",
        labelStatus,
        c.status_kesehatan || "",
        String(c.bb_kg || ""),
        c.pengguna?.name || "",
        bisaPilihWarga ? c.pengguna?.nik || "" : "",
        c.pengguna?.wilayah?.nama || "",
        c.catatan || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [cari, catatan, dariTgl, sampaiTgl, filterStatus, bisaPilihWarga]);

  const total = tersaring.length;
  const lastPage = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halamanAman = Math.min(halaman, lastPage);
  const baris = tersaring.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  const meta: Meta = { page: halamanAman, per_page: PER_HALAMAN, total, last_page: lastPage };

  if (tampilLoading) {
    return (
      <AppShell noFab={!bisaCatat} onFab={bisaCatat ? () => setCatatTerbuka(true) : undefined}>
        <Loading text="Data rekam medis sedang dimuat…" variant="cards" />
      </AppShell>
    );
  }

  return (
    <AppShell noFab={!bisaCatat} onFab={bisaCatat ? () => setCatatTerbuka(true) : undefined}>
      {error && (
        <div className="alert alert-warning mb-16">
          <Icon name="alert-circle" />
          <div>{error}</div>
        </div>
      )}

      <div className="row-between mb-16">
        <div>
          <h1 className="h3">Rekam Medis</h1>
          <p className="tiny">
            {isAdminKel
              ? "Riwayat pemeriksaan warga kelurahan (hanya lihat, tidak bisa diubah)."
              : "Riwayat pemeriksaan dan grafik perkembangan indikator."}
          </p>
        </div>
      </div>

      {bisaPilihWarga ? (
        <div className="card card-flat mb-16">
          <PilihWarga
            value={wargaDipilih}
            onChange={(w) => {
              setWargaDipilih(w);
              if (!w) setGrafik(null);
              setHalaman(1);
            }}
            id="rekam-medis-warga"
            label="Filter per warga (opsional, cari nama atau NIK untuk melihat grafik tren warga)"
            wilayahId={user?.role === "kader" ? user.wilayah_id : null}
          />
        </div>
      ) : null}

      {/* Kartu grafik — hanya untuk warga pribadi atau petugas yang sudah memilih warga */}
      {!isAdminKel ? (
        <div className="card">
          <div className="row-between mb-12">
            <strong className="text-sm">{ind.label}</strong>
            <Segmented
              items={PERIODE}
              value={periode}
              onChange={(val) => setPeriode(val as "1m" | "3m" | "6m" | "1y")}
            />
          </div>
          {bisaPilihWarga && !wargaDipilih ? (
            <EmptyState
              icon="users"
              title="Pilih warga terlebih dahulu"
              desc="Cari dan pilih warga lewat nama atau NIK di atas untuk menampilkan grafik tren per individu."
            />
          ) : seri.length < 2 ? (
            <EmptyState
              icon="line-chart"
              title="Belum cukup data"
              desc="Grafik muncul setelah minimal dua pengukuran. Satu titik data belum dapat membentuk tren."
            />
          ) : (
            <Line
              labels={seri.map((p) => tanggal(p.tanggal, "short"))}
              series={[{ name: ind.label, data: seri.map((p) => p.nilai) }]}
              unit={ind.unit}
              height={190}
              yDecimals={ind.dec}
            />
          )}
          <div className="mt-12">
            <label className="label" htmlFor="pilihIndikator">
              Tampilkan indikator
            </label>
            <select
              className="select"
              id="pilihIndikator"
              value={indikator}
              onChange={(e) => setIndikator(e.target.value)}
            >
              {INDIKATOR.map((i) => (
                <option value={i.k} key={i.k}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="app-section-title mt-20">
        <h2>Riwayat Catatan</h2>
        {bisaCatat ? (
          <button
            className="btn btn-sm btn-primary"
            type="button"
            onClick={() => setCatatTerbuka(true)}
          >
            <Icon name="plus" size={16} /> Catat
          </button>
        ) : null}
      </div>
      <div className="chip-row mt-12">
        <button
          type="button"
          className={`chip${filterStatus === "semua" ? " is-active" : ""}`}
          onClick={() => {
            setFilterStatus("semua");
            setHalaman(1);
          }}
        >
          Semua ({catatan.length})
        </button>
        <button
          type="button"
          className={`chip${filterStatus === "berisiko" ? " is-active" : ""}`}
          onClick={() => {
            setFilterStatus("berisiko");
            setHalaman(1);
          }}
        >
          Berisiko ({jumlahBerisiko})
        </button>
        <button
          type="button"
          className={`chip${filterStatus === "perlu_perhatian" ? " is-active" : ""}`}
          onClick={() => {
            setFilterStatus("perlu_perhatian");
            setHalaman(1);
          }}
        >
          Perlu Perhatian ({jumlahPerhatian})
        </button>
        {jumlahVerifikasi > 0 ? (
          <button
            type="button"
            className={`chip${filterStatus === "verifikasi" ? " is-active" : ""}`}
            onClick={() => {
              setFilterStatus("verifikasi");
              setHalaman(1);
            }}
          >
            Verifikasi ({jumlahVerifikasi})
          </button>
        ) : null}
      </div>

      <div className="row gap-10 wrap mt-12" style={{ alignItems: "center" }}>
        <div className="input-icon" style={{ flex: "1 1 240px" }}>
          <Icon name="search" size={18} />
          <input
            className="input"
            type="search"
            placeholder={bisaPilihWarga ? "Cari nama warga, NIK, kelurahan, atau catatan…" : "Cari catatan…"}
            value={cari}
            onChange={(e) => {
              setCari(e.target.value);
              setHalaman(1);
            }}
          />
        </div>
        <button
          type="button"
          className={`btn ${kalenderBuka || dariTgl || sampaiTgl ? "btn-primary" : "btn-outline"}`}
          aria-expanded={kalenderBuka}
          onClick={() => setKalenderBuka((v) => !v)}
        >
          <Icon name="calendar" size={16} />{" "}
          {dariTgl || sampaiTgl
            ? (dariTgl && sampaiTgl && dariTgl === sampaiTgl
                ? tanggal(dariTgl)
                : `${tanggal(dariTgl || sampaiTgl)} – ${tanggal(sampaiTgl || dariTgl)}`)
            : "Filter Kalender"}
        </button>
        {(dariTgl || sampaiTgl) ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={resetFilterTanggal}
          >
            <Icon name="x" size={15} /> Reset Tanggal
          </button>
        ) : null}
      </div>

      <Modal
        open={kalenderBuka}
        onClose={() => {
          setKalenderBuka(false);
          setHoverTgl(null);
        }}
        size="lg"
        title="Filter Kalender Riwayat"
        footer={
          <div className="row-between wrap gap-8" style={{ width: "100%" }}>
            <span className="tiny">
              {dariTgl || sampaiTgl
                ? (dariTgl && sampaiTgl && dariTgl === sampaiTgl
                    ? `${tanggal(dariTgl)} (${tersaring.length} catatan)`
                    : `${tanggal(dariTgl || sampaiTgl)} – ${tanggal(sampaiTgl || dariTgl)} (${tersaring.length} catatan)`)
                : `Semua tanggal (${tersaring.length} catatan)`}
            </span>
            <div className="row gap-8">
              {(dariTgl || sampaiTgl) ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={resetFilterTanggal}
                >
                  <Icon name="x" size={14} /> Reset
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setKalenderBuka(false);
                  setHoverTgl(null);
                }}
              >
                Terapkan ({tersaring.length})
              </button>
            </div>
          </div>
        }
      >
        {(() => {
          const tahun = bulanKalender.getFullYear();
          const bulanIdx = bulanKalender.getMonth();
          const awalIdx = new Date(tahun, bulanIdx, 1).getDay();
          const jmlHari = new Date(tahun, bulanIdx + 1, 0).getDate();
          const nowKal = new Date();
          const hariIniIso = formatIsoTanggal(nowKal.getFullYear(), nowKal.getMonth(), nowKal.getDate());
          const tujuhHariDt = new Date(nowKal.getFullYear(), nowKal.getMonth(), nowKal.getDate() - 6);
          const tujuhHariIso = formatIsoTanggal(
            tujuhHariDt.getFullYear(),
            tujuhHariDt.getMonth(),
            tujuhHariDt.getDate(),
          );
          const awalBulanIso = formatIsoTanggal(nowKal.getFullYear(), nowKal.getMonth(), 1);
          const selKal: (number | null)[] = [];
          for (let i = 0; i < awalIdx; i++) selKal.push(null);
          for (let d = 1; d <= jmlHari; d++) selKal.push(d);

          const aktifHariIni = dariTgl === hariIniIso && sampaiTgl === hariIniIso;
          const aktif7Hari = dariTgl === tujuhHariIso && sampaiTgl === hariIniIso;
          const aktifBulanIni = dariTgl === awalBulanIso && sampaiTgl === hariIniIso;
          const aktifSemua = !dariTgl && !sampaiTgl;

          const tglReview = hoverTgl || (dariTgl && catatanPerTanggal.has(dariTgl) ? dariTgl : null);
          const itemsReview = tglReview ? catatanPerTanggal.get(tglReview) || [] : [];

          return (
            <div className="kal-modal-split">
              {/* KOLOM KIRI: KALENDER APPLE WWDC 2025 LIQUID GLASS */}
              <div>
                <div className="kal-popup-shell" style={{ marginTop: 0 }}>
                  <div className="kal-month-bar">
                    <button
                      type="button"
                      className="btn btn-icon kal-arrow-btn"
                      aria-label="Bulan sebelumnya"
                      onClick={() => setBulanKalender(new Date(tahun, bulanIdx - 1, 1))}
                    >
                      <Icon name="arrow-left" size={16} />
                    </button>
                    <strong>
                      {NAMA_BULAN_KAL[bulanIdx]} {tahun}
                    </strong>
                    <button
                      type="button"
                      className="btn btn-icon kal-arrow-btn"
                      aria-label="Bulan berikutnya"
                      onClick={() => setBulanKalender(new Date(tahun, bulanIdx + 1, 1))}
                    >
                      <Icon name="arrow-right" size={16} />
                    </button>
                  </div>

                  <div
                    className="kalender-grid"
                    role="grid"
                    aria-label="Kalender filter riwayat pemeriksaan"
                    onMouseLeave={() => setHoverTgl(null)}
                  >
                    {NAMA_HARI_KAL.map((h) => (
                      <div key={h} className="kalender-hari-head">
                        {h}
                      </div>
                    ))}
                    {selKal.map((d, i) => {
                      if (d === null) return <div key={`kosong-${i}`} />;
                      const k = formatIsoTanggal(tahun, bulanIdx, d);
                      const itemsHari = catatanPerTanggal.get(k);
                      const hariIni = k === hariIniIso;
                      const terpilih = k === dariTgl || k === sampaiTgl;
                      const dalamRentang = Boolean(dariTgl && sampaiTgl && k > dariTgl && k < sampaiTgl);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => pilihTanggalKalender(k)}
                          onMouseEnter={() => setHoverTgl(k)}
                          onFocus={() => setHoverTgl(k)}
                          aria-pressed={terpilih}
                          className={[
                            "kalender-hari",
                            "kalender-hari-btn",
                            hariIni ? "aktif" : "",
                            itemsHari ? "ada" : "",
                            dalamRentang ? "rentang" : "",
                            terpilih ? "pilih" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="kalender-tgl">{d}</span>
                          {itemsHari ? (
                            <div className="kalender-dot">
                              {itemsHari.slice(0, 3).map((it, idx) => {
                                const toneRaw = toneStatusKesehatan(it.status_kesehatan);
                                const tone = toneRaw === "default" ? "safe" : toneRaw;
                                return (
                                  <Badge key={idx} tone={tone} className="dot">
                                    {it.id}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="row-between wrap gap-8 mt-10">
                  <div className="row gap-10 wrap tiny">
                    <span>
                      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--safe)", verticalAlign: "middle", marginRight: 4 }} aria-hidden="true" />
                      Normal
                    </span>
                    <span>
                      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--warning)", verticalAlign: "middle", marginRight: 4 }} aria-hidden="true" />
                      Perlu Perhatian
                    </span>
                    <span>
                      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--danger)", verticalAlign: "middle", marginRight: 4 }} aria-hidden="true" />
                      Berisiko
                    </span>
                  </div>
                  <span className="tiny">Klik 1× hari · 2× rentang</span>
                </div>
              </div>

              {/* KOLOM KANAN: PRESET, RENTANG & REVIEW SAAT HOVER TANGGAL */}
              <div className="kal-side-panel">
                <div className="kal-range-banner">
                  <label className="kal-date-pill" htmlFor="filter-dari-tgl">
                    <span className="kal-date-pill-lbl">Dari Tanggal</span>
                    <span className="kal-date-pill-row">
                      <span className={`kal-date-pill-val${dariTgl ? "" : " is-muted"}`}>
                        {dariTgl ? tanggal(dariTgl) : "Pilih awal"}
                      </span>
                      <Icon name="calendar" size={14} />
                    </span>
                    <input
                      id="filter-dari-tgl"
                      type="date"
                      className="kal-date-native"
                      value={dariTgl}
                      max={sampaiTgl || undefined}
                      onChange={(e) => {
                        setDariTgl(e.target.value);
                        setMenungguAkhir(false);
                        if (e.target.value) {
                          const [yy, mm] = e.target.value.split("-").map(Number);
                          if (yy && mm) setBulanKalender(new Date(yy, mm - 1, 1));
                        }
                        setHalaman(1);
                      }}
                    />
                  </label>
                  <span className="kal-range-sep" aria-hidden="true">
                    <Icon name="arrow-right" size={14} />
                  </span>
                  <label className="kal-date-pill" htmlFor="filter-sampai-tgl">
                    <span className="kal-date-pill-lbl">Sampai Tanggal</span>
                    <span className="kal-date-pill-row">
                      <span className={`kal-date-pill-val${sampaiTgl ? "" : " is-muted"}`}>
                        {sampaiTgl ? tanggal(sampaiTgl) : "Pilih akhir"}
                      </span>
                      <Icon name="calendar" size={14} />
                    </span>
                    <input
                      id="filter-sampai-tgl"
                      type="date"
                      className="kal-date-native"
                      value={sampaiTgl}
                      min={dariTgl || undefined}
                      onChange={(e) => {
                        setSampaiTgl(e.target.value);
                        setMenungguAkhir(false);
                        if (e.target.value) {
                          const [yy, mm] = e.target.value.split("-").map(Number);
                          if (yy && mm) setBulanKalender(new Date(yy, mm - 1, 1));
                        }
                        setHalaman(1);
                      }}
                    />
                  </label>
                </div>

                <div className="kal-preset-row">
                  <button
                    type="button"
                    className={`chip${aktifHariIni ? " is-active" : ""}`}
                    onClick={() => {
                      setDariTgl(hariIniIso);
                      setSampaiTgl(hariIniIso);
                      setMenungguAkhir(false);
                      setBulanKalender(new Date(nowKal.getFullYear(), nowKal.getMonth(), 1));
                      setHalaman(1);
                    }}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    className={`chip${aktif7Hari ? " is-active" : ""}`}
                    onClick={() => {
                      setDariTgl(tujuhHariIso);
                      setSampaiTgl(hariIniIso);
                      setMenungguAkhir(false);
                      setBulanKalender(new Date(nowKal.getFullYear(), nowKal.getMonth(), 1));
                      setHalaman(1);
                    }}
                  >
                    7 Hari
                  </button>
                  <button
                    type="button"
                    className={`chip${aktifBulanIni ? " is-active" : ""}`}
                    onClick={() => {
                      setDariTgl(awalBulanIso);
                      setSampaiTgl(hariIniIso);
                      setMenungguAkhir(false);
                      setBulanKalender(new Date(nowKal.getFullYear(), nowKal.getMonth(), 1));
                      setHalaman(1);
                    }}
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    className={`chip${aktifSemua ? " is-active" : ""}`}
                    onClick={resetFilterTanggal}
                  >
                    Semua
                  </button>
                </div>

                <div className="kal-review-card" aria-live="polite">
                  {tglReview && itemsReview.length > 0 ? (
                    <>
                      <div className="kal-review-head">
                        <div>
                          <div className="tiny" style={{ fontWeight: 700, color: "var(--primary)" }}>
                            Review Pemeriksaan
                          </div>
                          <strong className="text-sm">{tanggal(tglReview, "day")}</strong>
                        </div>
                        <Badge tone="primary">{itemsReview.length} catatan</Badge>
                      </div>
                      <div className="kal-review-list">
                        {itemsReview.map((item) => {
                          const ringkas: string[] = [];
                          if (item.bb_kg !== null) ringkas.push(`BB ${item.bb_kg} kg`);
                          if (item.sistol !== null && item.diastol !== null) ringkas.push(`Tensi ${item.sistol}/${item.diastol}`);
                          if (item.gula_darah !== null) ringkas.push(`Gula ${item.gula_darah} mg/dL`);
                          if (item.kolesterol !== null) ringkas.push(`Kolesterol ${item.kolesterol}`);
                          if (item.asam_urat !== null) ringkas.push(`Asam Urat ${item.asam_urat}`);
                          return (
                            <div key={item.id} className="kal-review-item">
                              <div className="row-between gap-6">
                                <span className="tiny" style={{ fontWeight: 600 }}>
                                  {LABEL_SUMBER[item.sumber] || item.sumber}
                                  {petugas && item.pengguna ? ` · ${item.pengguna.name}` : ""}
                                </span>
                                {item.status_kesehatan ? (
                                  <Badge tone={toneStatusKesehatan(item.status_kesehatan)}>
                                    {LABEL_STATUS_KESEHATAN[item.status_kesehatan]}
                                  </Badge>
                                ) : null}
                              </div>
                              {ringkas.length > 0 ? (
                                <div className="tiny mt-4" style={{ color: "var(--text)", fontWeight: 600 }}>
                                  {ringkas.join(" · ")}
                                </div>
                              ) : null}
                              {item.catatan ? (
                                <p className="tiny mt-4" style={{ marginBottom: 0 }}>
                                  “{item.catatan}”
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : tglReview ? (
                    <div className="kal-review-empty">
                      <span className="kal-review-ico">
                        <Icon name="calendar" size={16} />
                      </span>
                      <div className="text-sm mt-8" style={{ fontWeight: 600, color: "var(--text)" }}>
                        {tanggal(tglReview, "day")}
                      </div>
                      <p className="tiny mt-4" style={{ marginBottom: 0 }}>
                        Tidak ada catatan pemeriksaan pada tanggal ini.
                      </p>
                    </div>
                  ) : catatan.length > 0 ? (
                    <>
                      <div className="kal-review-head">
                        <div>
                          <div className="tiny" style={{ fontWeight: 700, color: "var(--primary)" }}>
                            Pemeriksaan Terakhir
                          </div>
                          <span className="tiny">Klik item atau sorot tanggal bertitik</span>
                        </div>
                        <Badge tone="primary">{catatan.length} total</Badge>
                      </div>
                      <div className="kal-review-list">
                        {catatan.slice(0, 4).map((item) => {
                          const isoItem = isoTanggalLokal(item.dicatat_pada);
                          const ringkas: string[] = [];
                          if (item.sistol !== null && item.diastol !== null) ringkas.push(`Tensi ${item.sistol}/${item.diastol}`);
                          if (item.gula_darah !== null) ringkas.push(`Gula ${item.gula_darah}`);
                          if (item.bb_kg !== null) ringkas.push(`${item.bb_kg} kg`);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className="kal-review-item kal-review-btn"
                              onClick={() => {
                                if (!isoItem) return;
                                const [yy, mm] = isoItem.split("-").map(Number);
                                if (yy && mm) setBulanKalender(new Date(yy, mm - 1, 1));
                                setDariTgl(isoItem);
                                setSampaiTgl(isoItem);
                                setMenungguAkhir(false);
                                setHalaman(1);
                              }}
                            >
                              <div className="row-between gap-6">
                                <strong className="tiny" style={{ color: "var(--text)" }}>
                                  {tanggal(item.dicatat_pada)}
                                </strong>
                                {item.status_kesehatan ? (
                                  <Badge tone={toneStatusKesehatan(item.status_kesehatan)}>
                                    {LABEL_STATUS_KESEHATAN[item.status_kesehatan]}
                                  </Badge>
                                ) : null}
                              </div>
                              {ringkas.length > 0 ? (
                                <div className="tiny mt-4">{ringkas.join(" · ")}</div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="kal-review-empty">
                      <span className="kal-review-ico">
                        <Icon name="eye" size={16} />
                      </span>
                      <div className="text-sm mt-8" style={{ fontWeight: 600, color: "var(--text)" }}>
                        Pratinjau Pemeriksaan
                      </div>
                      <p className="tiny mt-4" style={{ marginBottom: 0 }}>
                        Belum ada catatan pemeriksaan yang tersimpan.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <div className="mt-16">
        {baris.length === 0 ? (
          <EmptyState
            icon="heart-pulse"
            title={catatan.length === 0 ? "Belum ada catatan" : "Tidak ada catatan yang cocok"}
            desc={
              catatan.length === 0
                ? "Tekan tombol Catat di kanan atas untuk mulai mencatat."
                : "Coba ubah filter tanggal, status risiko, atau kata kunci pencarian."
            }
          />
        ) : (
          <div className="card mb-12" style={{ padding: 0, overflow: "hidden" }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Tanggal &amp; Sumber</th>
                    {petugas ? <th>Warga</th> : null}
                    <th>BB / IMT</th>
                    <th>Tekanan Darah</th>
                    <th>Gula Darah</th>
                    <th>Kol. / Asam Urat</th>
                    <th>Status</th>
                    <th className="num">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((c) => {
                    const layakRujuk =
                      bisaPilihWarga &&
                      Boolean(c.pengguna) &&
                      (c.status_kesehatan === "berisiko" || c.status_kesehatan === "perlu_perhatian");
                    return (
                      <tr key={c.id}>
                        <td>
                          <strong>{tanggal(c.dicatat_pada, "short")}</strong>
                          <div className="tiny">{LABEL_SUMBER[c.sumber] || c.sumber}</div>
                        </td>
                        {petugas ? (
                          <td>
                            {c.pengguna ? (
                              <>
                                <strong className="text-sm">{c.pengguna.name}</strong>
                                <div className="tiny">
                                  {bisaPilihWarga && c.pengguna.nik ? `NIK ${c.pengguna.nik}` : ""}
                                  {c.pengguna.wilayah?.nama ? ` · ${c.pengguna.wilayah.nama}` : ""}
                                </div>
                              </>
                            ) : (
                              <span className="tiny">—</span>
                            )}
                          </td>
                        ) : null}
                        <td>
                          <div>{c.bb_kg !== null ? `${c.bb_kg} kg` : "—"}</div>
                          {c.imt !== null ? (
                            <div className="tiny">
                              IMT {c.imt}
                              {c.kategori_imt ? (
                                <>
                                  {" "}
                                  <Badge tone={toneKategori(c.kategori_imt)}>
                                    {labelKategoriIndikator(c.kategori_imt)}
                                  </Badge>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {c.sistol !== null && c.diastol !== null ? (
                            <>
                              <strong>
                                {c.sistol}/{c.diastol} mmHg
                              </strong>
                              {c.kategori_tensi ? (
                                <div className="tiny">{labelKategoriIndikator(c.kategori_tensi)}</div>
                              ) : null}
                            </>
                          ) : (
                            <span className="tiny">—</span>
                          )}
                        </td>
                        <td>
                          {c.gula_darah !== null ? (
                            <>
                              <strong>
                                {c.gula_darah} {satuanGulaDarah(c.jenis_gula_darah)}
                              </strong>
                              <div className="tiny">
                                {c.jenis_gula_darah
                                  ? LABEL_JENIS_GULA_DARAH[c.jenis_gula_darah] ?? c.jenis_gula_darah
                                  : "Gula darah"}
                              </div>
                            </>
                          ) : (
                            <span className="tiny">—</span>
                          )}
                        </td>
                        <td>
                          {c.kolesterol !== null || c.asam_urat !== null ? (
                            <div className="tiny" style={{ color: "var(--text)" }}>
                              {c.kolesterol !== null ? <div>Kol: {c.kolesterol} mg/dL</div> : null}
                              {c.asam_urat !== null ? <div>AU: {c.asam_urat} mg/dL</div> : null}
                            </div>
                          ) : (
                            <span className="tiny">—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {c.perlu_verifikasi ? <Badge tone="warning">Verifikasi</Badge> : null}
                            {c.status_kesehatan ? (
                              <Badge tone={toneStatusKesehatan(c.status_kesehatan)}>
                                {LABEL_STATUS_KESEHATAN[c.status_kesehatan]}
                              </Badge>
                            ) : (
                              <span className="tiny">—</span>
                            )}
                          </div>
                        </td>
                        <td className="num">
                          <div className="row gap-6" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {bisaVerifikasi && c.perlu_verifikasi ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  disabled={verifikasiId === c.id}
                                  onClick={() => putuskanVerifikasi(c, true)}
                                  title="Setujui catatan"
                                >
                                  <Icon name="check" size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  disabled={verifikasiId === c.id}
                                  onClick={() => putuskanVerifikasi(c, false)}
                                  title="Tolak catatan"
                                >
                                  <Icon name="x" size={14} />
                                </button>
                              </>
                            ) : null}
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => setDetail(c)}>
                              <Icon name="eye" size={14} /> Detail
                            </button>
                            {layakRujuk ? (
                              <Link href={urlRujukDariCatatan(c)} className="btn btn-sm btn-primary">
                                <Icon name="send" size={14} /> Rujuk
                              </Link>
                            ) : null}
                            {bisaHapus ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => setHapusItem(c)}
                                title="Hapus catatan"
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <Pagination meta={meta} onPage={setHalaman} />
      </div>

      {/* Modal detail */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Catatan"
        footer={
          detail &&
          bisaPilihWarga &&
          detail.pengguna &&
          (detail.status_kesehatan === "berisiko" || detail.status_kesehatan === "perlu_perhatian") ? (
            <div className="row" style={{ justifyContent: "flex-end", width: "100%" }}>
              <Link href={urlRujukDariCatatan(detail)} className="btn btn-primary">
                <Icon name="send" size={15} /> Rujuk ke Faskes
              </Link>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <>
            <p className="tiny">
              {tanggal(detail.dicatat_pada, "day")} · {LABEL_SUMBER[detail.sumber] || detail.sumber}
            </p>
            {petugas && detail.pengguna ? (
              <p className="tiny">
                <Icon name="user" size={12} /> {detail.pengguna.name}
                {bisaPilihWarga && detail.pengguna.nik ? ` · NIK ${detail.pengguna.nik}` : ""}
                {detail.pengguna.wilayah?.nama ? ` · ${detail.pengguna.wilayah.nama}` : ""}
                {detail.dicatat_oleh ? ` · dicatat oleh ${detail.dicatat_oleh.name}` : ""}
              </p>
            ) : null}
            {detail.status_kesehatan ? (
              <div className="mt-8">
                <Badge tone={toneStatusKesehatan(detail.status_kesehatan)}>
                  Status: {LABEL_STATUS_KESEHATAN[detail.status_kesehatan]}
                </Badge>
              </div>
            ) : null}
            <dl className="dl mt-12">
              {detail.bb_kg !== null && <Baris label="Berat badan" nilai={`${detail.bb_kg} kg`} />}
              {detail.imt !== null && <Baris label="IMT" nilai={detail.imt} />}
              {detail.kategori_imt && <Baris label="Kategori IMT" nilai={labelKategoriIndikator(detail.kategori_imt)} />}
              {detail.sistol !== null && detail.diastol !== null && (
                <Baris label="Tekanan darah" nilai={`${detail.sistol}/${detail.diastol} mmHg`} />
              )}
              {detail.kategori_tensi && <Baris label="Kategori tensi" nilai={labelKategoriIndikator(detail.kategori_tensi)} />}
              {detail.gula_darah !== null && (
                <Baris
                  label="Gula darah"
                  nilai={`${detail.gula_darah} ${satuanGulaDarah(detail.jenis_gula_darah)}${
                    detail.jenis_gula_darah
                      ? ` (${LABEL_JENIS_GULA_DARAH[detail.jenis_gula_darah] ?? detail.jenis_gula_darah})`
                      : ""
                  }`}
                />
              )}
              {detail.kategori_gula_darah && (
                <Baris label="Kategori gula darah" nilai={labelKategoriIndikator(detail.kategori_gula_darah)} />
              )}
              {detail.kolesterol !== null && <Baris label="Kolesterol" nilai={`${detail.kolesterol} mg/dL`} />}
              {detail.kategori_kolesterol && (
                <Baris label="Kategori kolesterol" nilai={labelKategoriIndikator(detail.kategori_kolesterol)} />
              )}
              {detail.asam_urat !== null && <Baris label="Asam urat" nilai={`${detail.asam_urat} mg/dL`} />}
              {detail.kategori_asam_urat && (
                <Baris label="Kategori asam urat" nilai={labelKategoriIndikator(detail.kategori_asam_urat)} />
              )}
              {detail.lingkar_perut !== null && <Baris label="Lingkar perut" nilai={`${detail.lingkar_perut} cm`} />}
              {detail.tidur_jam !== null && <Baris label="Jam tidur" nilai={`${detail.tidur_jam} jam`} />}
            </dl>
            {detail.catatan ? (
              <>
                <div className="divider" />
                <div>
                  <div className="tiny">Catatan</div>
                  <p className="text-sm mt-4">{detail.catatan}</p>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </Modal>

      {/* Modal konfirmasi hapus */}
      <Modal
        open={!!hapusItem}
        onClose={() => setHapusItem(null)}
        title="Hapus Catatan Kesehatan"
        footer={
          <div className="row gap-8" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={() => setHapusItem(null)}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={sedangHapus}
              onClick={async () => {
                if (!hapusItem) return;
                setSedangHapus(true);
                try {
                  await catatanKesehatan.hapus(hapusItem.id);
                  setCatatan(catatan.filter((x) => x.id !== hapusItem.id));
                  toast.success("Catatan berhasil dihapus.");
                  setHapusItem(null);
                } catch (err: unknown) {
                  const apiErr = err instanceof ApiError ? err : null;
                  toast.warning(apiErr?.message || "Gagal menghapus catatan.");
                } finally {
                  setSedangHapus(false);
                }
              }}
            >
              {sedangHapus ? "Menghapus…" : "Ya, Hapus"}
            </button>
          </div>
        }
      >
        <p className="tiny">
          Apakah Anda yakin ingin menghapus catatan tanggal{" "}
          <b>{hapusItem ? tanggal(hapusItem.dicatat_pada, "day") : ""}</b>? Data yang dihapus tidak dapat dikembalikan.
        </p>
      </Modal>

      <CatatModal open={catatTerbuka} onClose={() => setCatatTerbuka(false)} onSaved={() => muat()} />
    </AppShell>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string | number }) {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{nilai}</dd>
    </div>
  );
}
