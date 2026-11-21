import { adalahHalamanPublik, ApiError, auth, clearToken, getToken, setToken } from "./api";

describe("api token storage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("menyimpan token di localStorage saat remember=true (default)", () => {
    sessionStorage.setItem("sehatkita_token", "stale-session-token");

    setToken("persist-token");

    expect(localStorage.getItem("sehatkita_token")).toBe("persist-token");
    expect(sessionStorage.getItem("sehatkita_token")).toBeNull();
    expect(getToken()).toBe("persist-token");
  });

  it("menyimpan token di sessionStorage saat remember=false", () => {
    localStorage.setItem("sehatkita_token", "stale-local-token");

    setToken("session-token", false);

    expect(sessionStorage.getItem("sehatkita_token")).toBe("session-token");
    expect(localStorage.getItem("sehatkita_token")).toBeNull();
    expect(getToken()).toBe("session-token");
  });

  it("menghapus token dari localStorage dan sessionStorage saat clearToken dipanggil", () => {
    localStorage.setItem("sehatkita_token", "local-tok");
    sessionStorage.setItem("sehatkita_token", "sess-tok");

    clearToken();

    expect(localStorage.getItem("sehatkita_token")).toBeNull();
    expect(sessionStorage.getItem("sehatkita_token")).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("auth.logout menghapus token lokal seketika", async () => {
    setToken("active-token");
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 204 });

    await auth.logout();

    expect(getToken()).toBeNull();
  });
});

describe("penanganan 401 pada halaman publik", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it.each([
    ["/", ""],
    ["/bantuan", ""],
    ["/bantuan/", ""],
    ["/batasan-medis", ""],
    ["/kebijakan-privasi", ""],
    ["/kontak", ""],
    ["/syarat-ketentuan", ""],
    ["/login", ""],
    ["/register", ""],
    ["/kalkulator", ""],
    ["/kalkulator", "?tab=imt"],
  ])("mengenali %s%s sebagai halaman publik", (pathname, search) => {
    expect(adalahHalamanPublik(pathname, search)).toBe(true);
  });

  it.each([
    ["/dashboard", ""],
    ["/profil", ""],
    ["/admin/pengguna", ""],
    ["/rekam-medis", ""],
    ["/kalkulator", "?app=1"],
  ])("mengenali %s%s sebagai halaman terproteksi", (pathname, search) => {
    expect(adalahHalamanPublik(pathname, search)).toBe(false);
  });

  it("membersihkan token tanpa me-redirect ke /login saat 401 terjadi di landing page", async () => {
    window.history.pushState({}, "", "/");
    setToken("expired-token");
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "Unauthenticated." }),
    });

    await expect(auth.me()).rejects.toThrow(ApiError);
    expect(getToken()).toBeNull();
    expect(window.location.pathname).toBe("/");
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
