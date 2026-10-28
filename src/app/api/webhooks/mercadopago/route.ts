import { CommerceError } from "@/domain/commerce";
import { endpoint } from "@/server/http";
import { verifyWebhookSignature } from "@/server/security";
import { getOrder } from "@/server/repository";
import {
  MercadoPagoProvider,
  applyRemotePayment,
} from "@/integrations/payments";
import { isDemo } from "@/server/config";
export const POST = endpoint(async (request) => {
  if (isDemo())
    throw new CommerceError("Webhook indisponível no modo demo.", 404);
  const id = new URL(request.url).searchParams.get("data.id") || "";
  if (
    !verifyWebhookSignature(
      id,
      request.headers.get("x-request-id") || "",
      request.headers.get("x-signature") || "",
      process.env.MERCADOPAGO_WEBHOOK_SECRET || "",
    )
  )
    throw new CommerceError("Assinatura inválida.", 401);
  const remote = await new MercadoPagoProvider().get(id);
  const order = await getOrder(remote.external_reference);
  if (!order)
    throw new CommerceError(
      "Pedido ainda não encontrado. Repetir notificação.",
      503,
    );
  await applyRemotePayment(order, remote);
  return { received: true };
});
