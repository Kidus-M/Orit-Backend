import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prepareDatabase } from "@/lib/db/prepare";
import { findVendorOrderByToken } from "@/lib/server/vendor-orders";
import { VendorOrderConfirmation } from "./vendor-order-confirmation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendor order confirmation | Orit Tej",
  description: "Secure Orit Tej vendor order confirmation",
  robots: { index: false, follow: false },
};

export default async function VendorOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await prepareDatabase();
  const { token } = await params;
  const order = await findVendorOrderByToken(token);
  if (!order) notFound();

  return (
    <VendorOrderConfirmation
      token={token}
      order={{
        ...order,
        createdAt: order.createdAt.toISOString(),
        confirmedAt: order.confirmedAt?.toISOString() ?? null,
      }}
    />
  );
}