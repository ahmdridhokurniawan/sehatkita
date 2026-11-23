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
  AchievementResponse,
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
  EdukasiInput,
  EdukasiItem,
  Faskes,
  Indikator,
  Insight,
  InsightQuery,
  KepuasanMasyarakatItem,
  KepuasanRingkasan,
  KunjunganPosbindu,
  KunjunganQuery,
  LaporanKelurahan,
  LaporanPribadi,
  LogAudit,
  PaginationMeta,
  PersetujuanData,
  PesertaProgramInput,
  PesertaProgram,
  PesertaSaya,
  Peringkat,
  Profil,
  ProgresEdukasi,
  Program,
  ProgramInput,
  ProgramQuery,
  RekamMedis,
  RekamMedisQuery,
  RingkasanProgresEdukasi,
  Rujukan,
  RujukanInput,
  RujukanQuery,
  SuratRujukan,
  SesiPosbindu,
  SesiPosbinduDetail,
  SesiPosbinduInput,
  TargetKesehatan,
  TargetKesehatanInput,
  Pengaduan,
  PengaduanInput,
  PengaduanTanggapiInput,
  RiwayatWilayah,
  User,
  Wilayah,
  WargaCari,
} from "@/types";
/* ============================================================
 * Konfigurasi
 * ============================================================ */
// Alamat API. Default: path relatif, sehingga browser memanggil origin yang
// sama dan Next.js meneruskannya ke backend lewat rewrite di next.config.ts.
// Tidak ada CORS, tidak ada preflight, dan alamat backend boleh berbeda-beda
// per laptop tanpa menyentuh kode.
//
// Kalau backend berada di origin lain dan Anda memang ingin memanggilnya
// langsung dari browser, set NEXT_PUBLIC_API_URL=http://host/api/v1 di
// .env.local. Selama variabel itu kosong, pemanggilan tetap satu origin.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "/api/v1";
// Nama kunci untuk menyimpan token di browser
const TOKEN_KEY = "sehatkita_token";
const AUTH_CHANNEL = "sehatkita_auth";
type AuthBroadcastMsg =
  | { type: "LOGIN"; token: string; remember: boolean }
  | { type: "SYNC_SESSION"; token: string; remember: boolean }
  | { type: "LOGOUT" }
  | { type: "REQUEST_SESSION" };

let channelAuth: BroadcastChannel | null = null;
function dapatChannelAuth(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channelAuth) {
    channelAuth = new BroadcastChannel(AUTH_CHANNEL);
    channelAuth.onmessage = (ev: MessageEvent<AuthBroadcastMsg>) => {
      const msg = ev.data;
      if (!msg) return;
      if (msg.type === "REQUEST_SESSION") {
        const ada = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
        if (ada) {
          channelAuth?.postMessage({
            type: "SYNC_SESSION",
            token: ada,
            remember: Boolean(localStorage.getItem(TOKEN_KEY)),
          } satisfies AuthBroadcastMsg);
        }
      } else if (msg.type === "LOGIN" || msg.type === "SYNC_SESSION") {
        if (msg.remember) {
          sessionStorage.removeItem(TOKEN_KEY);
          localStorage.setItem(TOKEN_KEY, msg.token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          sessionStorage.setItem(TOKEN_KEY, msg.token);
        }
      } else if (msg.type === "LOGOUT") {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem("sehatkita_user_snapshot");
        localStorage.removeItem("sehatkita_user_snapshot");
      }
    };
  }
  return channelAuth;
}

if (typeof window !== "undefined") {
  dapatChannelAuth();
}

/* ============================================================
 * Manajemen token (§18: kesepakatan simpan token)
 * ============================================================ */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string, remember = true, broadcast = true): void {
  if (typeof window === "undefined") return;
  if (remember) {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  if (broadcast) {
    dapatChannelAuth()?.postMessage({ type: "LOGIN", token, remember } satisfies AuthBroadcastMsg);
  }
}
export function clearToken(broadcast = true): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("sehatkita_user_snapshot");
  localStorage.removeItem("sehatkita_user_snapshot");
  if (broadcast) {
    dapatChannelAuth()?.postMessage({ type: "LOGOUT" } satisfies AuthBroadcastMsg);
  }
}

/**
 * Minta token sesi aktif dari tab lain yang sudah login (jika tab baru dibuka).
 * Mengembalikan token jika tersedia atau null setelah timeout singkat.
 */
export function mintaSesiDariTabLain(timeoutMs = 180): Promise<string | null> {
  const existing = getToken();
  if (existing) return Promise.resolve(existing);
  const ch = dapatChannelAuth();
  if (!ch) return Promise.resolve(null);

  return new Promise((resolve) => {
    let selesai = false;
    const timer = window.setTimeout(() => {
      if (selesai) return;
      selesai = true;
      ch.removeEventListener("message", onMsg);
      resolve(getToken());
    }, timeoutMs);

    const onMsg = (ev: MessageEvent<AuthBroadcastMsg>) => {
      const msg = ev.data;
      if (msg && (msg.type === "SYNC_SESSION" || msg.type === "LOGIN") && msg.token) {
        setToken(msg.token, msg.remember, false);
        if (!selesai) {
          selesai = true;
          window.clearTimeout(timer);
          ch.removeEventListener("message", onMsg);
          resolve(msg.token);
        }
      }
    };

    ch.addEventListener("message", onMsg);
    ch.postMessage({ type: "REQUEST_SESSION" } satisfies AuthBroadcastMsg);
  });
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
  // API_BASE_URL bisa berupa path relatif ("/api/v1") — `new URL` menolak
  // string relatif, jadi alas absolutnya diambil dari origin halaman.
  const dasar =
    API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")
      ? API_BASE_URL
      : `${typeof window !== "undefined" ? window.location.origin : "http://localhost"}${API_BASE_URL}`;
  const url = new URL(`${dasar}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}
/** Wrapper fetch: ubah kegagalan jaringan jadi pesan yang bisa dimengerti. */
async function kirim(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    // fetch melempar TypeError("Failed to fetch") bila server tidak terjangkau:
    // alamat salah (mis. hostname lokal di laptop lain), backend mati, atau
    // diblokir CORS/jaringan. Pesan aslinya bahasa Inggris dan tidak
    // menjelaskan apa pun ke pengguna.
    throw new ApiError(
      `Tidak bisa menghubungi server (${API_BASE_URL}). ` +
        "Pastikan backend berjalan dan alamat API di .env.local sudah benar.",
      0,
    );
  }
}

/** Fungsi inti: kirim request ke backend & tangani envelope response */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  // §1.1 — header wajib
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await kirim(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
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
  const response = await kirim(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: {
    data?: T[];
    meta?: import("@/types").PaginationMeta;
    message?: string;
    errors?: Record<string, string[]>;
  };
  try {
    json = (await response.json()) as {
      data?: T[];
      meta?: import("@/types").PaginationMeta;
      message?: string;
      errors?: Record<string, string[]>;
    };
  } catch {
    throw new ApiError(
      `Respons backend tidak valid (status ${response.status})`,
      response.status,
    );
  }
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
const HALAMAN_PUBLIK = new Set([
  "/",
  "/bantuan",
  "/batasan-medis",
  "/kebijakan-privasi",
  "/kontak",
  "/syarat-ketentuan",
]);

export function adalahHalamanPublik(pathname: string, search = ""): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (HALAMAN_PUBLIK.has(normalized)) return true;
  if (normalized.startsWith("/login") || normalized.startsWith("/register")) return true;
  if (normalized === "/kalkulator") {
    const params = new URLSearchParams(search);
    return params.get("app") !== "1";
  }
  return false;
}

let sedangRedirect = false;

function tangani401(): void {
  if (typeof window === "undefined") return;
  clearToken();
  if (sedangRedirect) return;
  const path = window.location.pathname;
  const search = window.location.search;
  if (adalahHalamanPublik(path, search)) return;
  sedangRedirect = true;
  const next = encodeURIComponent(path + search);
  window.location.replace(`/login?next=${next}`);
}

/* ============================================================
 * §4 — Auth
 * ============================================================ */
export const auth = {
  /** §4.1 POST /auth/register */
  register: (payload: {
    name: string;
    nik?: string;
    email: string;
    password: string;
    password_confirmation: string;
    wilayah_id: number;
  }) => request<AuthData>("/auth/register", { method: "POST", body: payload, auth: false }),
  /** §4.2 POST /auth/login */
  login: (payload: { email: string; password: string; device_name?: string }) =>
    request<AuthData>("/auth/login", { method: "POST", body: payload, auth: false }),
  /** §4.3 POST /auth/logout */
  logout: async () => {
    const token = getToken();
    // Bersihkan token lokal seketika agar pengguna tidak terlihat masih masuk
    // apabila server lambat merespons atau navigasi langsung terjadi.
    clearToken();
    if (!token) return null;
    try {
      await kirim(buildUrl("/auth/logout"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Sesi lokal sudah dibersihkan meski server gagal / token sudah mati.
    }
    return null;
  },
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
  sesiList: (query?: { wilayah_id?: number; dari?: string; status?: string; search?: string; page?: number; per_page?: number }) =>
    request<SesiPosbindu[]>("/posbindu/sesi", { query }),
  sesiListPaged: (query?: { wilayah_id?: number; dari?: string; status?: string; search?: string; page?: number; per_page?: number }) =>
    requestPaged<SesiPosbindu>("/posbindu/sesi", { query }),
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
  kunjunganPaged: (query?: KunjunganQuery) =>
    requestPaged<KunjunganPosbindu>("/posbindu/kunjungan", { query }),
};
/* ============================================================
 * §23 — Pencarian warga (petugas) — autocomplete nama / NIK
 * ============================================================ */
export const pengguna = {
  /**
   * GET /pengguna/cari-nik?nik=xxx (kader / super_admin)
   * Mendukung pencarian nama warga (min. 2 huruf) atau awalan NIK (min. 3 digit). Hasil maksimal 10.
   */
  cariNik: (nik: string) => request<WargaCari[]>("/pengguna/cari-nik", { query: { nik } }),
};
/* ============================================================
 * §11 — Rujukan
 * ============================================================ */
export const rujukan = {
  /** §11.1 POST */
  create: (payload: RujukanInput) => request<Rujukan>("/rujukan", { method: "POST", body: payload }),
  /** §11.2 GET */
  list: (query?: RujukanQuery) => request<Rujukan[]>("/rujukan", { query }),
  listPaged: (query?: RujukanQuery) => requestPaged<Rujukan>("/rujukan", { query }),
  /** §11.3 PATCH status */
  updateStatus: (id: number, payload: { status: string; catatan?: string }) =>
    request<Rujukan>(`/rujukan/${id}/status`, { method: "PATCH", body: payload }),
  /** §11.4 GET surat pengantar rujukan */
  surat: (id: number) => request<SuratRujukan>(`/rujukan/${id}/surat`),
};
/* ============================================================
 * §12.6 — Notifikasi Telegram
 * ============================================================ */
export interface TelegramStatus {
  terhubung: boolean;
  chat_id: string | null;
  link_telegram: string;
}

export const telegram = {
  /** GET /telegram/status — ambil status koneksi bot */
  status: () => request<TelegramStatus>("/telegram/status"),
  /** POST /telegram/putuskan — putus sambungan bot */
  putuskan: () => request<{ ok: boolean }>("/telegram/putuskan", { method: "POST" }),
};

/* ============================================================
 * §12 / §25 — Program (Tantangan & Reward)
 * ============================================================ */
export const program = {
  /** §12.1 GET */
  list: (query?: ProgramQuery) => request<Program[]>("/program", { query }),
  listPaged: (query?: ProgramQuery) => requestPaged<Program>("/program", { query }),
  /** Detail satu program/tantangan */
  detail: (id: number) => request<Program>(`/program/${id}`),
  /** §12.2 POST (admin_kelurahan / super_admin) */
  create: (payload: ProgramInput) => request<Program>("/program", { method: "POST", body: payload }),
  /** §12.2 PUT/PATCH (admin_kelurahan / super_admin) */
  update: (id: number, payload: Partial<ProgramInput> & { status?: string }) =>
    request<Program>(`/program/${id}`, { method: "PUT", body: payload }),
  /** §12.2 DELETE (admin_kelurahan / super_admin) */
  hapus: (id: number) => request<null>(`/program/${id}`, { method: "DELETE" }),
  /** §12.3 POST peserta (user ikut program) */
  ikut: (id: number) =>
    request<{ status: string }>(`/program/${id}/peserta`, { method: "POST" }),
  /** §12.4 PATCH peserta (ubah status keikutsertaan / verifikasi bukti) */
  ubahPeserta: (id: number, payload: PesertaProgramInput) =>
    request<{ status: string }>(`/program/${id}/peserta`, { method: "PATCH", body: payload }),
  /** Unggah foto dokumentasi penyelesaian misi tantangan */
  kirimBukti: (id: number, payload: FormData) =>
    request<PesertaSaya>(`/program/${id}/bukti`, { method: "POST", body: payload }),
  /** Hapus foto dokumentasi tantangan milik warga sebelum diverifikasi selesai */
  hapusBukti: (id: number, index?: number) =>
    request<PesertaSaya>(
      index !== undefined ? `/program/${id}/bukti?index=${index}` : `/program/${id}/bukti`,
      { method: "DELETE" },
    ),
  /** §12.7c PATCH progres mandiri tantangan */
  perbaruiProgres: (
    id: number,
    payload: {
      progres_persen?: number;
      capaian_nilai?: number;
      tambah_capaian?: number;
      catatan_progres?: string;
    },
  ) => request<PesertaSaya>(`/program/${id}/progres`, { method: "PATCH", body: payload }),
  /** §12.6 GET daftar peserta  */
  peserta: (id: number) =>
    request<PesertaProgram[]>(`/program/${id}/peserta`),
  /** §12.5 GET /peringkat — peringkat EXP satu kelurahan */
  peringkat: (query?: { wilayah_id?: number }) => request<Peringkat>("/peringkat", { query }),
};

export const achievementApi = {
  /** §12.8b GET /achievement — katalog lencana keaktifan bersimbol */
  list: () => request<AchievementResponse>("/achievement"),
};

/** §12.9 — Modul Edukasi Terpisah & Progres Pribadi */
export const edukasiApi = {
  listPaged: async (query?: {
    kategori?: string;
    status_baca?: string;
    search?: string;
    wilayah_id?: number;
    page?: number;
    per_page?: number;
  }): Promise<{
    data: EdukasiItem[];
    meta: PaginationMeta | null;
    ringkasan_progres: RingkasanProgresEdukasi | null;
  }> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await kirim(buildUrl("/edukasi", query), { method: "GET", headers });
    let json: {
      data?: EdukasiItem[];
      meta?: PaginationMeta;
      ringkasan_progres?: RingkasanProgresEdukasi | null;
      message?: string;
      errors?: Record<string, string[]>;
    };
    try {
      json = (await response.json()) as {
        data?: EdukasiItem[];
        meta?: PaginationMeta;
        ringkasan_progres?: RingkasanProgresEdukasi | null;
        message?: string;
        errors?: Record<string, string[]>;
      };
    } catch {
      throw new ApiError(
        `Respons backend tidak valid (status ${response.status})`,
        response.status,
      );
    }
    if (response.ok) {
      return {
        data: json.data ?? [],
        meta: json.meta ?? null,
        ringkasan_progres: json.ringkasan_progres ?? null,
      };
    }
    if (response.status === 401) {
      tangani401();
    }
    throw new ApiError(json.message ?? "Terjadi kesalahan", response.status, json.errors);
  },
  detail: (id: number) => request<EdukasiItem>(`/edukasi/${id}`),
  buat: (payload: EdukasiInput | FormData) =>
    request<EdukasiItem>("/edukasi", { method: "POST", body: payload }),
  ubah: (id: number, payload: Partial<EdukasiInput> | FormData) => {
    if (payload instanceof FormData) {
      payload.append("_method", "PUT");
      return request<EdukasiItem>(`/edukasi/${id}`, { method: "POST", body: payload });
    }
    return request<EdukasiItem>(`/edukasi/${id}`, { method: "PUT", body: payload });
  },
  hapus: (id: number) => request<null>(`/edukasi/${id}`, { method: "DELETE" }),
  simpanProgres: (
    id: number,
    payload: { progres_persen?: number; sudah_dibaca?: boolean; catatan_pribadi?: string | null },
  ) =>
    request<
      ProgresEdukasi & {
        edukasi_id: number;
        badge_baru?: string[];
        ringkasan_progres?: RingkasanProgresEdukasi;
      }
    >(`/edukasi/${id}/progres`, { method: "PATCH", body: payload }),
};

/** Ambil media terautentikasi (mis. foto dokumentasi tantangan) sebagai object URL. */
export async function fetchMediaBlobUrl(pathOrUrl: string): Promise<string> {
  const path = pathOrUrl.startsWith(API_BASE_URL)
    ? pathOrUrl
    : pathOrUrl.startsWith("/api/v1")
      ? `${API_BASE_URL}${pathOrUrl.slice("/api/v1".length)}`
      : `${API_BASE_URL}${pathOrUrl}`;
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { headers });
  if (!res.ok) {
    if (res.status === 401) tangani401();
    throw new ApiError("Gagal memuat dokumentasi", res.status);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
/* ============================================================
 * §13 — Target Kesehatan
 * ============================================================ */
/** §13.4 — CRUD target kesehatan dinamis /target-kesehatan */
export const targetKesehatan = {
  list: (query?: { tercapai?: boolean; page?: number; per_page?: number }) =>
    request<TargetKesehatan[]>("/target-kesehatan", { query }),
  listPaged: (query?: { tercapai?: boolean; page?: number; per_page?: number }) =>
    requestPaged<TargetKesehatan>("/target-kesehatan", { query }),
  buat: (payload: TargetKesehatanInput) =>
    request<TargetKesehatan>("/target-kesehatan", { method: "POST", body: payload }),
  ubah: (id: number, payload: Partial<TargetKesehatanInput>) =>
    request<TargetKesehatan>(`/target-kesehatan/${id}`, { method: "PUT", body: payload }),
  capai: (id: number, tercapai = true) =>
    request<TargetKesehatan>(`/target-kesehatan/${id}/capai`, {
      method: "PATCH",
      body: { tercapai },
    }),
  hapus: (id: number) => request<null>(`/target-kesehatan/${id}`, { method: "DELETE" }),
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
    list: (query?: { search?: string; page?: number; per_page?: number }) =>
      request<Indikator[]>("/admin/indikator", { query }),
    listPaged: (query?: { search?: string; page?: number; per_page?: number }) =>
      requestPaged<Indikator>("/admin/indikator", { query }),
    create: (payload: Partial<Indikator>) =>
      request<Indikator>("/admin/indikator", { method: "POST", body: payload }),
    update: (id: number, payload: Partial<Indikator>) =>
      request<Indikator>(`/admin/indikator/${id}`, { method: "PUT", body: payload }),
    hapus: (id: number) => request<null>(`/admin/indikator/${id}`, { method: "DELETE" }),
  },
  ambangKategori: {
    list: (query?: { search?: string; page?: number; per_page?: number; kode?: string; indikator_id?: number }) =>
      request<AmbangKategori[]>("/admin/ambang-kategori", { query }),
    listPaged: (query?: { search?: string; page?: number; per_page?: number; kode?: string; indikator_id?: number }) =>
      requestPaged<AmbangKategori>("/admin/ambang-kategori", { query }),
    create: (payload: Partial<AmbangKategori>) =>
      request<AmbangKategori>("/admin/ambang-kategori", { method: "POST", body: payload }),
    update: (id: number, payload: Partial<AmbangKategori>) =>
      request<AmbangKategori>(`/admin/ambang-kategori/${id}`, { method: "PUT", body: payload }),
    hapus: (id: number) => request<null>(`/admin/ambang-kategori/${id}`, { method: "DELETE" }),
  },
  pengguna: {
    list: (query?: { role?: string; wilayah_id?: number; search?: string; page?: number; per_page?: number }) =>
      request<AdminPengguna[]>("/admin/pengguna", { query }),
    listPaged: (query?: { role?: string; wilayah_id?: number; search?: string; page?: number; per_page?: number }) =>
      requestPaged<AdminPengguna>("/admin/pengguna", { query }),
    create: (payload: AdminPenggunaInput) =>
      request<AdminPengguna>("/admin/pengguna", { method: "POST", body: payload }),
    update: (id: number, payload: Partial<AdminPenggunaInput>) =>
      request<AdminPengguna>(`/admin/pengguna/${id}`, { method: "PUT", body: payload }),
    hapus: (id: number) => request<null>(`/admin/pengguna/${id}`, { method: "DELETE" }),
    riwayatWilayah: (id: number) => request<RiwayatWilayah[]>(`/admin/pengguna/${id}/riwayat-wilayah`),
  },
  faskes: {
    list: (query?: { search?: string; jenis?: string; wilayah_id?: number; page?: number; per_page?: number }) =>
      request<Faskes[]>("/admin/faskes", { query }),
    listPaged: (query?: { search?: string; jenis?: string; wilayah_id?: number; page?: number; per_page?: number }) =>
      requestPaged<Faskes>("/admin/faskes", { query }),
    create: (payload: Partial<Faskes>) =>
      request<Faskes>("/admin/faskes", { method: "POST", body: payload }),
    update: (id: number, payload: Partial<Faskes>) =>
      request<Faskes>(`/admin/faskes/${id}`, { method: "PUT", body: payload }),
    hapus: (id: number) => request<null>(`/admin/faskes/${id}`, { method: "DELETE" }),
  },
  logAudit: {
    list: (query?: { search?: string; aksi?: string; page?: number; per_page?: number }) =>
      request<LogAudit[]>("/admin/log-audit", { query }),
    listPaged: (query?: { search?: string; aksi?: string; page?: number; per_page?: number }) =>
      requestPaged<LogAudit>("/admin/log-audit", { query }),
  },
  statistik: () => request<AdminStatistik>("/admin/statistik"),
  /** §S3 — unduh CSV atau Excel (.xls) stream. Mengembalikan Blob untuk di-download. */
  ekspor: async (
    tipe: "catatan" | "posbindu" | "rujukan",
    format: "csv" | "excel" = "csv",
  ): Promise<Blob> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/admin/export?tipe=${tipe}&format=${format}`, { headers });
    if (!res.ok) {
      if (res.status === 401) tangani401();
      let pesan = "Gagal mengunduh data.";
      try {
        const j = await res.json();
        pesan = j?.message ?? pesan;
      } catch {
        /* abaikan */
      }
      throw new ApiError(pesan, res.status);
    }
    return res.blob();
  },
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

/** §A3 — Pengaduan warga */
export const pengaduanApi = {
  list: (query?: { status?: string; kategori?: string; search?: string; page?: number; per_page?: number }) =>
    request<Pengaduan[]>("/pengaduan", { query }),
  listPaged: (query?: { status?: string; kategori?: string; search?: string; page?: number; per_page?: number }) =>
    requestPaged<Pengaduan>("/pengaduan", { query }),
  detail: (id: number) => request<Pengaduan>(`/pengaduan/${id}`),
  buat: (payload: PengaduanInput) =>
    request<Pengaduan>("/pengaduan", { method: "POST", body: payload }),
  tanggapi: (id: number, payload: PengaduanTanggapiInput) =>
    request<Pengaduan>(`/pengaduan/${id}/tanggapi`, { method: "PATCH", body: payload }),
};

/** Survei Kepuasan Masyarakat */
export const kepuasanMasyarakatApi = {
  list: async (query?: { wilayah_id?: number; rating?: number; page?: number; per_page?: number }) => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await kirim(buildUrl("/kepuasan-masyarakat", query), { method: "GET", headers });
    const json = (await res.json()) as {
      data?: KepuasanMasyarakatItem[];
      meta?: PaginationMeta;
      ringkasan?: KepuasanRingkasan;
      message?: string;
    };
    if (!res.ok) {
      if (res.status === 401) tangani401();
      throw new ApiError(json.message ?? "Gagal memuat kepuasan masyarakat", res.status);
    }
    return {
      data: json.data ?? [],
      meta: json.meta ?? null,
      ringkasan: json.ringkasan ?? {
        total_responden: 0,
        rata_rata_rating: 0,
        indeks_kepuasan_persen: 0,
        distribusi_bintang: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
      },
    };
  },
  kirim: (payload: { rating: number; aspek_pelayanan?: string; komentar?: string }) =>
    request<KepuasanMasyarakatItem>("/kepuasan-masyarakat", { method: "POST", body: payload }),
};
