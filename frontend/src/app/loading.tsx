import LottieLoading from "@/components/ui/LottieLoading";

export default function GlobalLoading() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <LottieLoading label="Memuat halaman…" />
    </main>
  );
}
