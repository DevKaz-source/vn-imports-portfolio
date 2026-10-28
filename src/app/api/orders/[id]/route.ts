import { CommerceError } from "@/domain/commerce";
import { endpoint, readJson } from "@/server/http";
import { getOrder, publicOrder, updateOrder } from "@/server/repository";
import { assertOrigin, equal, hash, rateLimit } from "@/server/security";
import { isDemo } from "@/server/config";
import { z } from "zod";
async function authorized(request: Request) {
  const id = new URL(request.url).pathname.split("/").pop()!;
  if (!z.uuid().safeParse(id).success)
    throw new CommerceError("Pedido não encontrado.", 404);
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const order = await getOrder(id);
  if (!order || !equal(order.accessHash, hash(token)))
    throw new CommerceError("Pedido não encontrado ou acesso inválido.", 404);
  return order;
}
export const GET = endpoint(async (request) => {
  await rateLimit(request, "order-read", 100);
  return publicOrder(await authorized(request));
});
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  await rateLimit(request, "demo-payment", 10);
  if (!isDemo()) throw new CommerceError("Operação não disponível.", 404);
  const o = await authorized(request);
  const { status } = z
    .object({ status: z.enum(["paid", "cancelled"]) })
    .strict()
    .parse(await readJson(request));
  return publicOrder(
    await updateOrder(
      o.id,
      status,
      status === "paid"
        ? "Pagamento demonstrativo aprovado. Nenhuma cobrança."
        : "Pedido de demonstração cancelado.",
      { paymentStatus: status === "paid" ? "demo_paid" : "demo_cancelled" },
    ),
  );
});
