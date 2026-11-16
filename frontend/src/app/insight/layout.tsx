import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Peringatan Dini" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
