import type { ProfilRingkas } from "@/types";

/**
 * Bantuan sesi SEMENTARA (belum tersambung backend).
 * Nanti diganti data asli dari GET /auth/me → kolom `consent_at`.
 *
 * Catatan: penanda onboarding disimpan PER-EMAIL, supaya tiap orang
 * punya statusnya sendiri (meniru `consent_at` milik tiap pengguna).
 */
const CURRENT_USER_KEY = "sehatkita_current_user";
const ONBOARDED_KEY = "sehatkita_onboarded_emails";

function bacaDaftarSelesai(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ONBOARDED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Dipanggil saat "login" berhasil (simulasi) — simpan siapa yang sedang login */
export function loginSimulasi(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_USER_KEY, email.toLowerCase());
}

/** Email pengguna yang sedang "login" */
export function getUserSimulasi(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CURRENT_USER_KEY) ?? "";
}

/** "Keluar" — hanya menghapus sesi, TIDAK menghapus riwayat onboarding */
export function logoutSimulasi(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_USER_KEY);
}

/** Apakah email ini sudah isi formulir? (per email) */
export function sudahOnboarding(email: string): boolean {
  return bacaDaftarSelesai().includes(email.toLowerCase());
}

/** Tandai email ini sudah selesai onboarding */
export function tandaiOnboardingSelesai(email: string): void {
  if (typeof window === "undefined") return;
  const daftar = bacaDaftarSelesai();
  const emailKecil = email.toLowerCase();
  if (!daftar.includes(emailKecil)) {
    daftar.push(emailKecil);
    window.localStorage.setItem(ONBOARDED_KEY, JSON.stringify(daftar));
  }
}

/** Pilihan riwayat penyakit keluarga (§5 — array of string) */
export const RIWAYAT_KELUARGA_OPTIONS = [
  { value: "hipertensi", label: "Hipertensi (darah tinggi)" },
  { value: "diabetes", label: "Diabetes (gula darah)" },
  { value: "jantung", label: "Jantung" },
  { value: "stroke", label: "Stroke" },
  { value: "kolesterol", label: "Kolesterol tinggi" },
  { value: "asma", label: "Asma" },
] as const;

const PROFIL_KEY = "sehatkita_profil";

function bacaPetaProfil(): Record<string, ProfilRingkas> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFIL_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ProfilRingkas>) : {};
  } catch {
    return {};
  }
}

/** Profil tersimpan (simulasi) untuk satu email, atau null kalau belum pernah diubah */
export function getProfilSimulasi(email: string): ProfilRingkas | null {
  const peta = bacaPetaProfil();
  return peta[email.toLowerCase()] ?? null;
}

/** Simpan profil (simulasi) untuk satu email */
export function simpanProfilSimulasi(email: string, profil: ProfilRingkas): void {
  if (typeof window === "undefined") return;
  const peta = bacaPetaProfil();
  peta[email.toLowerCase()] = profil;
  window.localStorage.setItem(PROFIL_KEY, JSON.stringify(peta));
}
