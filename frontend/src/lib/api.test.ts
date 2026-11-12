import { clearToken, getToken, setToken } from "./api";

describe("api token storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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
});
