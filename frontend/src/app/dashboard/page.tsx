export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Selamat datang! Halaman ini akan dibangun pada tahap berikutnya.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Kembali ke Login
        </a>
      </div>
    </main>
  );
}
