"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app/AppShell";
import Icon from "@/components/ui/Icon";
import Badge, { toneKategori } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination, { type Meta } from "@/components/ui/Pagination";
import CatatModal from "@/components/catatan/CatatModal";
import PilihWarga from "@/components/warga/PilihWarga";
import { EmptyState, Loading } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import { admin as adminApi, catatanKesehatan, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { tanggal } from "@/lib/format";
import {
  LABEL_STATUS_KESEHATAN,
  LABEL_SUMBER,
  labelKategoriIndikator,
  satuanGulaDarah,
} from "@/lib/labels";
import type { StatusKesehatan } from "@/lib/enums";
import type { CatatanKesehatan, WargaCari, Wilayah } from "@/types";

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

function labelSingkatGula(jenis?: string | null): string {
  if (jenis === "puasa") return "Puasa";
  if (jenis === "sewaktu") return "Sewaktu";
  if (jenis === "2jam_pp") return "2 Jam PP";
  if (jenis === "hba1c") return "HbA1c";
  return "Puasa";
}

function toneStatusKesehatan(s?: StatusKesehatan | null): "safe" | "warning" | "danger" | "default" {
  if (s === "berisiko") return "danger";
  if (s === "perlu_perhatian") return "warning";
  if (s === "normal") return "safe";
  return "default";
}

function toneIndikator(kode?: string | null) {
  if (!kode) return "default" as const;
  if (kode === "perlu_perhatian") return "warning" as const;
  return toneKategori(kode);
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
  const isSuperAdmin = user?.role === "super_admin";
  const isAdminKel = user?.role === "admin_kelurahan";
  const bisaCatat = !isAdminKel;
  const bisaHapus = !isAdminKel;
  const bisaVerifikasi = isAdminKel || isSuperAdmin;
  const [daftarKelurahan, setDaftarKelurahan] = useState<Wilayah[]>([]);
  const [wilayahDipilih, setWilayahDipilih] = useState<number | null>(null);
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
  const [perPage, setPerPage] = useState(PER_HALAMAN);
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
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = bisaPilihWarga ? wargaDipilih?.id : undefined;
  const targetWilayahId = isSuperAdmin && wilayahDipilih ? wilayahDipilih : undefined;

  useEffect(() => {
    if (!isSuperAdmin) return;
    let aktif = true;
    wilayahApi
      .list({ tipe: "kelurahan" })
      .then((res) => {
        if (!aktif) return;
        setDaftarKelurahan(
          [...(res ?? [])].sort((a, b) => a.nama.localeCompare(b.nama, "id")),
        );
      })
      .catch(() => {
        if (aktif) setDaftarKelurahan([]);
      });
    return () => {
      aktif = false;
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!user) return;
    let aktif = true;
    catatanKesehatan
      .list({ per_page: 100, user_id: targetUserId, wilayah_id: targetWilayahId })
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
  }, [user, targetUserId, targetWilayahId]);

  async function muat() {
    try {
      setLoading(true);
      const cList = await catatanKesehatan.list({
        per_page: 100,
        user_id: targetUserId,
        wilayah_id: targetWilayahId,
      });
      setCatatan(cList);
      setError(null);
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      console.error("Rekam medis fetch error:", err);
      setError(apiErr?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

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
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const halamanAman = Math.min(halaman, lastPage);
  const baris = tersaring.slice((halamanAman - 1) * perPage, halamanAman * perPage);

  const meta: Meta = { page: halamanAman, per_page: perPage, total, last_page: lastPage };

  if (tampilLoading) {
    return (
      <AppShell noFab>
        <Loading text="Data rekam medis sedang dimuat…" variant="cards" />
      </AppShell>
    );
  }

  const jumlahNormal = catatan.filter((c) => c.status_kesehatan === "normal").length;

  return (
    <AppShell noFab>
      {error && (
        <div className="alert alert-warning mb-16">
          <Icon name="alert-circle" />
          <div>{error}</div>
        </div>
      )}

      <div
        className="mb-16"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 className="h3" style={{ margin: 0 }}>Rekam Medis</h1>
          <p className="tiny mt-4" style={{ marginBottom: 0 }}>
            {isAdminKel
              ? "Riwayat pemeriksaan warga kelurahan (hanya lihat, tidak bisa diubah)."
              : "Riwayat pemeriksaan kesehatan Anda. Grafik tren tersedia langsung di Beranda."}
          </p>
        </div>
        {bisaCatat ? (
          <button
            className="btn btn-sm btn-primary"
            type="button"
            style={{ flexShrink: 0 }}
            onClick={() => setCatatTerbuka(true)}
          >
            <Icon name="plus" size={16} /> Catat Kesehatan
          </button>
        ) : null}
      </div>

      <div
        className="mb-16"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: "14px 16px" }}>
          <div className="tiny">Total Catatan</div>
          <div className="metric-val">{catatan.length}</div>
        </div>
        <div className="card" style={{ padding: "14px 16px" }}>
          <div className="tiny">Normal</div>
          <div className="metric-val" style={{ color: "var(--safe)" }}>{jumlahNormal}</div>
        </div>
        <div className="card" style={{ padding: "14px 16px" }}>
          <div className="tiny">Perlu Perhatian</div>
          <div className="metric-val" style={{ color: "var(--warning)" }}>{jumlahPerhatian}</div>
        </div>
        <div className="card" style={{ padding: "14px 16px" }}>
          <div className="tiny">Berisiko</div>
          <div className="metric-val" style={{ color: "var(--danger)" }}>{jumlahBerisiko}</div>
        </div>
      </div>

      {bisaPilihWarga ? (
        <div className="card card-flat mb-16">
          {isSuperAdmin ? (
            <div className="grid grid-2" style={{ gap: 14, alignItems: "start" }}>
              <div className="field">
                <label className="label" htmlFor="rekam-medis-kelurahan">
                  Filter kelurahan <span className="muted">(opsional)</span>
                </label>
                <select
                  id="rekam-medis-kelurahan"
                  className="select"
                  value={wilayahDipilih ?? ""}
                  onChange={(e) => {
                    const nextWil = e.target.value ? Number(e.target.value) : null;
                    setWilayahDipilih(nextWil);
                    setWargaDipilih(null);
                    setHalaman(1);
                  }}
                >
                  <option value="">Semua kelurahan</option>
                  {daftarKelurahan.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama}
                    </option>
                  ))}
                </select>
                <span className="hint">
                  Pilih kelurahan untuk menampilkan daftar dropdown warga di wilayah tersebut.
                </span>
              </div>
              <PilihWarga
                key={wilayahDipilih ?? "all"}
                value={wargaDipilih}
                onChange={(w) => {
                  setWargaDipilih(w);
                  setHalaman(1);
                }}
                id="rekam-medis-warga"
                label={wilayahDipilih ? "Pilih warga kelurahan" : "Filter per warga (opsional, cari NIK atau nama)"}
                wilayahId={wilayahDipilih}
                required={false}
              />
            </div>
          ) : (
            <PilihWarga
              value={wargaDipilih}
              onChange={(w) => {
                setWargaDipilih(w);
                setHalaman(1);
              }}
              id="rekam-medis-warga"
              label="Filter per warga (opsional, cari NIK atau nama warga)"
              wilayahId={user?.role === "kader" ? user.wilayah_id : null}
              required={false}
            />
          )}
        </div>
      ) : null}

      <div className="app-section-title mt-8">
        <h2>Riwayat Catatan</h2>
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
                          if (item.gula_darah !== null) {
                            ringkas.push(
                              `Gula ${item.gula_darah} ${satuanGulaDarah(item.jenis_gula_darah)} (${labelSingkatGula(item.jenis_gula_darah)})`,
                            );
                          }
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
                          if (item.gula_darah !== null) {
                            ringkas.push(
                              `Gula ${item.gula_darah} ${satuanGulaDarah(item.jenis_gula_darah)} (${labelSingkatGula(item.jenis_gula_darah)})`,
                            );
                          }
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
              <table className="tbl compact tbl-excel" style={{ width: "100%", fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Tanggal</th>
                    <th style={{ textAlign: "left" }}>Sumber</th>
                    {petugas ? <th style={{ textAlign: "left" }}>Warga</th> : null}
                    <th style={{ textAlign: "center" }}>BB (kg)</th>
                    <th style={{ textAlign: "center" }}>IMT</th>
                    <th style={{ textAlign: "center" }}>Tensi</th>
                    <th style={{ textAlign: "center" }}>Gula</th>
                    <th style={{ textAlign: "center" }}>Kol.</th>
                    <th style={{ textAlign: "center" }}>As. Urat</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th style={{ textAlign: "left" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((c) => {
                    const layakRujuk =
                      bisaPilihWarga &&
                      Boolean(c.pengguna) &&
                      (c.status_kesehatan === "berisiko" || c.status_kesehatan === "perlu_perhatian");
                    const bbTampil = c.bb_kg !== null ? Number(c.bb_kg).toFixed(1) : "—";
                    const imtTampil = c.imt !== null ? Number(c.imt).toFixed(1) : "—";
                    const gulaTampil =
                      c.gula_darah !== null
                        ? `${Number(c.gula_darah)}${c.jenis_gula_darah ? ` · ${labelSingkatGula(c.jenis_gula_darah)}` : ""}`
                        : "—";
                    const toneSumber =
                      c.sumber === "puskesmas" ? "info" : c.sumber === "kader" ? "primary" : "default";

                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500, textAlign: "left" }}>
                          {tanggal(c.dicatat_pada, "short")}
                        </td>
                        <td style={{ textAlign: "left" }}>
                          <Badge tone={toneSumber}>{LABEL_SUMBER[c.sumber] || c.sumber}</Badge>
                        </td>
                        {petugas ? (
                          <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>
                            {c.pengguna ? (
                              <span title={bisaPilihWarga && c.pengguna.nik ? `NIK ${c.pengguna.nik}` : c.pengguna.name}>
                                {c.pengguna.name}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        ) : null}
                        <td style={{ textAlign: "center" }}>{bbTampil}</td>
                        <td style={{ textAlign: "center" }}>
                          {c.imt !== null ? (
                            <span title={c.kategori_imt ? labelKategoriIndikator(c.kategori_imt) : undefined}>
                              {imtTampil}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {c.sistol !== null && c.diastol !== null ? `${c.sistol}/${c.diastol}` : "—"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            title={
                              c.gula_darah !== null
                                ? `${c.gula_darah} ${satuanGulaDarah(c.jenis_gula_darah)}`
                                : undefined
                            }
                          >
                            {gulaTampil}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {c.kolesterol !== null ? c.kolesterol : "—"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {c.asam_urat !== null ? Number(c.asam_urat).toFixed(1) : "—"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                            {c.perlu_verifikasi ? <Badge tone="warning">Verifikasi</Badge> : null}
                            {c.status_kesehatan ? (
                              <Badge tone={toneStatusKesehatan(c.status_kesehatan)}>
                                {LABEL_STATUS_KESEHATAN[c.status_kesehatan]}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "left" }}>
                          <div className="row gap-6" style={{ justifyContent: "flex-start", alignItems: "center", flexWrap: "nowrap" }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-icon btn-outline"
                              onClick={() => setDetail(c)}
                              title="Lihat detail catatan"
                              aria-label="Lihat detail catatan"
                            >
                              <Icon name="eye" size={14} />
                            </button>
                            {bisaHapus ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-icon btn-danger"
                                style={{ color: "#ffffff" }}
                                onClick={() => setHapusItem(c)}
                                title="Hapus catatan"
                                aria-label="Hapus catatan"
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            ) : null}
                            {layakRujuk ? (
                              <Link
                                href={urlRujukDariCatatan(c)}
                                className="btn btn-sm btn-icon btn-primary"
                                title="Buat rujukan"
                                aria-label="Buat rujukan"
                              >
                                <Icon name="send" size={14} />
                              </Link>
                            ) : null}
                            {bisaVerifikasi && c.perlu_verifikasi ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-icon btn-primary"
                                  style={{ color: "#ffffff" }}
                                  disabled={verifikasiId === c.id}
                                  onClick={() => putuskanVerifikasi(c, true)}
                                  title="Setujui catatan"
                                  aria-label="Setujui catatan"
                                >
                                  <Icon name="check" size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-icon btn-danger"
                                  style={{ color: "#ffffff" }}
                                  disabled={verifikasiId === c.id}
                                  onClick={() => putuskanVerifikasi(c, false)}
                                  title="Tolak catatan"
                                  aria-label="Tolak catatan"
                                >
                                  <Icon name="x" size={14} />
                                </button>
                              </>
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
        <Pagination
          meta={meta}
          onPage={setHalaman}
          perPage={perPage}
          onPerPage={(n) => {
            setPerPage(n);
            setHalaman(1);
          }}
        />
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
          <div>
            {/* Ringkasan singkat tanpa kotak tambahan */}
            <div className="row-between" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="tiny">
                {tanggal(detail.dicatat_pada, "day")} · {LABEL_SUMBER[detail.sumber] || detail.sumber}
              </span>
              <div className="row gap-6" style={{ alignItems: "center" }}>
                {detail.status_kesehatan ? (
                  <Badge tone={toneStatusKesehatan(detail.status_kesehatan)} dot>
                    {LABEL_STATUS_KESEHATAN[detail.status_kesehatan]}
                  </Badge>
                ) : null}
                {detail.perlu_verifikasi ? <Badge tone="warning">Perlu Verifikasi</Badge> : null}
              </div>
            </div>

            {petugas && detail.pengguna ? (
              <p className="tiny mt-4" style={{ marginBottom: 0 }}>
                <Icon name="user" size={12} /> {detail.pengguna.name}
                {bisaPilihWarga && detail.pengguna.nik ? ` · NIK ${detail.pengguna.nik}` : ""}
                {detail.pengguna.wilayah?.nama ? ` · ${detail.pengguna.wilayah.nama}` : ""}
                {detail.dicatat_oleh ? ` · dicatat oleh ${detail.dicatat_oleh.name}` : ""}
              </p>
            ) : null}

            {/* Daftar metrik bersih: label kiri, nilai + kategori kanan */}
            <dl className="dl-rows mt-12">
              {detail.bb_kg !== null && (
                <BarisDetail
                  label="Berat badan"
                  nilai={`${Number(detail.bb_kg)} kg${detail.tinggi_cm !== null ? ` · ${detail.tinggi_cm} cm` : ""}`}
                />
              )}
              {detail.imt !== null && (
                <BarisDetail
                  label="IMT"
                  nilai={Number(detail.imt).toFixed(2)}
                  kategori={detail.kategori_imt}
                />
              )}
              {detail.sistol !== null && detail.diastol !== null && (
                <BarisDetail
                  label="Tekanan darah"
                  nilai={`${detail.sistol}/${detail.diastol} mmHg`}
                  kategori={detail.kategori_tensi}
                />
              )}
              {detail.gula_darah !== null && (
                <BarisDetail
                  label={
                    detail.jenis_gula_darah
                      ? `Gula darah (${labelSingkatGula(detail.jenis_gula_darah)})`
                      : "Gula darah"
                  }
                  nilai={`${detail.gula_darah} ${satuanGulaDarah(detail.jenis_gula_darah)}`}
                  kategori={detail.kategori_gula_darah}
                />
              )}
              {detail.kolesterol !== null && (
                <BarisDetail
                  label="Kolesterol"
                  nilai={`${detail.kolesterol} mg/dL`}
                  kategori={detail.kategori_kolesterol}
                />
              )}
              {detail.asam_urat !== null && (
                <BarisDetail
                  label="Asam urat"
                  nilai={`${detail.asam_urat} mg/dL`}
                  kategori={detail.kategori_asam_urat}
                />
              )}
              {detail.lingkar_perut !== null && (
                <BarisDetail label="Lingkar perut" nilai={`${detail.lingkar_perut} cm`} />
              )}
              {detail.tidur_jam !== null && (
                <BarisDetail label="Jam tidur" nilai={`${detail.tidur_jam} jam`} />
              )}
            </dl>

            {detail.catatan ? (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
                <div className="tiny">Catatan</div>
                <p className="text-sm mt-4" style={{ margin: "4px 0 0", lineHeight: 1.5 }}>
                  {detail.catatan}
                </p>
              </div>
            ) : null}
          </div>
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

function BarisDetail({
  label,
  nilai,
  kategori,
}: {
  label: string;
  nilai: string | number;
  kategori?: string | null;
}) {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  return (
    <div className="dl-row">
      <dt>{label}</dt>
      <dd
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{nilai}</span>
        {kategori ? <Badge tone={toneIndikator(kategori)}>{labelKategoriIndikator(kategori)}</Badge> : null}
      </dd>
    </div>
  );
}
