"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { EmptyState } from "@/components/ui/Empty";
import DashboardUser from "@/components/dashboard/DashboardUser";
import DashboardKader from "@/components/dashboard/DashboardKader";

export default function DashboardPage() {
  const router = useRouter();
  const user = useUser();

  useEffect(() => {
    // Redirect ke login jika belum login
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  // Belum ada user data
  if (!user) {
    return <EmptyState title="Memuat..." desc="Mohon tunggu..." />;
  }

  // Render dashboard sesuai role
  switch (user.role) {
    case "user":
      return <DashboardUser user={user} />;
    case "kader":
      return <DashboardKader user={user} />;
    case "admin_kelurahan":
      return <EmptyState title="Dashboard Admin Kelurahan" desc="Sedang dikerjakan..." />;
    case "super_admin":
      return <EmptyState title="Dashboard Super Admin" desc="Sedang dikerjakan..." />;
    default:
      return <EmptyState title="Role tidak dikenali" desc={`Role: ${user.role}`} />;
  }
}
