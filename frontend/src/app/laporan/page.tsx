"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/app/AppShell";
import { BrandLockup } from "@/components/ui/BrandLogo";
import Icon from "@/components/ui/Icon";
import Badge from "@/components/ui/Badge";
import Bar from "@/components/charts/Bar";
import Donut from "@/components/charts/Donut";
import Line from "@/components/charts/Line";
import { ErrorState, Loading } from "@/components/ui/Empty";
import { useToast } from "@/components/ui/Toast";
import { laporan as laporanApi, wilayah as wilayahApi, ApiError } from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { useMinLoading } from "@/hooks/useMinLoading";
import { LABEL_KATEGORI_IMT, LABEL_FAKTOR } from "@/lib/labels";
import { angka } from "@/lib/format";
import type { LaporanKelurahan, Wilayah } from "@/types";
import type { KategoriImt } from "@/lib/enums";

/* Laporan agregat kelurahan — kontrak §14.2.
   Suppression sel < 5 dijalankan backend (§9.2); FE tidak pernah
   menerima angka mentah, jadi tidak ada yang perlu disaring di sini. */

type Periode = "1m" | "3m" | "6m" | "1y";

const LABEL_PERIODE: Record<Periode, string> = {
  "1m": "1 bulan",
  "3m": "3 bulan",
  "6m": "6 bulan",
  "1y": "12 bulan",
};

const CSS_CETAK_LAPORAN = `
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #182015;
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .lap-sheet { background: #fff; color: #182015; }
  .lap-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 2.5px solid #2b3d18;
    margin-bottom: 14px;
  }
  .lap-brand { display: flex; align-items: center; gap: 12px; }
  .lap-instansi {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .08em;
    color: #4f6224;
    margin: 0 0 2px;
    text-transform: uppercase;
  }
  .lap-head h1 { margin: 0; font-size: 16px; color: #1f3319; }
  .lap-head p { margin: 2px 0 0; font-size: 11px; color: #4e5846; }
  .lap-meta { text-align: right; font-size: 11px; color: #4e5846; white-space: nowrap; }
  .lap-meta strong { display: block; color: #182015; font-size: 12.5px; margin-bottom: 2px; }
  .lap-meta span { display: block; line-height: 1.45; }
  .lap-sec {
    margin: 13px 0 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: #4f6224;
  }
  .lap-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  .lap-kpi {
    border: 1px solid #d5ddcd;
    border-radius: 6px;
    padding: 8px 10px;
    background: #fafcf7;
  }
  .lap-kpi span { display: block; font-size: 10.5px; color: #4e5846; }
  .lap-kpi strong { display: block; font-size: 16px; color: #182015; margin-top: 2px; }
  .lap-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 6px; }
  .lap-table th, .lap-table td {
    border: 1px solid #d5ddcd;
    padding: 6px 9px;
    text-align: left;
    vertical-align: middle;
  }
  .lap-table th { background: #f3f7ec; color: #364526; font-weight: 700; font-size: 11px; }
  .lap-num { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .lap-bar-wrap { width: 100%; height: 8px; background: #e8ede0; border-radius: 99px; overflow: hidden; }
  .lap-bar-fill { display: block; height: 100%; border-radius: 99px; }
  .lap-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
  .lap-block { break-inside: avoid; }
  .lap-note {
    margin-top: 12px;
    padding: 8px 10px;
    background: #f6f8f3;
    border-left: 3px solid #657a2d;
    font-size: 10.5px;
    color: #4e5846;
    line-height: 1.45;
  }
  .lap-sign {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
    font-size: 11.5px;
    break-inside: avoid;
  }
  .lap-sign-box { width: 220px; text-align: center; }
  .lap-sign-box span { display: block; color: #4e5846; }
  .lap-sign-space { height: 44px; }
`;

export default function LaporanKelurahanPage() {
  const toast = useToast();
  const { user, loading: loadingUser } = useUser();
  const laporanPrintRef = useRef<HTMLDivElement | null>(null);
  const [periode, setPeriode] = useState<Periode>("3m");
  const [d, setD] = useState<LaporanKelurahan | null>(null);
  const [loading, setLoading] = useState(true);
  const tampilLoading = useMinLoading(loading);
  const [error, setError] = useState("");

  /* super_admin dapat melihat agregat semua kelurahan (wilayahId = null)
     atau memilih kelurahan spesifik dari daftar wilayah. */
  const perluPilihWilayah = user?.role === "super_admin";
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [wilayahId, setWilayahId] = useState<number | null>(null);

  useEffect(() => {
    if (!perluPilihWilayah) return;
    let aktif = true;
    wilayahApi
      .list({ tipe: "kelurahan" })
      .then((rows) => {
        if (!aktif) return;
        setWilayahList(rows);
      })
      .catch(() => {
        if (!aktif) return;
        setWilayahList([]);
      });
    return () => {
      aktif = false;
    };
  }, [perluPilihWilayah]);

  const muat = useCallback(async () => {
    if (loadingUser) return;
    setLoading(true);
    try {
      const data = await laporanApi.kelurahan({
        periode,
        ...(perluPilihWilayah && wilayahId ? { wilayah_id: wilayahId } : {}),
      });
      setD(data);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }, [periode, perluPilihWilayah, wilayahId, loadingUser]);

  useEffect(() => {
    if (loadingUser) return;
    let aktif = true;
    laporanApi
      .kelurahan({
        periode,
        ...(perluPilihWilayah && wilayahId ? { wilayah_id: wilayahId } : {}),
      })
      .then((data) => {
        if (!aktif) return;
        setD(data);
        setError("");
      })
      .catch((err) => {
        if (aktif) setError(err instanceof ApiError ? err.message : "Gagal memuat laporan");
      })
      .finally(() => {
        if (aktif) setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [periode, perluPilihWilayah, wilayahId, loadingUser]);

  const wilayahAktifNama =
    (wilayahId ? wilayahList.find((w) => w.id === wilayahId)?.nama : null) ||
    (perluPilihWilayah ? d?.wilayah?.nama || "Semua Kelurahan" : user?.wilayah?.nama || "Kota Banjarbaru");

  function cetakLaporanPdf() {
    if (!d || !laporanPrintRef.current) return;

    const clone = laporanPrintRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src && src.startsWith("/")) {
        img.setAttribute("src", `${window.location.origin}${src}`);
      }
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      toast.error("Browser tidak mendukung pencetakan terisolasi.");
      return;
    }

    const namaAman = wilayahAktifNama.replace(/[<>&"]/g, "");
    doc.open();
    doc.write(
      `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan Agregat Kesehatan - ${namaAman}</title><style>${CSS_CETAK_LAPORAN}</style></head><body>${clone.outerHTML}</body></html>`,
    );
    doc.close();

    const imgs = Array.from(doc.images);
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
            setTimeout(() => resolve(), 600);
          }),
      ),
    ).then(() => {
      const hapus = () => {
        setTimeout(() => iframe.remove(), 300);
      };
      win.addEventListener("afterprint", hapus, { once: true });
      win.focus();
      win.print();
      setTimeout(hapus, 60000);
    });
  }

  return (
    <AppShell greet="Laporan Kelurahan" roles={["admin_kelurahan", "super_admin"]}>
      <div className="print-head">
        <div className="row" style={{ gap: 12 }}>
          <BrandLockup variant="sm" />
          <div>
            <strong>Laporan Agregat Kesehatan — SehatKita</strong>
            <span>Pemerintah Kota Banjarbaru · Wilayah {wilayahAktifNama}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <strong>Periode {LABEL_PERIODE[periode]}</strong>
          <span>Dicetak {new Date().toLocaleDateString("id-ID")}</span>
        </div>
      </div>

      <section className="no-print">
        <div className="row-between wrap gap-12">
          <div>
            <h1 className="h3">Laporan Ringkasan Wilayah</h1>
            <p className="tiny">
              Ringkasan capaian skrining, profil IMT, faktor risiko, dan rujukan {wilayahAktifNama} (tanpa data pribadi perorangan).
            </p>
          </div>
          <div className="row-end wrap" style={{ gap: 8, alignItems: "center" }}>
            {perluPilihWilayah ? (
              <select
                value={wilayahId ?? ""}
                onChange={(e) => {
                  setLoading(true);
                  setWilayahId(Number(e.target.value) || null);
                }}
                className="select"
                aria-label="Pilih kelurahan"
                style={{
                  width: "auto",
                  minWidth: 165,
                  maxWidth: 220,
                  minHeight: 38,
                  height: 38,
                  padding: "6px 34px 6px 12px",
                  fontSize: ".8125rem",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <option value="">Semua Kelurahan</option>
                {wilayahList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="segment" role="group" aria-label="Pilih periode laporan">
              {(Object.keys(LABEL_PERIODE) as Periode[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={periode === p ? "active" : ""}
                  onClick={() => {
                    if (periode === p) return;
                    setLoading(true);
                    setPeriode(p);
                  }}
                >
                  {LABEL_PERIODE[p]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ minHeight: 38, height: 38, whiteSpace: "nowrap" }}
              disabled={!d || loading}
              onClick={cetakLaporanPdf}
            >
              <Icon name="download" size={16} /> Cetak / PDF
            </button>
          </div>
        </div>
      </section>

      {tampilLoading ? (
        <Loading />
      ) : error || !d ? (
        <ErrorState message={error || "Data tidak tersedia"} onRetry={muat} />
      ) : (() => {
        const rasioAktif =
          d.total_peserta > 0
            ? Math.min(100, Math.round((d.total_pengguna_aktif / d.total_peserta) * 100))
            : 0;
        const rataCatatan =
          d.total_pengguna_aktif > 0
            ? (d.total_pencatatan / d.total_pengguna_aktif).toFixed(1)
            : "0.0";
        const totalImt = d.distribusi_imt.reduce((s, x) => s + x.jumlah, 0);
        const jumlahNormal =
          d.distribusi_imt.find((x) => (x.kategori || "").toLowerCase().includes("normal"))?.jumlah ?? 0;
        const jumlahBerisikoImt = d.distribusi_imt
          .filter((x) => {
            const k = (x.kategori || "").toLowerCase();
            return k.includes("gemuk") || k.includes("obesitas");
          })
          .reduce((s, x) => s + x.jumlah, 0);
        const persenNormal = persen(jumlahNormal, totalImt);
        const persenBerisiko = persen(jumlahBerisikoImt, totalImt);
        const totalUsia = d.distribusi_kelompok_usia.reduce((s, x) => s + x.jumlah, 0);
        const totalFaktor = d.distribusi_riwayat_keluarga.reduce((s, x) => s + (x.jumlah || 0), 0);

        const kpiItems = [
          {
            id: "peserta",
            label: "Peserta Terdaftar",
            value: angka(d.total_peserta),
            subtitle: `Wilayah ${wilayahAktifNama}`,
          },
          {
            id: "aktif",
            label: "Pengguna Aktif",
            value: angka(d.total_pengguna_aktif),
            subtitle: `${rasioAktif}% dari peserta terdaftar`,
          },
          {
            id: "pencatatan",
            label: "Total Pencatatan",
            value: angka(d.total_pencatatan),
            subtitle: `Rata-rata ${rataCatatan} catatan / peserta aktif`,
          },
          {
            id: "kepatuhan",
            label: "Kepatuhan Rutin",
            value: `${d.kepatuhan_pencatatan_persen}%`,
            subtitle: d.kepatuhan_pencatatan_persen >= 70 ? "Capaian baik (≥ 70%)" : "Target ideal ≥ 70%",
          },
        ];

        const warnaFaktor = ["var(--c-1)", "var(--c-2)", "var(--c-3)", "var(--c-4)", "var(--c-5)", "var(--c-6)"];
        const statusRujukanCards = (
          [
            ["baru", "Baru Masuk", "var(--danger)"],
            ["dihubungi", "Sedang Diproses", "var(--warning)"],
            ["selesai", "Selesai Ditangani", "var(--safe)"],
            ["ditolak", "Ditolak", "var(--info, #4B6251)"],
          ] as const
        ).filter(([k]) => d.rujukan[k] !== undefined);

        return (
          <>
            {/* Baris info ringkas & strip metrik datar (tanpa 5 card KPI/strip terpisah) */}
            <div className="lap-summary-bar mt-12">
              <div className="tiny">
                <strong className="text-1">
                  {wilayahAktifNama} · Periode {LABEL_PERIODE[periode]}:
                </strong>{" "}
                {totalImt > 0
                  ? `${persenNormal}% peserta terukur ber-IMT normal, ${persenBerisiko}% tergolong gemuk/obesitas.`
                  : "Belum ada proporsi IMT terukur yang cukup pada periode ini."}
              </div>
              <div className="row wrap gap-6">
                <Badge tone="safe">{angka(totalImt)} terukur IMT</Badge>
                <Badge tone="primary">{angka(totalFaktor)} laporan riwayat</Badge>
              </div>
            </div>

            <div className="kpi-strip-flat mt-12 mb-16">
              {kpiItems.map((item) => (
                <div key={item.id} className="kpi-strip-item">
                  <span className="kpi-strip-label">{item.label}</span>
                  <strong className="kpi-strip-val">{item.value}</strong>
                  <span className="kpi-strip-sub">{item.subtitle}</span>
                </div>
              ))}
            </div>

            {/* 1 Panel Laporan Terpadu: IMT & Tren + Riwayat & Usia + Status Rujukan */}
            <section className="card sa-board">
              <div className="sa-board-cols is-even">
                <div className="sa-col">
                  <div className="sa-panel-head">
                    <div>
                      <h2 className="sa-panel-title">Distribusi IMT Peserta</h2>
                      <p className="sa-panel-sub">Proporsi dari {angka(totalImt)} peserta terukur</p>
                    </div>
                    {totalImt > 0 ? <Badge tone="primary">{persenNormal}% Normal</Badge> : null}
                  </div>
                  {d.distribusi_imt.length ? (
                    <Donut
                      segments={d.distribusi_imt.map((x) => ({
                        label: labelImt(x.kategori),
                        value: x.jumlah,
                        color: warnaImt(x.kategori),
                      }))}
                      centerLabel="Peserta"
                      centerValue={angka(totalImt)}
                    />
                  ) : (
                    <p className="tiny center py-16">Belum ada data IMT pada periode ini.</p>
                  )}
                </div>

                <div className="sa-col sa-col-split">
                  <div className="sa-panel-head">
                    <div>
                      <h2 className="sa-panel-title">Tren Pencatatan ({LABEL_PERIODE[periode]})</h2>
                      <p className="sa-panel-sub">Perkembangan pencatatan skrining PTM per rentang waktu</p>
                    </div>
                    <Badge tone="safe">{angka(d.total_pencatatan)} total</Badge>
                  </div>
                  {d.tren.length ? (
                    <Line
                      labels={d.tren.map((x) => x.periode)}
                      series={[{ name: "Pencatatan", data: d.tren.map((x) => x.total_pencatatan) }]}
                      unit="catatan"
                      height={215}
                    />
                  ) : (
                    <p className="tiny center py-16">Belum ada pencatatan pada periode ini.</p>
                  )}
                </div>
              </div>

              <div className="sa-board-cols is-even board-band">
                <div className="sa-col">
                  <div className="sa-panel-head">
                    <div>
                      <h3 className="sa-panel-title">Faktor Riwayat Keluarga</h3>
                      <p className="sa-panel-sub">Penyakit keturunan PTM hasil self-report peserta</p>
                    </div>
                    <Badge tone="warning">{angka(totalFaktor)} laporan</Badge>
                  </div>
                  {d.distribusi_riwayat_keluarga.length ? (
                    <Bar
                      labels={d.distribusi_riwayat_keluarga.map(
                        (x) => LABEL_FAKTOR[x.faktor ?? ""] ?? x.faktor ?? "",
                      )}
                      values={d.distribusi_riwayat_keluarga.map((x) => x.jumlah)}
                      colors={d.distribusi_riwayat_keluarga.map((_, i) => warnaFaktor[i % warnaFaktor.length])}
                      height={240}
                      horizontal
                    />
                  ) : (
                    <p className="tiny center py-16">Belum ada riwayat keluarga tercatat.</p>
                  )}
                </div>

                <div className="sa-col sa-col-split">
                  <div className="sa-panel-head">
                    <div>
                      <h3 className="sa-panel-title">Distribusi Kelompok Usia</h3>
                      <p className="sa-panel-sub">Proporsi dari {angka(totalUsia)} peserta terhitung</p>
                    </div>
                    <Badge tone="info">{angka(totalUsia)} peserta</Badge>
                  </div>
                  {d.distribusi_kelompok_usia.length ? (
                    <div style={{ display: "grid", gap: 12, marginTop: 6 }}>
                      {d.distribusi_kelompok_usia.map((item, idx) => {
                        const pct = persen(item.jumlah, totalUsia);
                        const warna = warnaFaktor[idx % warnaFaktor.length];
                        return (
                          <div key={item.kelompok}>
                            <div className="row-between mb-4" style={{ gap: 8 }}>
                              <span className="text-sm fw-600">{item.kelompok} tahun</span>
                              <span className="tiny">
                                <strong className="text-1">{angka(item.jumlah)}</strong> peserta ({pct}%)
                              </span>
                            </div>
                            <div className="progress" style={{ height: 9 }}>
                              <i style={{ width: `${pct}%`, background: warna }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="tiny center py-16">Kelompok dengan jumlah &lt; 5 tidak ditampilkan.</p>
                  )}
                </div>
              </div>

              <div className="sa-col board-band">
                <div className="sa-panel-head">
                  <div>
                    <h3 className="sa-panel-title">Status Tindak Lanjut Rujukan</h3>
                    <p className="sa-panel-sub">Kategori dengan jumlah ≥ 5 ditampilkan demi privasi warga</p>
                  </div>
                  <Badge tone="default">Teragregasi</Badge>
                </div>
                {statusRujukanCards.length ? (
                  <div className="stat-strip">
                    {statusRujukanCards.map(([kunci, label, warna]) => (
                      <div className="stat-cell" style={{ borderLeftColor: warna }} key={kunci}>
                        <span className="stat-cell-label">{label}</span>
                        <strong className="stat-cell-val">{angka(d.rujukan[kunci] ?? 0)}</strong>
                        <span className="stat-cell-sub">kasus</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="tiny center py-16">
                    {d.ada_data_disembunyikan
                      ? "Jumlah rujukan disembunyikan karena di bawah 5 (privasi)."
                      : "Belum ada rujukan pada periode ini."}
                  </p>
                )}
              </div>
            </section>

            {d.ada_data_disembunyikan ? (
              <div
                className="tiny mt-12"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center" }}
              >
                <Icon name="shield" size={14} className="shrink-0" />
                <span>Sebagian sel disembunyikan untuk melindungi privasi warga (jumlah &lt; 5).</span>
              </div>
            ) : null}

            <p className="tiny center mt-8 mb-16">{d.disclaimer}</p>

          {/* Lembar laporan A4 tersembunyi untuk dicetak terisolasi lewat iframe */}
          <div style={{ display: "none" }} aria-hidden="true">
            <LembarLaporanPrint
              sheetRef={laporanPrintRef}
              d={d}
              wilayah={wilayahAktifNama}
              periodeLabel={LABEL_PERIODE[periode]}
              pencetak={user?.name || "Admin Wilayah"}
            />
          </div>
          </>
        );
      })()}
    </AppShell>
  );
}

function LembarLaporanPrint({
  sheetRef,
  d,
  wilayah,
  periodeLabel,
  pencetak,
}: {
  sheetRef: React.RefObject<HTMLDivElement | null>;
  d: LaporanKelurahan;
  wilayah: string;
  periodeLabel: string;
  pencetak: string;
}) {
  const totalImt = d.distribusi_imt.reduce((s, x) => s + x.jumlah, 0);
  const totalUsia = d.distribusi_kelompok_usia.reduce((s, x) => s + x.jumlah, 0);
  const rujukanRows = (
    [
      ["baru", "Baru"],
      ["dihubungi", "Diproses"],
      ["selesai", "Selesai"],
      ["ditolak", "Ditolak"],
    ] as const
  ).filter(([k]) => d.rujukan[k] !== undefined);
  const tglCetak = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const warnaHexImt = (kategori?: string) => {
    const k = (kategori || "").toLowerCase();
    if (k.includes("obesitas")) return "#c62828";
    if (k.includes("gemuk")) return "#d97706";
    if (k.includes("normal")) return "#2e7d32";
    return "#4B6251";
  };

  return (
    <div className="lap-sheet" ref={sheetRef}>
      <div className="lap-head">
        <div className="lap-brand">
          <BrandLockup variant="sm" />
          <div>
            <p className="lap-instansi">PEMERINTAH KOTA BANJARBARU · DINAS KESEHATAN</p>
            <h1>LAPORAN RINGKASAN KESEHATAN WILAYAH</h1>
            <p>Program Pemantauan Penyakit Tidak Menular (PTM) — SehatKita</p>
          </div>
        </div>
        <div className="lap-meta">
          <strong>Wilayah {wilayah}</strong>
          <span>Periode: {periodeLabel}</span>
          <span>Dicetak: {tglCetak}</span>
        </div>
      </div>

      <p className="lap-sec">I. Ringkasan Metrik Wilayah</p>
      <div className="lap-kpi-grid">
        <div className="lap-kpi">
          <span>Peserta Terdaftar</span>
          <strong>{angka(d.total_peserta)}</strong>
        </div>
        <div className="lap-kpi">
          <span>Pengguna Aktif</span>
          <strong>{angka(d.total_pengguna_aktif)}</strong>
        </div>
        <div className="lap-kpi">
          <span>Total Pencatatan</span>
          <strong>{angka(d.total_pencatatan)}</strong>
        </div>
        <div className="lap-kpi">
          <span>Kepatuhan Pencatatan</span>
          <strong>{d.kepatuhan_pencatatan_persen}%</strong>
        </div>
      </div>

      <div className="lap-block">
        <p className="lap-sec">II. Distribusi Indeks Massa Tubuh (IMT)</p>
        {d.distribusi_imt.length ? (
          <table className="lap-table">
            <thead>
              <tr>
                <th>Kategori IMT</th>
                <th style={{ width: "44%" }}>Proporsi Visual</th>
                <th className="lap-num">Jumlah Peserta</th>
                <th className="lap-num">Persentase</th>
              </tr>
            </thead>
            <tbody>
              {d.distribusi_imt.map((item) => {
                const pct = persen(item.jumlah, totalImt);
                return (
                  <tr key={item.kategori}>
                    <td>{labelImt(item.kategori)}</td>
                    <td>
                      <div className="lap-bar-wrap">
                        <span
                          className="lap-bar-fill"
                          style={{ width: `${pct}%`, background: warnaHexImt(item.kategori) }}
                        />
                      </div>
                    </td>
                    <td className="lap-num">{angka(item.jumlah)}</td>
                    <td className="lap-num">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="lap-note">Belum ada data IMT pada periode ini.</p>
        )}
      </div>

      <div className="lap-two-col">
        <div className="lap-block">
          <p className="lap-sec">III. Riwayat Keluarga (Self-report)</p>
          {d.distribusi_riwayat_keluarga.length ? (
            <table className="lap-table">
              <thead>
                <tr>
                  <th>Faktor Risiko</th>
                  <th className="lap-num">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {d.distribusi_riwayat_keluarga.map((item) => (
                  <tr key={item.faktor}>
                    <td>{LABEL_FAKTOR[item.faktor ?? ""] ?? item.faktor}</td>
                    <td className="lap-num">{angka(item.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="lap-note">Belum ada faktor risiko tercatat.</p>
          )}
        </div>

        <div className="lap-block">
          <p className="lap-sec">IV. Status Rujukan Wilayah</p>
          {rujukanRows.length ? (
            <table className="lap-table">
              <thead>
                <tr>
                  <th>Status Rujukan</th>
                  <th className="lap-num">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {rujukanRows.map(([k, lbl]) => (
                  <tr key={k}>
                    <td>{lbl}</td>
                    <td className="lap-num">{angka(d.rujukan[k] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="lap-note">
              {d.ada_data_disembunyikan
                ? "Jumlah rujukan disembunyikan karena di bawah 5 kasus (perlindungan privasi)."
                : "Belum ada rujukan pada periode ini."}
            </p>
          )}
        </div>
      </div>

      <div className="lap-two-col">
        <div className="lap-block">
          <p className="lap-sec">V. Distribusi Kelompok Usia</p>
          {d.distribusi_kelompok_usia.length ? (
            <table className="lap-table">
              <thead>
                <tr>
                  <th>Kelompok Usia</th>
                  <th className="lap-num">Jumlah</th>
                  <th className="lap-num">Persentase</th>
                </tr>
              </thead>
              <tbody>
                {d.distribusi_kelompok_usia.map((item) => (
                  <tr key={item.kelompok}>
                    <td>{item.kelompok} tahun</td>
                    <td className="lap-num">{angka(item.jumlah)}</td>
                    <td className="lap-num">{persen(item.jumlah, totalUsia)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="lap-note">Kelompok dengan jumlah di bawah 5 tidak ditampilkan.</p>
          )}
        </div>

        <div className="lap-block">
          <p className="lap-sec">VI. Tren Pencatatan ({periodeLabel})</p>
          {d.tren.length ? (
            <table className="lap-table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th className="lap-num">Total Pencatatan</th>
                </tr>
              </thead>
              <tbody>
                {d.tren.map((t) => (
                  <tr key={t.periode}>
                    <td>{t.periode}</td>
                    <td className="lap-num">{angka(t.total_pencatatan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="lap-note">Belum ada pencatatan pada periode ini.</p>
          )}
        </div>
      </div>

      <div className="lap-note">
        {d.ada_data_disembunyikan
          ? "Catatan Privasi: Sebagian sel dengan jumlah < 5 disembunyikan secara otomatis untuk melindungi privasi warga. "
          : ""}
        {d.disclaimer}
      </div>

      <div className="lap-sign">
        <div className="lap-sign-box">
          <span>Banjarbaru, {tglCetak}</span>
          <span>Pengelola Wilayah ({wilayah})</span>
          <div className="lap-sign-space" />
          <strong>{pencetak}</strong>
        </div>
      </div>
    </div>
  );
}

function labelImt(kategori?: string): string {
  return LABEL_KATEGORI_IMT[kategori as KategoriImt] ?? kategori ?? "—";
}

function warnaImt(kategori?: string): string {
  const k = (kategori || "").toLowerCase();
  if (k.includes("obesitas")) return "var(--danger)";
  if (k.includes("gemuk")) return "var(--warning)";
  if (k.includes("normal")) return "var(--safe)";
  return "var(--info, #4B6251)";
}

function persen(nilai: number, total: number): number {
  return total > 0 ? Math.round((nilai / total) * 100) : 0;
}
