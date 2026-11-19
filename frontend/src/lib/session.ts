/** Pilihan riwayat penyakit keluarga (§5 — sesuai ENUM_RIWAYAT backend) */
export const RIWAYAT_KELUARGA_OPTIONS = [
  { value: "hipertensi", label: "Hipertensi (darah tinggi)" },
  { value: "diabetes", label: "Diabetes (gula darah)" },
  { value: "jantung", label: "Jantung" },
  { value: "stroke", label: "Stroke" },
  { value: "kolesterol", label: "Kolesterol tinggi" },
  { value: "asma", label: "Asma" },
  { value: "kanker", label: "Kanker" },
  { value: "ginjal", label: "Gangguan ginjal" },
] as const;
