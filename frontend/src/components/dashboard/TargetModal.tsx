"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { target as targetApi, ApiError } from "@/lib/api";
import type { Target, TargetInput } from "@/types";

/* ------------------------------------------------------------------
   Form "Atur Target" — dipakai dari kartu Target Kesehatan di dashboard.

   Sebelumnya tautan "Atur target" mengarah ke /profil, halaman yang hanya
   berisi data diri (tanggal lahir, tinggi, aktivitas) dan TIDAK punya input
   target sama sekali. Jadi tombolnya tidak melakukan apa pun yang dijanjikan.
   Endpoint PUT /api/v1/target sudah tersedia di backend, jadi form ini
   memakainya langsung tanpa halaman baru.

   Batas nilai mengikuti validasi backend (TargetRefleksiController::simpanTarget):
   bb_target_kg 1..300 · target_aktivitas_per_minggu 0..30 · target_air_ml 0..10000
   Semua field opsional; yang dikosongkan tidak dikirim (PUT bersifat PATCH-like).
   ------------------------------------------------------------------ */

type Props = {
  open: boolean;
  onClose: () => void;
  /** Target saat ini, dipakai untuk mengisi form. */
  awal?: Partial<Target> | null;
  onSaved?: () => void;
};

type Form = {
  bb: string;
  aktivitas: string;
  air: string;
};

export default function TargetModal({ open, onClose, awal, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState<Form>({ bb: "", aktivitas: "", air: "" });
  const [err, setErr] = useState<Partial<Record<keyof Form, string>>>({});
  const [simpan, setSimpan] = useState(false);

  // Isi ulang form setiap kali modal dibuka, supaya angka lama tidak tertinggal.
  useEffect(() => {
    if (!open) return;
    setForm({
      bb: awal?.bb_target_kg != null ? String(awal.bb_target_kg) : "",
      aktivitas:
        awal?.target_aktivitas_per_minggu != null ? String(awal.target_aktivitas_per_minggu) : "",
      air: awal?.target_air_ml != null ? String(awal.target_air_ml) : "",
    });
    setErr({});
  }, [open, awal]);

  function ubah(kunci: keyof Form, nilai: string) {
    setForm((p) => ({ ...p, [kunci]: nilai }));
    setErr((p) => ({ ...p, [kunci]: "" }));
  }

  async function kirim() {
    const e: Partial<Record<keyof Form, string>> = {};
    const payload: TargetInput = {};

    const bb = form.bb.trim();
    if (bb !== "") {
      const n = Number(bb);
      if (Number.isNaN(n)) e.bb = "Harus berupa angka.";
      else if (n < 1 || n > 300) e.bb = "Harus antara 1 dan 300 kg.";
      else payload.bb_target_kg = n;
    }

    const aktivitas = form.aktivitas.trim();
    if (aktivitas !== "") {
      const n = Number(aktivitas);
      if (!Number.isInteger(n)) e.aktivitas = "Harus angka bulat.";
      else if (n < 0 || n > 30) e.aktivitas = "Harus antara 0 dan 30 kali.";
      else payload.target_aktivitas_per_minggu = n;
    }

    const air = form.air.trim();
    if (air !== "") {
      const n = Number(air);
      if (!Number.isInteger(n)) e.air = "Harus angka bulat.";
      else if (n < 0 || n > 10000) e.air = "Harus antara 0 dan 10000 ml.";
      else payload.target_air_ml = n;
    }

    if (Object.keys(payload).length === 0 && Object.keys(e).length === 0) {
      e.bb = "Isi minimal satu target.";
    }

    setErr(e);
    if (Object.keys(e).length > 0) {
      toast.warning("Periksa kembali field yang ditandai.");
      return;
    }

    setSimpan(true);
    try {
      await targetApi.set(payload);
      toast.success("Target tersimpan.", { title: "Berhasil" });
      onSaved?.();
      onClose();
    } catch (errApi) {
      const apiErr = errApi as ApiError;
      if (apiErr.errors) {
        const map: Partial<Record<keyof Form, string>> = {};
        if (apiErr.errors.bb_target_kg) map.bb = apiErr.errors.bb_target_kg[0];
        if (apiErr.errors.target_aktivitas_per_minggu)
          map.aktivitas = apiErr.errors.target_aktivitas_per_minggu[0];
        if (apiErr.errors.target_air_ml) map.air = apiErr.errors.target_air_ml[0];
        setErr(map);
      }
      toast.warning(apiErr.message || "Gagal menyimpan target.");
    } finally {
      setSimpan(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div>
          <h3 className="h3">Target Kesehatan</h3>
          <p className="tiny" style={{ marginTop: 4 }}>
            Isi target yang ingin Anda capai. Semua kolom opsional.
          </p>
        </div>
      }
      footer={
        <div className="row-between" style={{ width: "100%" }}>
          <span className="tiny">
            <Icon name="shield" size={14} /> Tersimpan di akun Anda
          </span>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-outline" onClick={onClose} type="button">
              Batal
            </button>
            <button className="btn btn-primary" onClick={kirim} disabled={simpan} type="button">
              {simpan ? "Menyimpan…" : "Simpan Target"}
            </button>
          </div>
        </div>
      }
    >
      <fieldset className="form-section">
        <legend>
          <span className="n">1</span> Target tubuh
        </legend>
        <div className="field">
          <label className="label" htmlFor="bb_target_kg">
            Target berat badan (kg)
          </label>
          <input
            className={"input" + (err.bb ? " is-error" : "")}
            type="number"
            inputMode="decimal"
            min={1}
            max={300}
            step="0.1"
            id="bb_target_kg"
            placeholder="mis. 70"
            value={form.bb}
            onChange={(e) => ubah("bb", e.target.value)}
          />
          {err.bb ? <div className="err-msg show">{err.bb}</div> : null}
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>
          <span className="n">2</span> Target kebiasaan
        </legend>
        <div className="field">
          <label className="label" htmlFor="target_aktivitas_per_minggu">
            Aktivitas fisik per minggu (kali)
          </label>
          <input
            className={"input" + (err.aktivitas ? " is-error" : "")}
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            id="target_aktivitas_per_minggu"
            placeholder="mis. 3"
            value={form.aktivitas}
            onChange={(e) => ubah("aktivitas", e.target.value)}
          />
          {err.aktivitas ? <div className="err-msg show">{err.aktivitas}</div> : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="target_air_ml">
            Target minum air (ml per hari)
          </label>
          <input
            className={"input" + (err.air ? " is-error" : "")}
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            step={100}
            id="target_air_ml"
            placeholder="mis. 2000"
            value={form.air}
            onChange={(e) => ubah("air", e.target.value)}
          />
          {err.air ? <div className="err-msg show">{err.air}</div> : null}
        </div>
      </fieldset>
    </Modal>
  );
}
