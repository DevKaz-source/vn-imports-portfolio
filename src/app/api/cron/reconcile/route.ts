import { CommerceError } from "@/domain/commerce";
import { endpoint } from "@/server/http";
import { equal } from "@/server/security";
import { getState, updateOrder } from "@/server/repository";
import { isDemo } from "@/server/config";
import {
  MercadoPagoProvider,
  applyRemotePayment,
} from "@/integrations/payments";
export const GET = endpoint(async (request) => {
  if (
    !process.env.CRON_SECRET ||
    !equal(
      request.headers.get("authorization") || "",
      `Bearer ${process.env.CRON_SECRET}`,
    )
  )
    throw new CommerceError("Não autorizado.", 401);
  const state = await getState();
  let updated = 0;
  let review = 0;
  for (const order of state.orders
    .filter((o) => o.status === "pending_payment")
    .slice(0, 50)) {
    if (isDemo()) {
      if (Date.now() - Date.parse(order.createdAt) > 30 * 60 * 1000) {
        await updateOrder(
          order.id,
          "cancelled",
          "Reserva demonstrativa expirada.",
        );
        updated++;
      }
    } else if (order.paymentId) {
      try {
        await applyRemotePayment(
          order,
          await new MercadoPagoProvider().get(order.paymentId),
        );
        updated++;
      } catch {
        review++;
      }
    } else review++;
  }
  return { updated, review };
});
