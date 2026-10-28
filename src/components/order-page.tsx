"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Copy } from "lucide-react";
import type { publicOrder } from "@/server/repository";
import { money, statusLabels, whatsappUrl } from "@/domain/commerce";
import { useStore } from "./store-provider";
import { track } from "./tracking";
type OrderView = ReturnType<typeof publicOrder>;
export function OrderPage({ id }: { id: string }) {
  const { catalog, notify } = useStore();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(
    async (status?: "paid" | "cancelled") => {
      const token = sessionStorage.getItem(`vn:order:${id}`);
      if (!token) {
        setError(
          "O acesso ao pedido fica salvo no navegador usado na compra. Se precisar, fale com a VN e informe o número do pedido.",
        );
        return;
      }
      const response = await fetch(`/api/orders/${id}`, {
        method: status ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(status ? { "Content-Type": "application/json" } : {}),
        },
        body: status ? JSON.stringify({ status }) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrder(data);
    },
    [id],
  );
  useEffect(() => {
    void refresh().catch((e) => setError((e as Error).message));
    const timer = setInterval(() => {
      void refresh().catch(() => {});
    }, 12000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (
      order &&
      !order.demo &&
      ["paid", "processing", "shipped", "delivered"].includes(order.status) &&
      !sessionStorage.getItem(`vn:purchase:${order.id}`)
    ) {
      const sent = track("purchase", {
        transaction_id: order.id,
        currency: "BRL",
        value: order.totalCents / 100,
        items: order.items.map((i) => ({
          item_id: i.productId,
          item_name: i.name,
          quantity: i.quantity,
          price: i.unitCents / 100,
        })),
      });
      if (sent) sessionStorage.setItem(`vn:purchase:${order.id}`, "1");
    }
  }, [order]);
  const wa = order
    ? whatsappUrl(
        catalog.settings.whatsapp,
        `Olá! Gostaria de ajuda com meu pedido ${order.number} da VN Imports.`,
      )
    : null;
  async function simulate(status: "paid" | "cancelled") {
    setBusy(true);
    try {
      await refresh(status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="content-page">
      <p className="eyebrow">VN IMPORTS / SEU PEDIDO</p>
      <h1>
        {order?.status === "paid" ? "FIT CONFIRMADO." : "ACOMPANHE SEU FIT."}
      </h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {order ? (
        <>
          <p>
            <strong>{order.number}</strong>
          </p>
          <section className="order-status">
            {["paid", "processing", "shipped", "delivered"].includes(
              order.status,
            ) ? (
              <CheckCircle2 size={32} />
            ) : (
              <Clock size={32} />
            )}
            <h2>{statusLabels[order.status]}</h2>
            <p className="muted">
              {order.demo
                ? "Demonstração: nenhuma cobrança ou entrega real."
                : order.status === "pending_payment"
                  ? "Seu pedido está reservado enquanto aguardamos a confirmação do pagamento."
                  : "Você pode acompanhar as próximas etapas por aqui."}
            </p>
            {order.status === "pending_payment" && order.demo && (
              <div className="chips">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void simulate("paid")}
                >
                  SIMULAR PAGAMENTO APROVADO
                </button>
                <button
                  className="button button-outline"
                  disabled={busy}
                  onClick={() => void simulate("cancelled")}
                >
                  CANCELAR SIMULAÇÃO
                </button>
              </div>
            )}
            {order.status === "pending_payment" &&
              !order.demo &&
              order.paymentMethod === "pix" && (
                <>
                  {order.qrBase64 && (
                    <img
                      className="qr-code"
                      src={`data:image/png;base64,${order.qrBase64}`}
                      alt="QR Code Pix do pedido"
                    />
                  )}
                  {order.qrCode && (
                    <button
                      className="button full"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(order.qrCode!);
                          notify("Código Pix copiado.");
                        } catch {
                          notify(
                            "Não foi possível copiar. Use o link de pagamento.",
                          );
                        }
                      }}
                    >
                      <Copy size={17} />
                      COPIAR CÓDIGO PIX
                    </button>
                  )}
                  {order.paymentUrl &&
                    /^https:\/\/[a-z0-9.-]*(mercadopago|mercadolibre)\./.test(
                      order.paymentUrl,
                    ) && (
                      <a
                        className="text-link"
                        href={order.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ABRIR PAGAMENTO
                      </a>
                    )}
                  {order.paymentStatus === "reconciliation_required" && (
                    <p className="notice" style={{ marginTop: 15 }}>
                      O provedor ainda está confirmando a criação do pagamento.
                      Evite iniciar outra compra; acompanhe esta página ou fale
                      com a loja.
                    </p>
                  )}
                </>
              )}
            {order.trackingCode && (
              <p style={{ marginTop: 20 }}>
                Código de rastreio: <strong>{order.trackingCode}</strong>
              </p>
            )}
          </section>
          <div>
            {order.items.map((item) => (
              <div className="summary-line" key={item.variantId}>
                <span>
                  {item.quantity} × {item.name}
                  <small className="muted" style={{ display: "block" }}>
                    {item.size} / {item.color}
                  </small>
                </span>
                <strong>{money(item.unitCents * item.quantity)}</strong>
              </div>
            ))}
            <div className="summary-line">
              <span>Entrega</span>
              <span>{money(order.shippingCents)}</span>
            </div>
            <div className="summary-line">
              <span>Descontos</span>
              <span>
                − {money(order.discountCents + order.pixDiscountCents)}
              </span>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <strong>{money(order.totalCents)}</strong>
            </div>
          </div>
          <div className="timeline">
            {order.history.map((event, i) => (
              <div key={i}>
                <strong>{statusLabels[event.status]}</strong>
                <p>{event.message}</p>
                <time>{new Date(event.at).toLocaleString("pt-BR")}</time>
              </div>
            ))}
          </div>
          <div className="chips">
            <Link className="button" href="/produtos">
              VOLTAR À SELEÇÃO
            </Link>
            {wa && (
              <a
                className="button button-outline"
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
              >
                AJUDA COM O PEDIDO
              </a>
            )}
          </div>
        </>
      ) : (
        !error && <p className="notice">Consultando seu pedido…</p>
      )}
    </div>
  );
}
