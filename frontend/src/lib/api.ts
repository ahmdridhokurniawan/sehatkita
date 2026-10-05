/**
 * Lapisan API — satu-satunya tempat yang memanggil backend.
 * Mengikuti kontrak-api.md §1.1 (header) & §1.2-1.4 (envelope).
 *
 * Prinsip: halaman/komponen TIDAK memanggil fetch langsung.
 * Semua lewat sini, supaya penanganan token & error konsisten.
 */
import type {
  ApiResponse,
  AuthData,
  CatatanKesehatan,
  CatatanKesehatanInput,
  DashboardPribadi,
  DashboardKelurahan,
  Insight,
  LaporanPribadi,
  Program,
  Refleksi,
  Rujukan,
  SesiPosbindu,
  Target,
  TargetInput,
  Tren,
  User,
  Wilayah,
} from "@/types";
/* ============================================================
 * Konfigurasi
 * ============================================================ */
// Base URL dari kontrak-api.md
// Bisa diubah lewat file .env.local (lihat bawah)
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://pm-monitoring.test/api/v1";
// Nama kunci untuk menyimpan token di browser
const TOKEN_KEY = "sehatkita_token";
/* ============================================================
 * Manajemen token (§18: kesepakatan simpan token)
 * ============================================================ */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}
/* ============================================================
 * Error khusus API
 * ============================================================ */
/** Error yang dilempar saat backend mengembalikan response gagal */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}
/* ============================================================
 * Inti: fungsi request
 * ============================================================ */
interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Query string, mis. { page: 1, per_page: 15 } */
  query?: Record<string, string | number | undefined>;
  /** Kirim token? Default: true */
  auth?: boolean;
}
/** Bangun URL lengkap dengan query string */
function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}
/** Fungsi inti: kirim request ke backend & tangani envelope response */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = options;
  // §1.1 — header wajib
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  // 204 / body kosong
  if (response.status === 204) {
    return null as T;
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(
      `Respons backend tidak valid (status ${response.status})`,
      response.status,
    );
  }
  // §1.2/1.3 — sukses
  if (response.ok) {
    const envelope = json as ApiResponse<T>;
    return envelope.data;
  }
  // §1.4 — gagal
  const errEnv = json as { message?: string; errors?: Record<string, string[]> };
  throw new ApiError(
    errEnv.message ?? "Terjadi kesalahan",
    response.status,
    errEnv.errors,
  );
}
/* ============================================================
 * §4 — Auth
 * ============================================================ */
export const auth = {
  /** §4.1 POST /auth/register */
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    wilayah_id: number;
  }) => request<AuthData>("/auth/register", { method: "POST", body: payload, auth: false }),
  /** §4.2 POST /auth/login */
  login: (payload: { email: string; password: string; device_name?: string }) =>
    request<AuthData>("/auth/login", { method: "POST", body: payload, auth: false }),
  /** §4.3 POST /auth/logout */
  logout: () => request<null>("/auth/logout", { method: "POST" }),
  /** §4.4 GET /auth/me */
  me: () => request<User>("/auth/me"),
};
/* ============================================================
 * §5 — Profil & Persetujuan
 * ============================================================ */
export const profil = {
  get: () => request<import("@/types").Profil>("/profil"),
  update: (payload: {
    tgl_lahir: string;
    jenis_kelamin: string;
    tinggi_cm: number;
    tingkat_aktivitas: string;
    merokok: boolean;
    riwayat_keluarga: string[];
  }) => request<import("@/types").Profil>("/profil", { method: "PUT", body: payload }),
};
export const persetujuan = {
  /** §5.3 POST /persetujuan */
  setuju: (versi_kebijakan: string) =>
    request<{ consent_at: string; versi_kebijakan: string }>("/persetujuan", {
      method: "POST",
      body: { versi_kebijakan, setuju: true },
    }),
  /** §5.4 DELETE /persetujuan */
  tarik: () => request<{ consent_at: null }>("/persetujuan", { method: "DELETE" }),
};
/* ============================================================
 * §6 — Master (Wilayah & Faskes)
 * ============================================================ */
export const wilayah = {
  /** §6.1 GET /wilayah — publik */
  list: (query?: { tipe?: string; parent_id?: number }) =>
    request<Wilayah[]>("/wilayah", { query, auth: false }),
};
export const faskes = {
  /** §6.2 GET /faskes */
  list: (query?: { wilayah_id?: number }) => request<import("@/types").Faskes[]>("/faskes", { query }),
};
/* ============================================================
 * §7 — Catatan Kesehatan
 * ============================================================ */
export const catatanKesehatan = {
  /** §7.2 POST */
  create: (payload: CatatanKesehatanInput) =>
    request<CatatanKesehatan>("/catatan-kesehatan", { method: "POST", body: payload }),
  /** §7.3 GET (dengan paginasi) */
  list: (query?: {
    page?: number;
    per_page?: number;
    indikator?: string;
    dari?: string;
    sampai?: string;
    user_id?: number;
  }) => request<CatatanKesehatan[]>("/catatan-kesehatan", { query }),
  /** §7.4 GET detail */
  detail: (id: number) => request<CatatanKesehatan>(`/catatan-kesehatan/${id}`),
  /** §7.5 DELETE */
  hapus: (id: number) => request<null>(`/catatan-kesehatan/${id}`, { method: "DELETE" }),
};
/* ============================================================
 * §8 — Dashboard Pribadi, Tren, Insight
 * ============================================================ */
export const dashboard = {
  /** §8.1 GET /dashboard/pribadi */
  pribadi: () => request<DashboardPribadi>("/dashboard/pribadi"),
  /** §9.1 GET /dashboard/kelurahan */
  kelurahan: (query?: { periode?: string; wilayah_id?: number }) =>
    request<DashboardKelurahan>("/dashboard/kelurahan", { query }),
};
export const tren = {
  /** §8.2 GET /tren */
  get: (query: { indikator: string; periode: string }) => request<Tren>("/tren", { query }),
};
export const insight = {
  /** §8.3 GET /insight */
  list: () => request<Insight[]>("/insight"),
};
/* ============================================================
 * §10 — Posbindu
 * ============================================================ */
export const posbindu = {
  /** §10.1 GET /posbindu/sesi */
  sesiList: (query?: { wilayah_id?: number; dari?: string; status?: string }) =>
    request<SesiPosbindu[]>("/posbindu/sesi", { query }),
  /** §10.5 POST /posbindu/sesi/{id}/peserta */
  tambahPeserta: (
    sesiId: number,
    payload: {
      user_id: number;
      hadir: boolean;
      catatan_kesehatan?: CatatanKesehatanInput;
    },
  ) =>
    request<{ kunjungan_id: number; user_id: number; hadir: boolean; catatan_kesehatan_id: number | null }>(
      `/posbindu/sesi/${sesiId}/peserta`,
      { method: "POST", body: payload },
    ),
};
/* ============================================================
 * §11 — Rujukan
 * ============================================================ */
export const rujukan = {
  /** §11.1 POST */
  create: (payload: { user_id: number; faskes_id: number; alasan: string }) =>
    request<Rujukan>("/rujukan", { method: "POST", body: payload }),
  /** §11.2 GET */
  list: (query?: { status?: string; wilayah_id?: number; dari?: string; sampai?: string }) =>
    request<Rujukan[]>("/rujukan", { query }),
  /** §11.3 PATCH status */
  updateStatus: (id: number, payload: { status: string; catatan?: string }) =>
    request<Rujukan>(`/rujukan/${id}/status`, { method: "PATCH", body: payload }),
};
/* ============================================================
 * §12 — Program
 * ============================================================ */
export const program = {
  /** §12.1 GET */
  list: (query?: { status?: string }) => request<Program[]>("/program", { query }),
  /** §12.3 POST peserta */
  ikut: (id: number) =>
    request<{ status: string }>(`/program/${id}/peserta`, { method: "POST" }),
};
/* ============================================================
 * §13 — Target & Refleksi
 * ============================================================ */
export const target = {
  /** §13.1 PUT */
  set: (payload: TargetInput) => request<Target>("/target", { method: "PUT", body: payload }),
};
export const refleksi = {
  /** §13.2 POST */
  create: (payload: { minggu: string; catatan: string }) =>
    request<Refleksi>("/refleksi", { method: "POST", body: payload }),
};
/* ============================================================
 * §14 — Laporan
 * ============================================================ */
export const laporan = {
  /** §14.1 GET /laporan/pribadi */
  pribadi: (query?: { periode?: string }) =>
    request<LaporanPribadi>("/laporan/pribadi", { query }),
};