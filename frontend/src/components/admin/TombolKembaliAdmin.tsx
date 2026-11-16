"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useUser } from "@/hooks/useUser";

type Props = {
  /** Tampilkan hanya untuk super_admin di halaman bersama (mis. /admin/pengaduan, /peringkat). */
  hanyaSuperAdmin?: boolean;
};

/** Tautan kembali ke halaman Menu Administrasi (/admin). */
export default function TombolKembaliAdmin({ hanyaSuperAdmin = false }: Props) {
  const { user } = useUser();
  if (hanyaSuperAdmin && user?.role !== "super_admin") {
    return null;
  }

  return (
    <div className="mb-12">
      <Link href="/admin" className="btn btn-outline btn-sm">
        <Icon name="arrow-left" size={15} /> Kembali ke Menu Administrasi
      </Link>
    </div>
  );
}
