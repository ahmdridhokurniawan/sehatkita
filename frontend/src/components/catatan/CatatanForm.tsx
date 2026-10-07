"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import { SUMBER, JENIS_GULA_DARAH, KONSUMSI_MANIS } from "@/lib/enums";
import type { Sumber, JenisGulaDarah, KonsumsiManis } from "@/lib/enums";
import {
  LABEL_SUMBER,
  LABEL_JENIS_GULA_DARAH,
  LABEL_KONSUMSI_MANIS,
} from "@/lib/labels";
import type { CatatanKesehatanInput } from "@/types";

/* ---------- Tipe ---------- */

type Props = {
  onTambah: (input: CatatanKesehatanInput) => void;
};

type KunciAngka =
  | "bb_kg"
  | "sistol"
  | "diastol"
  | "gula_darah"
  | "kolesterol"
  | "asam_urat"
  | "lingkar_perut"
  | "tidur_jam";

type FormState = {
  dicatat_pada: string;
  sumber: Sumber;
  bb_kg: string;
  sistol: string;
  diastol: string;
  gula_darah: string;
  jenis_gula_darah: string;
  kolesterol: string;
  asam_urat: string;
  lingkar_perut: string;
  tidur_jam: string;
  merokok: boolean;
  konsumsi_manis: string;
  catatan: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

/* ---------- Data statis ---------- */

const AWAL: FormState = {
  dicatat_pada: "",
  sumber: SUMBER.MANDIRI,
  bb_kg: "",
  sistol: "",
  diastol: "",
  gula_darah: "",
  jenis_gula_darah: "",
  kolesterol: "",
  asam_urat: "",
  lingkar_perut: "",
  tidur_jam: "",
  merokok: false,
  konsumsi_manis: "",
  catatan: "",
};

/** Daftar kolom angka. Rentang wajar dari kontrak 7.2 */
const FIELD_ANGKA: {
  kunci: KunciAngka;
  label: string;
  satuan: string;
  min: number;
  max: number;
}[] = [
  { kunci: "bb_kg", label: "Berat badan", satuan: "kg", min: 20, max: 300 },
  { kunci: "sistol", label: "Sistol", satuan: "mmHg", min: 60, max: 260 },
  { kunci: "diastol", label: "Diastol", satuan: "mmHg", min: 30, max: 160 },
  { kunci: "gula_darah", label: "Gula darah", satuan: "mg/dL", min: 20, max: 700 },
  { kunci: "kolesterol", label: "Kolesterol", satuan: "mg/dL", min: 50, max: 600 },
  { kunci: "asam_urat", label: "Asam urat", satuan: "mg/dL", min: 1, max: 20 },
  { kunci: "lingkar_perut", label: "Lingkar perut", satuan: "cm", min: 40, max: 200 },
  { kunci: "tidur_jam", label: "Tidur", satuan: "jam", min: 0, max: 24 },
];

/* ---------- Komponen ---------- */

export default function CatatanForm({ onTambah }: Props) {
  const [form, setForm] = useState<FormState>(AWAL);
  const [errors, setErrors] = useState<Errors>({});
  const [sukses, setSukses] = useState(false);

  function ubah<K extends keyof FormState>(kunci: K, nilai: FormState[K]) {
    setForm((prev) => ({ ...prev, [kunci]: nilai } as FormState));
    setSukses(false);
  }

  function validasi(): Errors {
    const e: Errors = {};

    if (form.dicatat_pada.trim() === "") {
      e.dicatat_pada = "Tanggal wajib diisi";
    }

    for (const f of FIELD_ANGKA) {
      const teks = form[f.kunci].trim();
      if (teks === "") continue;
      const angka = Number(teks);
      if (Number.isNaN(angka)) {
        e[f.kunci] = "Harus berupa angka";
      } else if (angka < f.min || angka > f.max) {
        e[f.kunci] = `Harus antara ${f.min}-${f.max}`;
      }
    }

    return e;
  }

  function kirim(ev: FormEvent) {
    ev.preventDefault();

    const e = validasi();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setSukses(false);
      return;
    }

    const input: CatatanKesehatanInput = {
      dicatat_pada: form.dicatat_pada,
      sumber: form.sumber,
      merokok: form.merokok,
    };

    for (const f of FIELD_ANGKA) {
      const teks = form[f.kunci].trim();
      if (teks !== "") input[f.kunci] = Number(teks);
    }
    if (form.jenis_gula_darah !== "") {
      input.jenis_gula_darah = form.jenis_gula_darah as JenisGulaDarah;
    }
    if (form.konsumsi_manis !== "") {
      input.konsumsi_manis = form.konsumsi_manis as KonsumsiManis;
    }
    if (form.catatan.trim() !== "") {
      input.catatan = form.catatan.trim();
    }

    onTambah(input);
    setForm(AWAL);
    setErrors({});
    setSukses(true);
  }

  return (
    <form onSubmit={kirim} className="space-y-5">
      {sukses && (
        <p className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
          Catatan tersimpan (simulasi). Lihat di daftar bawah.
        </p>
      )}

      {/* Tanggal + Sumber */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Tanggal"
          type="date"
          value={form.dicatat_pada}
          error={errors.dicatat_pada}
          onChange={(e) => ubah("dicatat_pada", e.target.value)}
        />
        <Select
          label="Sumber"
          value={form.sumber}
          onChange={(e) => ubah("sumber", e.target.value as Sumber)}
        >
          {Object.entries(SUMBER).map(([, nilai]) => (
            <option key={nilai} value={nilai}>
              {LABEL_SUMBER[nilai]}
            </option>
          ))}
        </Select>
      </div>

      {/* Angka-angka */}
      <div className="grid gap-4 sm:grid-cols-3">
        {FIELD_ANGKA.map((f) => (
          <Input
            key={f.kunci}
            label={`${f.label} (${f.satuan})`}
            inputMode="decimal"
            placeholder={`${f.min}-${f.max}`}
            value={form[f.kunci]}
            error={errors[f.kunci]}
            onChange={(e) => ubah(f.kunci, e.target.value)}
          />
        ))}
      </div>

      {/* Pilihan */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Jenis gula darah (kalau diisi)"
          value={form.jenis_gula_darah}
          onChange={(e) => ubah("jenis_gula_darah", e.target.value)}
        >
          <option value="">- Tidak diisi -</option>
          {Object.entries(JENIS_GULA_DARAH).map(([, nilai]) => (
            <option key={nilai} value={nilai}>
              {LABEL_JENIS_GULA_DARAH[nilai]}
            </option>
          ))}
        </Select>
        <Select
          label="Konsumsi manis"
          value={form.konsumsi_manis}
          onChange={(e) => ubah("konsumsi_manis", e.target.value)}
        >
          <option value="">- Tidak diisi -</option>
          {Object.entries(KONSUMSI_MANIS).map(([, nilai]) => (
            <option key={nilai} value={nilai}>
              {LABEL_KONSUMSI_MANIS[nilai]}
            </option>
          ))}
        </Select>
      </div>

      {/* Merokok */}
      <Checkbox
        label="Saya merokok"
        checked={form.merokok}
        onChange={(e) => ubah("merokok", e.target.checked)}
      />

      {/* Catatan bebas */}
      <div className="space-y-1.5">
        <label htmlFor="catatan" className="block text-sm font-medium text-slate-700">
          Catatan (opsional)
        </label>
        <textarea
          id="catatan"
          rows={3}
          value={form.catatan}
          onChange={(e) => ubah("catatan", e.target.value)}
          placeholder="Misal: kurang tidur karena lembur"
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      <Button type="submit" fullWidth>
        Simpan Catatan
      </Button>
    </form>
  );
}
