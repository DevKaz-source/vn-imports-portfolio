import type { Order, OrderStatus } from "@/domain/types";
import { CommerceError } from "@/domain/commerce";
import { isDemo } from "@/server/config";
import { updateOrder } from "@/server/repository";
export type CardToken = {
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string;
};
type MPPayment = {
  id: string;
  status: string;
  status_detail?: string;
  paid_amount?: string;
  payment_method?: {
    qr_code?: string;
    qr_code_base64?: string;
    qr_code_based64?: string;
    ticket_url?: string;
  };
};
export type MPOrder = {
  id: string;
  status: string;
  status_detail?: string;
  external_reference: string;
  total_amount: string;
  total_paid_amount?: string;
  transactions?: { payments: MPPayment[] };
};
export interface PaymentProvider {
  create(order: Order, card?: CardToken): Promise<MPOrder>;
  get(id: string): Promise<MPOrder>;
}
export class PaymentCreationRejected extends CommerceError {}
export class MercadoPagoProvider implements PaymentProvider {
  async create(order: Order, card?: CardToken) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new CommerceError("Pagamentos não configurados.", 503);
    if (order.paymentMethod === "card" && !card)
      throw new CommerceError(
        "Preencha os dados do cartão no formulário seguro.",
      );
    const amount = (order.totalCents / 100).toFixed(2);
    const payment = {
      amount,
      payment_method:
        order.paymentMethod === "pix"
          ? { id: "pix", type: "bank_transfer" }
          : {
              id: card!.paymentMethodId,
              type: "credit_card",
              token: card!.token,
              installments: card!.installments,
            },
      ...(order.paymentMethod === "pix" ? { expiration_time: "PT30M" } : {}),
    };
    const response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": order.idempotencyKey,
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        total_amount: amount,
        external_reference: order.id,
        transactions: { payments: [payment] },
        payer: {
          email: order.customer.email,
          ...(order.customer.document
            ? {
                identification: {
                  type: "CPF",
                  number: order.customer.document,
                },
              }
            : {}),
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      if ([400, 401, 403, 422].includes(response.status))
        throw new PaymentCreationRejected(
          "O pagamento não foi aceito. Confira os dados e tente uma nova compra.",
          422,
        );
      throw new CommerceError(
        "A confirmação do pagamento está em análise. Acompanhe seu pedido.",
        503,
      );
    }
    return (await response.json()) as MPOrder;
  }
  async get(id: string) {
    if (!/^ORD[A-Z0-9]+$/i.test(id))
      throw new CommerceError("Identificador de pagamento inválido.");
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok)
      throw new CommerceError("Não foi possível consultar o pagamento.", 503);
    return (await response.json()) as MPOrder;
  }
}
export function paymentOutcome(
  remote: MPOrder,
  totalCents: number,
): OrderStatus {
  const payments = remote.transactions?.payments || [];
  const paid = Math.round(
    Number(
      remote.total_paid_amount ??
        payments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0),
    ) * 100,
  );
  if (
    remote.status === "processed" &&
    remote.status_detail === "accredited" &&
    payments.some(
      (p) => p.status === "processed" && p.status_detail === "accredited",
    ) &&
    paid === totalCents
  )
    return "paid";
  if (remote.status === "refunded") return "refunded";
  if (["cancelled", "canceled", "expired", "failed"].includes(remote.status))
    return "cancelled";
  return "pending_payment";
}
export async function applyRemotePayment(order: Order, remote: MPOrder) {
  if (
    remote.external_reference !== order.id ||
    Math.round(Number(remote.total_amount) * 100) !== order.totalCents
  )
    throw new CommerceError(
      "Referência ou valor do pagamento divergente.",
      409,
    );
  const payment = remote.transactions?.payments?.[0];
  const method = payment?.payment_method;
  const status = paymentOutcome(remote, order.totalCents);
  return updateOrder(
    order.id,
    status,
    status === "paid"
      ? "Pagamento confirmado pelo Mercado Pago."
      : "Atualização recebida do Mercado Pago.",
    {
      paymentId: remote.id,
      paymentStatus: `${remote.status}:${remote.status_detail || ""}`,
      qrCode: method?.qr_code || order.qrCode,
      qrBase64:
        method?.qr_code_base64 || method?.qr_code_based64 || order.qrBase64,
      paymentUrl: method?.ticket_url || order.paymentUrl,
    },
  );
}
export async function startPayment(order: Order, card?: CardToken) {
  if (isDemo())
    return updateOrder(
      order.id,
      "pending_payment",
      "Compra demonstrativa criada.",
      { paymentId: `demo-${order.id}`, paymentStatus: "demo_pending" },
    );
  try {
    return await applyRemotePayment(
      order,
      await new MercadoPagoProvider().create(order, card),
    );
  } catch (e) {
    if (e instanceof PaymentCreationRejected)
      return updateOrder(order.id, "cancelled", e.message, {
        paymentStatus: "rejected",
      });
    return updateOrder(
      order.id,
      "pending_payment",
      "Aguardando conciliação do provedor.",
      { paymentStatus: "reconciliation_required" },
    );
  }
}
