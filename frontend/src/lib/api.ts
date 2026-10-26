/**
 * Lapisan API — satu-satunya tempat yang memanggil backend.
 * Mengikuti kontrak-api.md v1.2 §1.1 (header) & §1.2-1.4 (envelope).
 *
 * Prinsip: halaman/komponen TIDAK memanggil fetch langsung.
 * Semua lewat sini, supaya penanganan token & error konsisten.
 *
 * Penyesuaian kontrak v1.2 (§19–§32):
 *  - §23  : semua daftar menerima `search` (lihat `ListQuery`).
 *  - §29  : `GET /insight?level=` untuk filter level.
 *  - §12/§25 : program + field reward (badge, exp, level, rank_kelurahan).
 *  - §10  : Posbindu sesi (list/create/detail/update + peserta).
 *  - §14.2: laporan kelurahan (agregat + disclaimer).
 *  - §15  : modul admin (master data) — dipakai Fase D.
 *  - §20  : notifikasi DITUNDA — tidak ada endpoint /notifications.
 */
import type {
  AdminPengguna,
  AdminPenggunaInput,
  AdminStatistik,
  AmbangBaris,
  AmbangKategori,
  ApiResponse,
  AuthData,
  CatatanKesehatan,
  CatatanKesehatanInput,
  CatatanQuery,
  DashboardKelurahan,
  DashboardKelurahanQuery,
  DashboardPribadi,
  Faskes,
  Indikator,
  Insight,
  InsightQuery,
  KunjunganPosbindu,
  KunjunganQuery,
  LaporanKelurahan,
  LaporanPribadi,
  LogAudit,
  PersetujuanData,
  PesertaProgramInput,
  Peringkat,
  Profil,
  Program,
  ProgramInput,
  ProgramQuery,
  RekamMedis,
  RekamMedisQuery,
  Rujukan,
  RujukanInput,
  RujukanQuery,
  SesiPosbindu,
  SesiPosbinduDetail,
  SesiPosbinduInput,
  Target,
  TargetInput,
  User,
  Wilayah,
} from "@/types";
/* ============================================================
 * Konfigurasi
 * ============================================================ */
// Base URL dari kontrak-api.md
// Bisa diubah lewat file .env.local (lihat bawah);
// NEXT_PUBLIC_API_BASE_URL tetap didukung untuk kompatibilitas.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://pm-monitoring.test/api/v1";
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
  /**
   * Query string, mis. { page: 1, per_page: 15 }.
   * Bertipe `object` supaya interface query (mis. `CatatanQuery`) bisa
   * langsung dioper tanpa cast — interface tidak punya index signature.
   */
  query?: object;
  /** Kirim token? Default: true */
  auth?: boolean;
}
/** Bangun URL lengkap dengan query string */
function buildUrl(path: string, query?: object): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
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
  if (response.status === 401 && auth) {
    tangani401();
  }
  const errEnv = json as { message?: string; errors?: Record<string, string[]> };
  throw new ApiError(
    errEnv.message ?? "Terjadi kesalahan",
    response.status,
    errEnv.errors,
  );
}
/**
 * Varian request yang mengembalikan envelope penuh (termasuk `meta`).
 * Dipakai halaman yang butuh info paginasi (§1.3).
 */
async function requestPaged<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T[]; meta: import("@/types").PaginationMeta | null }> {
  const { method = "GET", body, query, auth = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as {
    data?: T[];
    meta?: import("@/types").PaginationMeta;
    message?: string;
    errors?: Record<string, string[]>;
  };
  if (response.ok) {
    return { data: json.data ?? [], meta: json.meta ?? null };
  }
  if (response.status === 401 && auth) {
    tangani401();
  }
  throw new ApiError(
    json.message ?? "Terjadi kesalahan",
    response.status,
    json.errors,
  );
}
/* ============================================================
 * §20 — Penanganan 401 global
 * Token kedaluwarsa / tidak valid: hapus token lalu arahkan ke /masuk.
 * ============================================================ */
let sedangRedirect = false;

function tangani401(): void {
  if (typeof window === "undefined") return;
  clearToken();
  if (sedangRedirect) return;
  const diHalamanAuth =
    window.location.pathname.startsWith("/login") ||
    window.location.pathname.startsWith("/register");
  if (diHalamanAuth) return;
  sedangRedirect = true;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?next=${next}`);
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
export interface ProfilInput {
  tgl_lahir: string;
  jenis_kelamin: string;
  tinggi_cm: number;
  tingkat_aktivitas: string;
  merokok: boolean;
  riwayat_keluarga: string[];
  /** §5.2 — default false */
  tampil_di_peringkat: boolean;
}
export const profil = {
  /** §5.1 GET /profil */
  get: () => request<Profil>("/profil"),
  /** §5.2 PUT /profil — kirim SELURUH field (bukan partial) */
  update: (payload: ProfilInput) => request<Profil>("/profil", { method: "PUT", body: payload }),
};
export const persetujuan = {
  /** §5.3 POST /persetujuan */
  setuju: (versi_kebijakan: string) =>
    request<PersetujuanData>("/persetujuan", {
      method: "POST",
      body: { versi_kebijakan, setuju: true },
    }),
  /** §5.4 DELETE /persetujuan */
  tarik: () => request<PersetujuanData>("/persetujuan", { method: "DELETE" }),
};
/* ============================================================
 * §6 — Master (Wilayah & Faskes)
 * ============================================================ */
export const wilayah = {
  /** §6.1 GET /wilayah — publik */
  list: (query?: { tipe?: string; parent_id?: number; search?: string }) =>
    request<Wilayah[]>("/wilayah", { query, auth: false }),
};
export const faskes = {
  /** §6.2 GET /faskes */
  list: (query?: { wilayah_id?: number; search?: string }) =>
    request<Faskes[]>("/faskes", { query }),
};
/* ============================================================
 * §7 — Catatan Kesehatan
 * ============================================================ */
export const catatanKesehatan = {
  /** §7.2 POST */
  create: (payload: CatatanKesehatanInput) =>
    request<CatatanKesehatan>("/catatan-kesehatan", { method: "POST", body: payload }),
  /** §7.3 GET (dengan paginasi + pencarian §23) */
  list: (query?: CatatanQuery) => request<CatatanKesehatan[]>("/catatan-kesehatan", { query }),
  /** §7.3 GET — sekaligus kembalikan `meta` paginasi */
  listPaged: (query?: CatatanQuery) => requestPaged<CatatanKesehatan>("/catatan-kesehatan", { query }),
  /** §7.4 GET detail */
  detail: (id: number) => request<CatatanKesehatan>(`/catatan-kesehatan/${id}`),
  /** §7.5 DELETE */
  hapus: (id: number) => request<null>(`/catatan-kesehatan/${id}`, { method: "DELETE" }),
};
/* ============================================================
 * §8 — Dashboard Pribadi, Rekam Medis, Insight
 * ============================================================ */
export const dashboard = {
  /** §8.1 GET /dashboard/pribadi */
  pribadi: () => request<DashboardPribadi>("/dashboard/pribadi"),
  /** §9.1 GET /dashboard/kelurahan */
  kelurahan: (query?: DashboardKelurahanQuery) =>
    request<DashboardKelurahan>("/dashboard/kelurahan", { query }),
};
/**
 * §8.2 — Series indikator.
 * Path resmi `/tren` (§20: rename ke `/rekam-medis` dibatalkan).
 * Label menunya tetap "Rekam Medis".
 */
export const rekamMedis = {
  get: (query: RekamMedisQuery) => request<RekamMedis>("/tren", { query }),
};
/** @deprecated — pakai `rekamMedis`. Nama lama dipertahankan agar import tidak pecah. */
export const tren = {
  get: (query: RekamMedisQuery) => request<RekamMedis>("/tren", { query }),
};
export const insight = {
  /** §8.3 GET /insight (+ §29 filter `level`) */
  list: (query?: InsightQuery) => request<Insight[]>("/insight", { query }),
  /** §8.3 tabel ambang_kategori (read-only) — penjelasan aman/siaga/bahaya */
  ambang: () => request<AmbangBaris[]>("/insight/ambang"),
};
/* ============================================================
 * §10 — Posbindu
 * ============================================================ */
export const posbindu = {
  /** §10.1 GET /posbindu/sesi */
  sesiList: (query?: { wilayah_id?: number; dari?: string; status?: string; search?: string }) =>
    request<SesiPosbindu[]>("/posbindu/sesi", { query }),
  /** §10.2 POST /posbindu/sesi */
  sesiBuat: (payload: SesiPosbinduInput) =>
    request<SesiPosbindu>("/posbindu/sesi", { method: "POST", body: payload }),
  /** §10.3 GET /posbindu/sesi/{id} (detail + peserta) */
  sesiDetail: (id: number) => request<SesiPosbinduDetail>(`/posbindu/sesi/${id}`),
  /** §10.4 PUT /posbindu/sesi/{id} */
  sesiUbah: (id: number, payload: Partial<SesiPosbinduInput>) =>
    request<SesiPosbindu>(`/posbindu/sesi/${id}`, { method: "PUT", body: payload }),
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
  /** §10.6 GET /posbindu/kunjungan */
  kunjungan: (query?: KunjunganQuery) =>
    request<KunjunganPosbindu[]>("/posbindu/kunjungan", { query }),
};
/* ============================================================
 * §11 — Rujukan
 * ============================================================ */
export const rujukan = {
  /** §11.1 POST */
  create: (payload: RujukanInput) => request<Rujukan>("/rujukan", { method: "POST", body: payload }),
  /** §11.2 GET */
  list: (query?: RujukanQuery) => request<Rujukan[]>("/rujukan", { query }),
  /** §11.3 PATCH status */
  updateStatus: (id: number, payload: { status: string; catatan?: string }) =>
    request<Rujukan>(`/rujukan/${id}/status`, { method: "PATCH", body: payload }),
};
/* ============================================================
 * §12 / §25 — Program (Tantangan & Reward)
 * ============================================================ */
export const program = {
  /** §12.1 GET */
  list: (query?: ProgramQuery) => request<Program[]>("/program", { query }),
  /** §12.2 POST (admin_kelurahan / super_admin) */
  create: (payload: ProgramInput) => request<Program>("/program", { method: "POST", body: payload }),
  /** §12.3 POST peserta (user ikut program) */
  ikut: (id: number) =>
    request<{ status: string }>(`/program/${id}/peserta`, { method: "POST" }),
  /** §12.4 PATCH peserta (ubah status keikutsertaan) */
  ubahPeserta: (id: number, payload: PesertaProgramInput) =>
    request<{ status: string }>(`/program/${id}/peserta`, { method: "PATCH", body: payload }),
  /** §12.5 GET /peringkat — peringkat EXP satu kelurahan */
  peringkat: (query?: { wilayah_id?: number }) => request<Peringkat>("/peringkat", { query }),
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
    request<import("@/types").Refleksi>("/refleksi", { method: "POST", body: payload }),
};
/* ============================================================
 * §14 — Laporan
 * ============================================================ */
export const laporan = {
  /** §14.1 GET /laporan/pribadi */
  pribadi: (query?: { periode?: string }) =>
    request<LaporanPribadi>("/laporan/pribadi", { query }),
  /** §14.2 GET /laporan/kelurahan (agregat + disclaimer) */
  kelurahan: (query?: DashboardKelurahanQuery) =>
    request<LaporanKelurahan>("/laporan/kelurahan", { query }),
};
/* ============================================================
 * §15 — Admin (Master Data) — super_admin
 * ============================================================ */
export const admin = {
  indikator: {
    list: (query?: { search?: string }) => request<Indikator[]>("/admin/indikator", { query }),
    create: (payload: Partial<Indikator>) =>
      request<Indikator>("/admin/indikator", { method: "POST", body: payload }),
    update: (id: number, payload: Partial<Indikator>) =>
      request<Indikator>(`/admin/indikator/${id}`, { method: "PUT", body: payload }),
    hapus: (id: number) => request<null>(`/admin/indikator/${id}`, { method: "DELETE" }),
  },
  ambangKategori: {
    list: (query?: { search?: string }) =>
      request<AmbangKategori[]>("/admin/ambang-kategori", { query }),
    create: (payload: Partial<AmbangKategori>) =>
      request<AmbangKategori>("/admin/ambang-kategori", { method: "POST", body: payload }),
    update: (id: number, payload: Partial<AmbangKategori>) =>
      request<AmbangKategori>(`/admin/ambang-kategori/${id}`, { method: "PUT", body: payload }),
    hapus: (id: number) => request<null>(`/admin/ambang-kategori/${id}`, { method: "DELETE" }),
  },
  pengguna: {
    list: (query?: { role?: string; search?: string }) =>
      request<AdminPengguna[]>("/admin/pengguna", { query }),
    create: (payload: AdminPenggunaInput) =>
      request<AdminPengguna>("/admin/pengguna", { method: "POST", body: payload }),
    update: (id: number, payload: Partial<AdminPenggunaInput>) =>
      request<AdminPengguna>(`/admin/pengguna/${id}`, { method: "PUT", body: payload }),
    hapus: (id: number) => request<null>(`/admin/pengguna/${id}`, { method: "DELETE" }),
  },
  faskes: {
    list: (query?: { search?: string }) => request<Faskes[]>("/admin/faskes", { query }),
    create: (payload: Partial<Faskes>) =>
      request<Faskes>("/admin/faskes", { method: "POST", body: payload }),
    update: (id: number, payload: Partial<Faskes>) =>
      request<Faskes>(`/admin/faskes/${id}`, { method: "PUT", body: payload }),
    hapus: (id: number) => request<null>(`/admin/faskes/${id}`, { method: "DELETE" }),
  },
  logAudit: {
    list: (query?: { search?: string }) => request<LogAudit[]>("/admin/log-audit", { query }),
  },
  statistik: () => request<AdminStatistik>("/admin/statistik"),
  verifikasi: {
    list: (query?: { wilayah_id?: number; page?: number; per_page?: number }) =>
      requestPaged<CatatanKesehatan>("/admin/catatan-kesehatan/perlu-verifikasi", { query }),
    putuskan: (id: number, setuju: boolean) =>
      request<null>(`/admin/catatan-kesehatan/${id}/verifikasi`, {
        method: "PATCH",
        body: { setuju },
      }),
  },
};
