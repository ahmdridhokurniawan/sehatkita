import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLogin = jest.fn();
const mockSetToken = jest.fn();
const mockClearUserCache = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useUser", () => ({
  clearUserCache: () => mockClearUserCache(),
}));

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    setToken: (token: string, remember?: boolean) =>
      mockSetToken(token, remember),
    auth: {
      ...actual.auth,
      login: (payload: { email: string; password: string; device_name?: string }) =>
        mockLogin(payload),
    },
  };
});

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LoginPage", () => {
  it("mengubah visibilitas password saat tombol mata diklik", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = document.getElementById(
      "password"
    ) as HTMLInputElement;
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByRole("button", {
      name: /tampilkan password/i,
    });
    expect(toggleBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(toggleBtn);
    expect(passwordInput.type).toBe("text");
    expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
    expect(toggleBtn).toHaveAccessibleName(/sembunyikan password/i);

    await user.click(toggleBtn);
    expect(passwordInput.type).toBe("password");
    expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("menyimpan token persisten ketika checkbox Ingat saya aktif", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      token: "tok-remember-123",
      user: { id: 1, name: "Budi", role: "warga", onboarding_selesai: true },
    });

    render(<LoginPage />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.change(document.getElementById("email") as HTMLInputElement, {
      target: { value: "budi@example.com" },
    });
    fireEvent.change(document.getElementById("password") as HTMLInputElement, {
      target: { value: "rahasia123" },
    });
    await user.click(screen.getByRole("button", { name: /^masuk$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "budi@example.com",
        password: "rahasia123",
        device_name: "web-app",
      });
      expect(mockSetToken).toHaveBeenCalledWith("tok-remember-123", true);
    });
  });

  it("menyimpan token sesi ketika checkbox Ingat saya dinonaktifkan", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      token: "tok-session-456",
      user: { id: 1, name: "Budi", role: "warga", onboarding_selesai: true },
    });

    render(<LoginPage />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);

    fireEvent.change(document.getElementById("email") as HTMLInputElement, {
      target: { value: "budi@example.com" },
    });
    fireEvent.change(document.getElementById("password") as HTMLInputElement, {
      target: { value: "rahasia123" },
    });
    await user.click(screen.getByRole("button", { name: /^masuk$/i }));

    await waitFor(() => {
      expect(mockSetToken).toHaveBeenCalledWith("tok-session-456", false);
    });
  });
});
