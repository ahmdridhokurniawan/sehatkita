import { render, screen, waitFor } from "@testing-library/react";
import ProgramPage from "./page";
import ProgramDetailPage from "./[id]/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/program",
  useParams: () => ({ id: "1" }),
}));

jest.mock("@/hooks/useUser", () => ({
  useUser: () => ({
    user: { id: 1, name: "Budi Santoso", email: "budi@test.id", role: "user", wilayah_id: 1, consent_at: "2026-10-01" },
    loading: false,
  }),
  clearUserCache: jest.fn(),
}));

jest.mock("@/hooks/useMinLoading", () => ({
  useMinLoading: (v: boolean) => v,
}));

jest.mock("@/components/app/AppShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: jest.fn(), warning: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    program: {
      ...actual.program,
      listPaged: jest.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            judul: "Push Up Harian 100 Kali",
            deskripsi: "Push up rutin",
            jenis: "olahraga",
            target_peserta: 50,
            jumlah_peserta: 5,
            mode_progres: "otomatis",
            target_nilai: 100,
            satuan_target: "push up",
            mulai: "2026-11-01",
            selesai: "2026-12-01",
            status: "berjalan",
            diikuti: true,
            status_saya: "terdaftar",
            peserta_saya: { id: 10, status: "terdaftar", progres_persen: 20, capaian_nilai: 20 },
            exp: 50,
            badge: "Pejuang",
            level: 1,
            rank_kelurahan: null,
          },
        ],
        meta: { page: 1, per_page: 10, total: 1, last_page: 1 },
      }),
      detail: jest.fn().mockResolvedValue({
        id: 1,
        judul: "Push Up Harian 100 Kali",
        deskripsi: "Push up rutin",
        jenis: "olahraga",
        target_peserta: 50,
        jumlah_peserta: 5,
        mode_progres: "otomatis",
        target_nilai: 100,
        satuan_target: "push up",
        mulai: "2026-11-01",
        selesai: "2026-12-01",
        status: "berjalan",
        diikuti: true,
        status_saya: "terdaftar",
        peserta_saya: { id: 10, status: "terdaftar", progres_persen: 20, capaian_nilai: 20 },
        exp: 50,
        badge: "Pejuang",
        level: 1,
        rank_kelurahan: null,
      }),
    },
  };
});

describe("Program pages render cleanly", () => {
  it("renders ProgramPage without crashing", async () => {
    render(<ProgramPage />);
    await waitFor(() => {
      expect(screen.getByText("Push Up Harian 100 Kali")).toBeInTheDocument();
    });
  });

  it("renders ProgramDetailPage without crashing", async () => {
    render(<ProgramDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Progres Pribadi Saya")).toBeInTheDocument();
    });
  });
});
