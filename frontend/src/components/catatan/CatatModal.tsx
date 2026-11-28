"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import PilihWarga from "@/components/warga/PilihWarga";
import { useUser } from "@/hooks/useUser";
import { RANGE, validAngka, validGulaDarah } from "@/lib/validasi";
import { satuanGulaDarah } from "@/lib/labels";
import { catatanKesehatan, posbindu as posbinduApi, ApiError } from "@/lib/api";
import { tanggal } from "@/lib/format";
import type { CatatanKesehatanInput, SesiPosbindu, WargaCari } from "@/types";

/* ------------------------------------------------------------------
   Form "Catat Kesehatan"
   - Waktu pemeriksaan & sumber data diset otomatis sesuai role login.
   - Field angka: hanya boleh angka (huruf ditolak saat mengetik).
   ------------------------------------------------------------------ */

const JENIS_GULA = [
  { v: "puasa", l: "Puasa" },
  { v: "sewaktu", l: "Sewaktu" },
  { v: "2jam_pp", l: "2 Jam PP" },
  { v: "hba1c", l: "HbA1c (%)" },
];

const KONSUMSI_MANIS = [
  { v: "jarang", l: "Jarang" },
  { v: "sering", l: "Sering" },
  { v: "setiap_hari", l: "Setiap hari" },
];

const FIELD_ANGKA: { id: string; label: string; satuan: string; ph: string }[] = [
  { id: "bb_kg", label: "Berat badan", satuan: "kg", ph: "misalnya 78.5" },
  { id: "sistol", label: "Sistol", satuan: "mmHg", ph: "misalnya 120" },
  { id: "diastol", label: "Diastol", satuan: "mmHg", ph: "misalnya 80" },
  { id: "lingkar_perut", label: "Lingkar perut", satuan: "cm", ph: "misalnya 92" },
  { id: "gula_darah", label: "Gula darah", satuan: "mg/dL", ph: "misalnya 110" },
  { id: "kolesterol", label: "Kolesterol", satuan: "mg/dL", ph: "misalnya 180" },
  { id: "asam_urat", label: "Asam urat", satuan: "mg/dL", ph: "misalnya 6.5" },
  { id: "tidur_jam", label: "Jam tidur per hari", satuan: "jam", ph: "misalnya 7" },
];

function nowLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (data: Record<string, unknown>) => void;
};

export default function CatatModal({ open, onClose, onSaved }: Props) {
  const toast = useToast();
  const { user } = useUser();
  const tanpaPersetujuan = Boolean(user?.role === "user" && !user.consent_at);

  const [warga, setWarga] = useState<WargaCari | null>(null);
  const [sesiId, setSesiId] = useState("");
  const [daftarSesi, setDaftarSesi] = useState<SesiPosbindu[]>([]);
  const [sesiSelesai, setSesiSelesai] = useState(false);
  const [angka, setAngka] = useState<Record<string, string>>({});
  const [jenisGula, setJenisGula] = useState("");
  const [konsumsiManis, setKonsumsiManis] = useState("");
  const [merokok, setMerokok] = useState("");
  const [catatan, setCatatan] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [simpan, setSimpan] = useState(false);
  const [peringatanKosong, setPeringatanKosong] = useState(false);

  /* Sumber otomatis mengikuti peran akun yang sedang login (tanpa dropdown/tampilan waktu & sumber). */
  const efektifSumber = useMemo(() => {
    if (user?.role === "super_admin") return "puskesmas";
    if (user?.role === "kader") return "kader";
    return "mandiri";
  }, [user?.role]);

  const batasWilayah = user?.role === "kader" ? user.wilayah_id : null;

  /* Dropdown sesi hanya relevan bila sumber = kader; pilih warga berlaku untuk kader & puskesmas */
  const butuhWarga = efektifSumber === "kader" || efektifSumber === "puskesmas";
  const butuhSesi = efektifSumber === "kader";
  const muatSesi = open && butuhSesi && !sesiSelesai;

  useEffect(() => {
    if (!open || !butuhSesi || sesiSelesai) return;
    let aktif = true;
    posbinduApi
      .sesiList()
      .then((data) => {
        if (aktif) setDaftarSesi(data ?? []);
      })
      .catch(() => {
        if (aktif) setDaftarSesi([]);
      })
      .finally(() => {
        if (aktif) setSesiSelesai(true);
      });
    return () => {
      aktif = false;
    };
  }, [open, butuhSesi, sesiSelesai]);

  function reset() {
    setWarga(null);
    setSesiId("");
    setAngka({});
    setJenisGula("");
    setKonsumsiManis("");
    setMerokok("");
    setCatatan("");
    setErr({});
  }

  /** Hanya digit & satu titik desimal — huruf ditolak saat diketik */
  function ubahAngka(id: string, v: string) {
    let bersih = v.replace(/[^\d.]/g, "");
    const bagian = bersih.split(".");
    if (bagian.length > 2) bersih = bagian[0] + "." + bagian.slice(1).join("");
    setAngka((prev) => ({ ...prev, [id]: bersih }));

    if (id === "gula_darah") {
      if (bersih.trim() === "") {
        setJenisGula("");
        setErr((prev) => ({ ...prev, gula_darah: "", jenis_gula_darah: "" }));
        return;
      }
      const cek = validGulaDarah(bersih, jenisGula || "puasa", true);
      setErr((prev) => ({
        ...prev,
        gula_darah: cek.ok ? "" : cek.msg || "",
        jenis_gula_darah: "",
      }));
      return;
    }

    setErr((prev) => ({ ...prev, [id]: "" }));
  }

  async function kirim() {
    const e: Record<string, string> = {};
    const payload: Record<string, unknown> = { dicatat_pada: nowLocal(), sumber: efektifSumber };

    // Sumber kader & puskesmas wajib menyertakan warga; sumber kader juga butuh sesi posbindu
    if (butuhWarga) {
      if (!warga) e.user_id = "Pilih warga terlebih dahulu.";
      else payload.user_id = warga.id;
    }
    if (butuhSesi) {
      if (!sesiId) e.sesi_posbindu_id = "Pilih sesi posbindu.";
      else payload.sesi_posbindu_id = Number(sesiId);
    }

    let adaAngka = false;
    for (const f of FIELD_ANGKA) {
      const t = (angka[f.id] || "").trim();
      if (t === "") continue;
      const v =
        f.id === "gula_darah"
          ? validGulaDarah(t, jenisGula || "puasa", true)
          : validAngka(f.id, t, true);
      if (!v.ok) e[f.id] = v.msg || "Nilai tidak valid.";
      else {
        payload[f.id] = v.value;
        adaAngka = true;
      }
    }

    if ((payload.sistol != null) !== (payload.diastol != null)) {
      if (payload.sistol == null) e.sistol = "Isi Sistol berpasangan dengan Diastol.";
      if (payload.diastol == null) e.diastol = "Isi Diastol berpasangan dengan Sistol.";
    }

    if (payload.gula_darah != null && jenisGula) {
      payload.jenis_gula_darah = jenisGula;
    }

    if (konsumsiManis) payload.konsumsi_manis = konsumsiManis;
    if (merokok !== "") payload.merokok = merokok === "true";
    if (catatan.trim()) payload.catatan = catatan.trim();

    setErr(e);
    if (Object.keys(e).length > 0) {
      toast.warning("Periksa kembali field yang ditandai.");
      return;
    }

    if (!adaAngka) {
      setPeringatanKosong(true);
      return;
    }

    setSimpan(true);
    try {
      const saved = await catatanKesehatan.create(payload as unknown as CatatanKesehatanInput);
      if (saved?.perlu_verifikasi) {
        toast.info(
          "Nilai di luar rentang wajar: catatan disimpan sebagai data anomali dan menunggu verifikasi Admin Kelurahan / Super Admin.",
          { title: "Menunggu Verifikasi" },
        );
      } else {
        toast.success("Catatan kesehatan tersimpan.", { title: "Berhasil" });
      }
      onSaved?.(payload);
      reset();
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const map: Record<string, string> = {};
        for (const [k, msgs] of Object.entries(apiErr.errors)) {
          map[k] = msgs[0] ?? "Nilai tidak valid";
        }
        if (apiErr.errors.pengukuran?.[0] && !map.bb_kg) {
          map.bb_kg = apiErr.errors.pengukuran[0];
        }
        setErr(map);
      }
      toast.warning(
        apiErr.errors?.consent?.[0] ||
          apiErr.errors?.pengukuran?.[0] ||
          apiErr.message ||
          "Gagal menyimpan catatan.",
      );
    } finally {
      setSimpan(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!peringatanKosong) onClose();
      }}
      size="lg"
      title={
        <div>
          <h3 className="h3">Catat Kesehatan</h3>
          <p className="tiny" style={{ marginTop: 4 }}>
            Waktu &amp; sumber pencatatan otomatis disesuaikan. Isi pengukuran sesuai data yang Anda miliki.
          </p>
        </div>
      }
      footer={
        <div className="row" style={{ width: "100%", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-outline" onClick={onClose} type="button">
            Batal
          </button>
          <button className="btn btn-primary" onClick={kirim} disabled={simpan || tanpaPersetujuan} type="button">
            {simpan ? "Menyimpan…" : "Simpan Catatan"}
          </button>
        </div>
      }
    >
      {(tanpaPersetujuan || err.consent) ? (
        <div className="alert alert-warning" style={{ marginBottom: 14 }}>
          <Icon name="alert-circle" size={18} />
          <div className="text-xs">
            <b>Persetujuan data belum aktif.</b>{" "}
            {err.consent || "Anda tidak bisa menyimpan catatan baru sebelum mengaktifkan persetujuan data."}
            {" "}
            <Link href="/setelan/privasi" onClick={onClose} style={{ fontWeight: 700, textDecoration: "underline" }}>
              Buka Pengaturan Privasi
            </Link>
          </div>
        </div>
      ) : null}

      {butuhWarga ? (
        <fieldset className="form-section" style={{ paddingTop: 18 }}>
          <legend style={{ marginBottom: 12 }}>
            <span className="n">1</span> Data Peserta {butuhSesi ? "& Sesi Posbindu" : ""}
          </legend>
          <PilihWarga
            value={warga}
            onChange={(w) => {
              setWarga(w);
              setErr((p) => ({ ...p, user_id: "" }));
            }}
            error={err.user_id}
            id="catat-warga"
            wilayahId={batasWilayah}
          />

          {butuhSesi ? (
            <div className="field">
              <label className="label" htmlFor="sesi_posbindu_id">
                Sesi posbindu <span className="req">*</span>
              </label>
              <select
                className={"select" + (err.sesi_posbindu_id ? " is-error" : "")}
                id="sesi_posbindu_id"
                value={sesiId}
                onChange={(e) => {
                  setSesiId(e.target.value);
                  setErr((p) => ({ ...p, sesi_posbindu_id: "" }));
                }}
                disabled={muatSesi}
              >
                <option value="">{muatSesi ? "Memuat sesi…" : "Pilih sesi…"}</option>
                {daftarSesi.map((s) => (
                  <option key={s.id} value={s.id}>
                    {tanggal(s.tanggal, "short")} · {s.lokasi}
                  </option>
                ))}
              </select>
              {err.sesi_posbindu_id ? <div className="err-msg show">{err.sesi_posbindu_id}</div> : null}
              {!muatSesi && daftarSesi.length === 0 ? (
                <div className="hint">Belum ada sesi posbindu di wilayah Anda. Minta admin kelurahan membuat sesi dulu.</div>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <fieldset className="form-section">
        <legend>
          <span className="n">{butuhWarga ? 2 : 1}</span> Pengukuran Tubuh &amp; Tensi
        </legend>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <AngkaField f={FIELD_ANGKA[0]} value={angka[FIELD_ANGKA[0].id] || ""} err={err[FIELD_ANGKA[0].id]} onChange={ubahAngka} />
          <AngkaField f={FIELD_ANGKA[3]} value={angka[FIELD_ANGKA[3].id] || ""} err={err[FIELD_ANGKA[3].id]} onChange={ubahAngka} />
        </div>
        <div className="grid grid-2 mt-12" style={{ gap: 12 }}>
          <AngkaField f={FIELD_ANGKA[1]} value={angka[FIELD_ANGKA[1].id] || ""} err={err[FIELD_ANGKA[1].id]} onChange={ubahAngka} />
          <AngkaField f={FIELD_ANGKA[2]} value={angka[FIELD_ANGKA[2].id] || ""} err={err[FIELD_ANGKA[2].id]} onChange={ubahAngka} />
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <span className="n">{butuhWarga ? 3 : 2}</span> Pemeriksaan Laboratorium
        </legend>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <AngkaField
            f={{
              ...FIELD_ANGKA[4],
              satuan: satuanGulaDarah(jenisGula),
              ph: jenisGula === "hba1c" ? "misalnya 5.7" : "misalnya 110",
            }}
            value={angka[FIELD_ANGKA[4].id] || ""}
            err={err[FIELD_ANGKA[4].id]}
            rangeText={jenisGula === "hba1c" ? "Rentang 3–25 %" : "Rentang 20–700 mg/dL"}
            extraHint={jenisGula === "hba1c" ? "Nilai desimal %" : "Bukan mmol/L"}
            onChange={ubahAngka}
          />
          <div className="field">
            <label className="label" htmlFor="jenis_gula_darah">
              Jenis Pemeriksaan Gula Darah <span className="opt">(opsional)</span>
            </label>
            <div className="segment segment-compact" role="group" aria-label="Pilih jenis pemeriksaan gula darah">
              {JENIS_GULA.map((j) => (
                <button
                  key={j.v}
                  type="button"
                  className={jenisGula === j.v ? "active" : ""}
                  onClick={() => {
                    const nextJenis = jenisGula === j.v && !angka.gula_darah ? "" : j.v;
                    setJenisGula(nextJenis);
                    const gulaVal = (angka.gula_darah || "").trim();
                    if (gulaVal !== "" && nextJenis) {
                      const cek = validGulaDarah(gulaVal, nextJenis, true);
                      setErr((p) => ({
                        ...p,
                        jenis_gula_darah: "",
                        gula_darah: cek.ok ? "" : cek.msg || "",
                      }));
                    } else {
                      setErr((p) => ({ ...p, jenis_gula_darah: "" }));
                    }
                  }}
                >
                  {j.l}
                </button>
              ))}
            </div>
            <div className="hint">
              {jenisGula === "hba1c"
                ? "HbA1c mengukur rata-rata gula darah 3 bulan terakhir. Normal < 5,7% · Diabetes ≥ 6,5%."
                : jenisGula === "2jam_pp"
                  ? "Dicek 2 jam setelah makan. Normal < 140 mg/dL · Tinggi ≥ 200 mg/dL."
                  : jenisGula === "sewaktu"
                    ? "Gula darah sewaktu (kapan saja tanpa puasa). Normal < 140 mg/dL · Tinggi ≥ 200 mg/dL."
                    : "Puasa: tidak makan/minum manis min. 8 jam. Normal < 100 mg/dL · Tinggi ≥ 126 mg/dL."}
            </div>
            {err.jenis_gula_darah ? <div className="err-msg show">{err.jenis_gula_darah}</div> : null}
          </div>
        </div>
        <div className="alert alert-info mt-12" style={{ marginBottom: 14 }}>
          <Icon name="info" size={16} />
          <div className="text-xs">
            <b>Panduan Pemeriksaan Gula Darah:</b> Pilih <b>Puasa</b> jika belum makan/minum manis min. 8 jam;{" "}
            <b>Sewaktu</b> bila dicek kapan saja tanpa puasa; <b>2 Jam PP</b> jika 2 jam setelah makan; atau{" "}
            <b>HbA1c</b> untuk pemeriksaan laboratorium (satuan %). Jika alat stik menunjukkan <b>mmol/L</b>,
            kalikan <b>18</b> lebih dulu ke mg/dL.
          </div>
        </div>
        <div className="grid grid-2 mt-8" style={{ gap: 10 }}>
          <AngkaField f={FIELD_ANGKA[5]} value={angka[FIELD_ANGKA[5].id] || ""} err={err[FIELD_ANGKA[5].id]} onChange={ubahAngka} />
          <AngkaField f={FIELD_ANGKA[6]} value={angka[FIELD_ANGKA[6].id] || ""} err={err[FIELD_ANGKA[6].id]} onChange={ubahAngka} />
        </div>
      </fieldset>

      <fieldset className="form-section" style={{ marginBottom: 12 }}>
        <legend>
          <span className="n">{butuhWarga ? 4 : 3}</span> Kebiasaan Sehari-hari
        </legend>
        <div className="grid grid-2" style={{ gap: 10 }}>
          <AngkaField f={FIELD_ANGKA[7]} value={angka[FIELD_ANGKA[7].id] || ""} err={err[FIELD_ANGKA[7].id]} onChange={ubahAngka} />
          <div className="field">
            <label className="label" htmlFor="konsumsi_manis">
              Konsumsi makanan/minuman manis <span className="opt">(opsional)</span>
            </label>
            <select
              className="select"
              id="konsumsi_manis"
              value={konsumsiManis}
              onChange={(e) => setKonsumsiManis(e.target.value)}
            >
              <option value="">Pilih…</option>
              {KONSUMSI_MANIS.map((k) => (
                <option key={k.v} value={k.v}>
                  {k.l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field mt-8" style={{ marginBottom: 0 }}>
          <label className="label">
            Merokok <span className="opt">(opsional)</span>
          </label>
          <div className="segment">
            {[
              { v: "", l: "Tidak diisi" },
              { v: "true", l: "Ya" },
              { v: "false", l: "Tidak" },
            ].map((b) => (
              <button
                key={b.v || "kosong"}
                type="button"
                className={merokok === b.v ? "active" : ""}
                onClick={() => setMerokok(b.v)}
              >
                {b.l}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="form-section" style={{ marginBottom: 0 }}>
        <legend>
          <span className="n">{butuhWarga ? 5 : 4}</span> Catatan Tambahan
        </legend>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label" htmlFor="catatan">
            Catatan <span className="opt">(opsional)</span>
          </label>
          <textarea
            className="textarea"
            id="catatan"
            maxLength={500}
            value={catatan}
            placeholder="misalnya sedang minum obat tensi"
            onChange={(e) => setCatatan(e.target.value)}
          />
          <div className="hint">{catatan.length}/500 karakter · Catatan tersimpan tidak bisa diedit (hapus lalu buat baru bila perlu).</div>
        </div>
      </fieldset>

      <Modal
        open={peringatanKosong}
        onClose={() => setPeringatanKosong(false)}
        className="modal-logout"
        size="sm"
        title={
          <span className="logout-modal-heading">
            <span
              className="logout-modal-icon"
              style={{
                color: "var(--warning)",
                background: "var(--warning-bg)",
                borderColor: "color-mix(in srgb, var(--warning) 24%, transparent)",
              }}
            >
              <Icon name="alert-triangle" size={21} />
            </span>
            <span className="logout-modal-title">Catatan Masih Kosong</span>
          </span>
        }
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPeringatanKosong(false);
              setTimeout(() => document.getElementById("bb_kg")?.focus(), 40);
            }}
          >
            Oke, Lengkapi
          </button>
        }
      >
        <div className="logout-modal-copy">
          <p>Isi minimal satu pengukuran angka sebelum menyimpan catatan kesehatan.</p>
          <p className="logout-modal-note">
            <Icon name="info" size={14} />
            <span>
              Misalnya berat badan, tekanan darah, gula darah, kolesterol, asam urat, lingkar perut, atau jam tidur.
            </span>
          </p>
        </div>
      </Modal>
    </Modal>
  );
}

function AngkaField({
  f,
  value,
  err,
  rangeText,
  extraHint,
  onChange,
}: {
  f: { id: string; label: string; satuan: string; ph: string };
  value: string;
  err?: string;
  rangeText?: string;
  extraHint?: string;
  onChange: (id: string, v: string) => void;
}) {
  const r = RANGE[f.id];
  const teksRentang = rangeText ?? (r ? `Rentang ${r[0]}–${r[1]} ${f.satuan}` : "");
  return (
    <div className="field">
      <label className="label" htmlFor={f.id}>
        {f.label} <span className="opt">(opsional)</span>
      </label>
      <div className="input-group">
        <input
          className={"input" + (err ? " is-error" : "")}
          type="text"
          inputMode="decimal"
          id={f.id}
          value={value}
          placeholder={f.ph}
          autoComplete="off"
          onChange={(e) => onChange(f.id, e.target.value)}
        />
        {f.satuan ? <span className="suffix">{f.satuan}</span> : null}
      </div>
      {teksRentang ? (
        <div className="hint">
          {teksRentang}
          {extraHint ? ` · ${extraHint}` : ""}
        </div>
      ) : null}
      {err ? <div className="err-msg show">{err}</div> : null}
    </div>
  );
}
