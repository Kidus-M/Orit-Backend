import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prepareDatabase } from "@/lib/db/prepare";
import { pickupTokenIsActive } from "@/lib/server/pickup";
import { PickupClient } from "./pickup-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pickup verification | Orit Tej",
  description: "Secure Orit Tej pickup verification",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default async function PickupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await prepareDatabase();

  if (!(await pickupTokenIsActive(token))) {
    notFound();
  }

  return <PickupClient token={token} />;
}
