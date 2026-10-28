import { z } from "zod";
import {
  productSchema,
  settingsSchema,
  couponSchema,
  categorySchema,
  collectionSchema,
  bannerSchema,
  lookSchema,
  socialSchema,
} from "@/domain/validation";
import { CommerceError, canTransition } from "@/domain/commerce";
import { requireAdmin } from "@/server/auth";
import { endpoint, readJson } from "@/server/http";
import { assertOrigin, rateLimit } from "@/server/security";
import {
  getState,
  getOrder,
  getSubscribers,
  saveProduct,
  saveSettings,
  saveEntity,
  deleteProduct,
  adjustInventory,
  updateOrder,
  isEntity,
} from "@/server/repository";
import { isDemo } from "@/server/config";
import {
  MercadoPagoProvider,
  applyRemotePayment,
} from "@/integrations/payments";
const entitySchemas = {
  categories: categorySchema,
  collections: collectionSchema,
  banners: bannerSchema,
  looks: lookSchema,
  social: socialSchema,
  coupons: couponSchema,
};
export const GET = endpoint(async (request) => {
  await requireAdmin();
  const resource = new URL(request.url).pathname.split("/").pop();
  if (resource === "state") return { ...(await getState()), demo: isDemo() };
  if (resource === "newsletter") return getSubscribers();
  throw new CommerceError("Recurso não encontrado.", 404);
});
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  const admin = await requireAdmin();
  await rateLimit(request, "admin-write", 120);
  const resource = new URL(request.url).pathname.split("/").pop()!;
  const body = await readJson(request);
  if (resource === "products") {
    const { product, expectedUpdatedAt } = z
      .object({
        product: productSchema,
        expectedUpdatedAt: z.string().optional(),
      })
      .strict()
      .parse(body);
    if (
      !isDemo() &&
      product.images.some((i) => i.url.startsWith("/api/media/"))
    )
      throw new CommerceError(
        "Envie imagens para o armazenamento de produção.",
      );
    return saveProduct(product, expectedUpdatedAt);
  }
  if (resource === "delete-product") {
    const { id } = z.object({ id: z.uuid() }).strict().parse(body);
    await deleteProduct(id);
    return { ok: true };
  }
  if (resource === "settings") {
    await saveSettings(settingsSchema.parse(body));
    return { ok: true };
  }
  if (resource === "inventory") {
    const { variantId, delta, reason } = z
      .object({
        variantId: z.uuid(),
        delta: z
          .number()
          .int()
          .min(-100000)
          .max(100000)
          .refine((v) => v !== 0),
        reason: z.string().trim().min(3).max(250),
      })
      .strict()
      .parse(body);
    await adjustInventory(variantId, delta, reason, admin);
    return { ok: true };
  }
  if (resource === "orders") {
    const input = z
      .object({
        id: z.uuid(),
        status: z.enum([
          "pending_payment",
          "paid",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "refunded",
        ]),
        trackingCode: z.string().max(100).default(""),
      })
      .strict()
      .parse(body);
    const order = await getOrder(input.id);
    if (!order) throw new CommerceError("Pedido não encontrado.", 404);
    if (!canTransition(order.status, input.status))
      throw new CommerceError("Essa mudança de status não é válida.");
    if (!isDemo() && ["paid", "cancelled", "refunded"].includes(input.status))
      throw new CommerceError(
        "Alterações financeiras devem ser confirmadas no Mercado Pago e sincronizadas.",
      );
    if (input.status === "shipped" && !input.trackingCode)
      throw new CommerceError("Informe o código de rastreio.");
    return updateOrder(
      input.id,
      input.status,
      `Status atualizado por ${admin}.`,
      { trackingCode: input.trackingCode },
    );
  }
  if (resource === "reconcile") {
    const { id } = z.object({ id: z.uuid() }).strict().parse(body);
    const order = await getOrder(id);
    if (!order || !order.paymentId || isDemo())
      throw new CommerceError(
        "Este pedido não possui pagamento consultável no provedor.",
      );
    return applyRemotePayment(
      order,
      await new MercadoPagoProvider().get(order.paymentId),
    );
  }
  if (isEntity(resource)) {
    const input = z
      .object({
        data: entitySchemas[resource],
        remove: z.boolean().default(false),
      })
      .strict()
      .parse(body);
    await saveEntity(resource, input.data, input.remove);
    return { ok: true };
  }
  throw new CommerceError("Recurso não encontrado.", 404);
});
