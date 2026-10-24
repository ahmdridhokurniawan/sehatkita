"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { RANGE, validAngka, validTglPemeriksaan } from "@/lib/validasi";
import { catatanKesehatan, ApiError } from "@/lib/api";
import type { CatatanKesehatanInput } from "@/types";

/* ------------------------------------------------------------------
   Form "Catat Kesehatan" — diporting dari prototype catatan-form.js.
   Aturan yang ditekankan pembimbing:
   - Hanya Waktu & Sumber yang WAJIB (ditandai *), sisanya opsional.
   - Field angka: hanya boleh angka (huruf ditolak saat mengetik).
   - Waktu pemeriksaan tidak boleh di masa depan.
   ------------------------------------------------------------------ */

const SUMBER = [
  { v: "mandiri", l: "Mandiri (pencatatan sendiri)" },
  { v: "kader", l: "Posbindu / Kader" },
  { v: "puskesmas", l: "Fasilitas Kesehatan" },
];

const JENIS_GULA = [
  { v: "puasa", l: "Puasa" },
  { v: "2jam_pp", l: "2 Jam Setelah Makan" },
];

const KONSUMSI_MANIS = [
  { v: "jarang", l: "Jarang" },
  { v: "sering", l: "Sering" },
  { v: "setiap_hari", l: "Setiap hari" },
];

const FIELD_ANGKA: { id: string; label: string; satuan: string; ph: string }[] = [
  { id: "bb_kg", label: "Berat badan", satuan: "kg", ph: "mis. 78.5" },
  { id: "sistol", label: "Sistol", satuan: "mmHg", ph: "mis. 120" },
  { id: "diastol", label: "Diastol", satuan: "mmHg", ph: "mis. 80" },
  { id: "lingkar_perut", label: "Lingkar perut", satuan: "cm", ph: "mis. 92" },
  { id: "gula_darah", label: "Gula darah", satuan: "mg/dL", ph: "mis. 110" },
  { id: "kolesterol", label: "Kolesterol", satuan: "mg/dL", ph: "mis. 180" },
  { id: "asam_urat", label: "Asam urat", satuan: "mg/dL", ph: "mis. 6.5" },
  { id: "tidur_jam", label: "Jam tidur per hari", satuan: "jam", ph: "mis. 7" },
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
  const [waktu, setWaktu] = useState(nowLocal);
  const [sumber, setSumber] = useState("");
  const [angka, setAngka] = useState<Record<string, string>>({});
  const [jenisGula, setJenisGula] = useState("");
  const [konsumsiManis, setKonsumsiManis] = useState("");
  const [merokok, setMerokok] = useState("");
  const [catatan, setCatatan] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [simpan, setSimpan] = useState(false);

  function reset() {
    setWaktu(nowLocal());
    setSumber("");
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
    setErr((prev) => ({ ...prev, [id]: "" }));
  }

  async function kirim() {
    const e: Record<string, string> = {};
    const vWaktu = validTglPemeriksaan(waktu);
    if (!vWaktu.ok) e.dicatat_pada = vWaktu.msg || "Waktu wajib diisi.";
    if (!sumber) e.sumber = "Sumber wajib dipilih.";

    const payload: Record<string, unknown> = { dicatat_pada: waktu, sumber };
    for (const f of FIELD_ANGKA) {
      const t = (angka[f.id] || "").trim();
      if (t === "") continue;
      const v = validAngka(f.id, t);
      if (!v.ok) e[f.id] = v.msg || "Nilai tidak valid.";
      else payload[f.id] = v.value;
    }
    if (jenisGula) payload.jenis_gula_darah = jenisGula;
    if (konsumsiManis) payload.konsumsi_manis = konsumsiManis;
    if (merokok !== "") payload.merokok = merokok === "true";
    if (catatan.trim()) payload.catatan = catatan.trim();

    setErr(e);
    if (Object.keys(e).length > 0) {
      toast.warning("Periksa kembali field yang ditandai.");
      return;
    }

    setSimpan(true);
    try {
      await catatanKesehatan.create(payload as unknown as CatatanKesehatanInput);
      toast.success("Catatan kesehatan tersimpan.", { title: "Berhasil" });
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
        setErr(map);
      }
      toast.warning(apiErr.message || "Gagal menyimpan catatan.");
    } finally {
      setSimpan(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div>
          <h3 className="h3">Catat Kesehatan</h3>
          <p className="tiny" style={{ marginTop: 4 }}>
            Hanya <b>Waktu</b> dan <b>Sumber</b> yang wajib. Isi pengukuran sesuai data yang Anda miliki.
          </p>
        </div>
      }
      footer={
        <div className="row-between" style={{ width: "100%" }}>
          <span className="tiny">
            <Icon name="shield" size={14} /> Data dikirim ke backend
          </span>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-outline" onClick={onClose} type="button">
              Batal
            </button>
            <button className="btn btn-primary" onClick={kirim} disabled={simpan} type="button">
              {simpan ? "Menyimpan…" : "Simpan Catatan"}
            </button>
          </div>
        </div>
      }
    >
      <fieldset className="form-section">
        <legend>
          <span className="n">1</span> Waktu &amp; Sumber
        </legend>
        <div className="field">
          <label className="label" htmlFor="dicatat_pada">
            Waktu pemeriksaan <span className="req">*</span>
          </label>
          <input
            className={"input" + (err.dicatat_pada ? " is-error" : "")}
            type="datetime-local"
            id="dicatat_pada"
            max={nowLocal()}
            value={waktu}
            onChange={(e) => setWaktu(e.target.value)}
          />
          {err.dicatat_pada ? <div className="err-msg show">{err.dicatat_pada}</div> : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="sumber">
            Sumber data <span className="req">*</span>
          </label>
          <select
            className={"select" + (err.sumber ? " is-error" : "")}
            id="sumber"
            value={sumber}
            onChange={(e) => {
              setSumber(e.target.value);
              setErr((p) => ({ ...p, sumber: "" }));
            }}
          >
            <option value="">Pilih sumber…</option>
            {SUMBER.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
          {err.sumber ? <div className="err-msg show">{err.sumber}</div> : null}
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <span className="n">2</span> Pengukuran Tubuh
        </legend>
        {FIELD_ANGKA.slice(0, 4).map((f) => (
          <AngkaField key={f.id} f={f} value={angka[f.id] || ""} err={err[f.id]} onChange={ubahAngka} />
        ))}
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <span className="n">3</span> Pemeriksaan Laboratorium
        </legend>
        <div className="field">
          <label className="label" htmlFor="jenis_gula_darah">
            Jenis gula darah <span className="opt">(opsional)</span>
          </label>
          <select
            className="select"
            id="jenis_gula_darah"
            value={jenisGula}
            onChange={(e) => setJenisGula(e.target.value)}
          >
            <option value="">Pilih jenis…</option>
            {JENIS_GULA.map((j) => (
              <option key={j.v} value={j.v}>
                {j.l}
              </option>
            ))}
          </select>
        </div>
        {FIELD_ANGKA.slice(4, 7).map((f) => (
          <AngkaField key={f.id} f={f} value={angka[f.id] || ""} err={err[f.id]} onChange={ubahAngka} />
        ))}
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <span className="n">4</span> Kebiasaan Sehari-hari
        </legend>
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
        <div className="field">
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

      <fieldset className="form-section">
        <legend>
          <span className="n">5</span> Catatan Tambahan
        </legend>
        <div className="field">
          <label className="label" htmlFor="catatan">
            Catatan <span className="opt">(opsional)</span>
          </label>
          <textarea
            className="textarea"
            id="catatan"
            maxLength={500}
            value={catatan}
            placeholder="mis. sedang minum obat tensi"
            onChange={(e) => setCatatan(e.target.value)}
          />
          <div className="hint">{catatan.length}/500 karakter</div>
        </div>
      </fieldset>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={18} />
        <div className="text-xs">
          Nilai kategori (IMT, tensi, gula darah) dihitung oleh server. Catatan yang tersimpan tidak dapat diedit —
          perbaiki dengan menghapus lalu membuat catatan baru.
        </div>
      </div>
    </Modal>
  );
}

function AngkaField({
  f,
  value,
  err,
  onChange,
}: {
  f: { id: string; label: string; satuan: string; ph: string };
  value: string;
  err?: string;
  onChange: (id: string, v: string) => void;
}) {
  const r = RANGE[f.id];
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
      {r ? (
        <div className="hint">
          Rentang {r[0]}–{r[1]} {f.satuan}
        </div>
      ) : null}
      {err ? <div className="err-msg show">{err}</div> : null}
    </div>
  );
}
