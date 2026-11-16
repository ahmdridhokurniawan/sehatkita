import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OnboardingPage from "./page";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetuju = jest.fn();
const mockProfilUpdate = jest.fn();
const mockClearUserCache = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useUser", () => ({
  useUser: () => ({
    user: { id: 1, name: "Warga Baru", email: "warga@test.id", role: "user", wilayah_id: 1, consent_at: null },
    loading: false,
  }),
  clearUserCache: () => mockClearUserCache(),
}));

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    persetujuan: {
      ...actual.persetujuan,
      setuju: (...args: unknown[]) => mockSetuju(...args),
    },
    profil: {
      ...actual.profil,
      update: (...args: unknown[]) => mockProfilUpdate(...args),
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("OnboardingPage", () => {
  it("memanggil persetujuan.setuju sebelum profil.update dan mengirim tidak_ada saat riwayat kosong", async () => {
    const urutan: string[] = [];
    mockSetuju.mockImplementation(async () => {
      urutan.push("persetujuan");
      return { consent_at: "2026-11-14T00:00:00Z", versi_kebijakan: "1.0" };
    });
    mockProfilUpdate.mockImplementation(async () => {
      urutan.push("profil");
      return { user_id: 1, profil_lengkap: true };
    });

    render(<OnboardingPage />);

    fireEvent.change(document.querySelector('input[name="tgl_lahir"]') as HTMLInputElement, {
      target: { value: "1998-05-10" },
    });
    fireEvent.change(document.querySelector('select[name="jenis_kelamin"]') as HTMLSelectElement, {
      target: { value: "L" },
    });
    fireEvent.change(document.querySelector('input[name="tinggi_cm"]') as HTMLInputElement, {
      target: { value: "170" },
    });
    fireEvent.change(document.querySelector('select[name="tingkat_aktivitas"]') as HTMLSelectElement, {
      target: { value: "sedang" },
    });
    fireEvent.click(document.querySelector('input[name="setuju"]') as HTMLInputElement);

    fireEvent.click(screen.getByRole("button", { name: /Simpan & Lanjut ke Dashboard/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    expect(urutan).toEqual(["persetujuan", "profil"]);
    expect(mockProfilUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        tinggi_cm: 170,
        riwayat_keluarga: ["tidak_ada"],
      }),
    );
  });

  it("menolak tinggi_cm di luar rentang backend 120–220 cm", async () => {
    render(<OnboardingPage />);

    fireEvent.change(document.querySelector('input[name="tgl_lahir"]') as HTMLInputElement, {
      target: { value: "1998-05-10" },
    });
    fireEvent.change(document.querySelector('select[name="jenis_kelamin"]') as HTMLSelectElement, {
      target: { value: "P" },
    });
    fireEvent.change(document.querySelector('input[name="tinggi_cm"]') as HTMLInputElement, {
      target: { value: "110" },
    });
    fireEvent.change(document.querySelector('select[name="tingkat_aktivitas"]') as HTMLSelectElement, {
      target: { value: "ringan" },
    });
    fireEvent.click(document.querySelector('input[name="setuju"]') as HTMLInputElement);

    fireEvent.click(screen.getByRole("button", { name: /Simpan & Lanjut ke Dashboard/i }));

    expect(await screen.findByText(/120–220 cm/i)).toBeInTheDocument();
    expect(mockSetuju).not.toHaveBeenCalled();
    expect(mockProfilUpdate).not.toHaveBeenCalled();
  });
});
