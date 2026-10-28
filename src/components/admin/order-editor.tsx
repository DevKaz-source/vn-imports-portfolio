"use client";
import { useState } from "react";
import type { Order, OrderStatus } from "@/domain/types";
import { canTransition, money, statusLabels } from "@/domain/commerce";
import { Modal, Field } from "@/components/ui";
import { api } from "@/lib/utils";
export function OrderEditor({
  order,
  demo,
  onClose,
  onSaved,
}: {
  order: Order;
  demo: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(order.status);
  const [tracking, setTracking] = useState(order.trackingCode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(reconcile = false) {
    setBusy(true);
    setError("");
    try {
      await api(
        reconcile ? "/api/admin/reconcile" : "/api/admin/orders",
        reconcile
          ? { id: order.id }
          : { id: order.id, status, trackingCode: tracking },
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={order.number}
      wide
    >
      <div className="order-admin-columns">
        <section>
          <h3 className="admin-subheading">CLIENTE</h3>
          <p>{order.customer.name}</p>
          <p className="small">
            {order.customer.email}
            <br />
            {order.customer.phone}
          </p>
          <h3 className="admin-subheading">ENTREGA</h3>
          <p className="small">
            {order.address.street}, {order.address.number}{" "}
            {order.address.complement}
            <br />
            {order.address.district} · {order.address.city} /{" "}
            {order.address.state}
            <br />
            CEP {order.address.cep}
          </p>
          <p className="small muted" style={{ marginTop: 12 }}>
            {order.shipping.name} · {order.shipping.days} dias úteis
          </p>
          <h3 className="admin-subheading">PAGAMENTO</h3>
          <p className="small">
            {order.paymentMethod.toUpperCase()} · {order.paymentStatus}
          </p>
          <p className="small muted">
            {order.demo
              ? "Demonstração sem cobrança."
              : `ID do provedor: ${order.paymentId || "Aguardando conciliação"}`}
          </p>
          {!demo && (
            <button
              className="text-link"
              disabled={busy || !order.paymentId}
              onClick={() => void save(true)}
            >
              CONSULTAR MERCADO PAGO
            </button>
          )}
        </section>
        <section>
          <h3 className="admin-subheading">PEÇAS DO PEDIDO</h3>
          {order.items.map((item) => (
            <div key={item.variantId} className="summary-line">
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
            <span>Descontos</span>
            <span>− {money(order.discountCents + order.pixDiscountCents)}</span>
          </div>
          <div className="summary-line">
            <span>Frete</span>
            <span>{money(order.shippingCents)}</span>
          </div>
          <div className="summary-line total">
            <span>Total</span>
            <strong>{money(order.totalCents)}</strong>
          </div>
        </section>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="form-grid" style={{ marginTop: 25 }}>
          <Field label="Status do pedido">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
            >
              {(Object.keys(statusLabels) as OrderStatus[])
                .filter(
                  (s) =>
                    canTransition(order.status, s) &&
                    (demo ||
                      !["paid", "cancelled", "refunded"].includes(s) ||
                      s === order.status),
                )
                .map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Código de rastreio">
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
          </Field>
        </div>
        {!demo && (
          <p className="notice" style={{ marginTop: 20 }}>
            Pagamentos, cancelamentos e reembolsos são confirmados pelo Mercado
            Pago. Faça a operação financeira no provedor e sincronize. Uma
            devolução física exige ajuste de estoque separado.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <button className="button" disabled={busy}>
            {busy ? "SALVANDO…" : "ATUALIZAR PEDIDO"}
          </button>
        </div>
      </form>
      <div className="timeline">
        {order.history.map((e, i) => (
          <div key={i}>
            <strong>{statusLabels[e.status]}</strong>
            <p>{e.message}</p>
            <time>{new Date(e.at).toLocaleString("pt-BR")}</time>
          </div>
        ))}
      </div>
    </Modal>
  );
}
