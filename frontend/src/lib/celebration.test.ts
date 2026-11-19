import { shouldCelebrateCompletion } from "./celebration";

describe("shouldCelebrateCompletion", () => {
  it("memicu perayaan saat status berubah menjadi selesai", () => {
    expect(shouldCelebrateCompletion("menunggu_verifikasi", "selesai")).toBe(true);
  });

  it("tidak memicu perayaan saat halaman pertama kali memuat status selesai", () => {
    expect(shouldCelebrateCompletion(null, "selesai")).toBe(false);
  });

  it("tidak memicu perayaan untuk status selain selesai atau selesai berulang", () => {
    expect(shouldCelebrateCompletion("terdaftar", "menunggu_verifikasi")).toBe(false);
    expect(shouldCelebrateCompletion("selesai", "selesai")).toBe(false);
  });
});
