import { z } from "zod";

import { prepareDatabase } from "@/lib/db/prepare";
import { ApiError, handleRoute, json } from "@/lib/server/http";
import { authorizePickup } from "@/lib/server/pickup";

const bodySchema = z.object({
  token: z.string().min(32).max(100),
  serviceCode: z.string().regex(/^\d{4}$/),
});

export async function POST(request: Request) {
  return handleRoute(async () => {
    await prepareDatabase();
    const input = bodySchema.parse(await request.json());
    const order = await authorizePickup(
      request,
      input.token,
      input.serviceCode,
    );

    if (!order.paid) throw new ApiError(409, "Order payment is not complete");

    return json({
      order: {
        id: order.orderId,
        name: order.customerName,
        email: order.customerEmail,
        quantity: order.quantity,
        paid: order.paid,
        locationName: order.locationName,
        status: order.status,
        isMember: order.isMember,
      },
    });
  });
}
