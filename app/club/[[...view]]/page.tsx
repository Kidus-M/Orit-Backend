import type { Metadata } from "next";

import { WineClubApp } from "@/components/wine-club/wine-club-app";

export const metadata: Metadata = {
  title: "Wine Club Login",
  description: "Access Orit Tej Wine Club membership, orders, QR codes, and benefits on the web.",
  robots: { index: false, follow: false },
};

export default async function ClubPage({
  params,
}: {
  params: Promise<{ view?: string[] }>;
}) {
  const { view } = await params;
  return <WineClubApp initialView={view?.[0] ?? "home"} />;
}
