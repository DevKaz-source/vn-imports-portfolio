"use client";
import Image from "next/image";
import type { State, Order } from "@/domain/types";
import { money, statusLabels } from "@/domain/commerce";
import { Empty } from "@/components/ui";
export function AdminDashboard({
  state,
  onOpenOrder,
  onNavigate,
}: {
  state: State & { demo: boolean };
  onOpenOrder: (order: Order) => void;
  onNavigate: (tab: "orders" | "inventory" | "settings") => void;
}) {
  const paid = state.orders.filter((o) =>
    ["paid", "processing", "shipped", "delivered"].includes(o.status),
  );
  const revenue = paid.reduce((s, o) => s + o.totalCents, 0);
  const variants = state.products.flatMap((p) =>
    p.variants.map((v) => ({ ...v, product: p })),
  );
  const low = variants.filter(
    (v) =>
      v.active && v.product.status === "active" && v.stock <= v.minimumStock,
  );
  return (
    <>
      <div className="metric-grid">
        <div>
          <span>FATURAMENTO CONFIRMADO</span>
          <strong>{money(revenue)}</strong>
          <small>
            {state.demo
              ? "Pedidos de teste"
              : "Pagos, em separação, enviados e entregues"}
          </small>
        </div>
        <div>
          <span>PEDIDOS</span>
          <strong>{state.orders.length.toString().padStart(2, "0")}</strong>
          <small>
            {state.orders.filter((o) => o.status === "pending_payment").length}{" "}
            aguardando pagamento
          </small>
        </div>
        <div>
          <span>PEÇAS PUBLICADAS</span>
          <strong>
            {state.products
              .filter((p) => p.status === "active")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <small>
            {variants.reduce((s, v) => s + v.stock, 0)} unidades disponíveis
          </small>
        </div>
        <div>
          <span>AGUARDANDO ENVIO</span>
          <strong>
            {state.orders
              .filter((o) => ["paid", "processing"].includes(o.status))
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <small>{low.length} variações com estoque baixo</small>
        </div>
      </div>
      <div className="admin-two-columns">
        <section className="admin-panel">
          <div className="admin-section-heading">
            <h2>PEDIDOS RECENTES</h2>
            <button className="text-link" onClick={() => onNavigate("orders")}>
              VER TODOS
            </button>
          </div>
          {state.orders.length ? (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {state.orders.slice(0, 6).map((o) => (
                    <tr key={o.id} onClick={() => onOpenOrder(o)}>
                      <td>
                        <button
                          className="row-link"
                          onClick={() => onOpenOrder(o)}
                        >
                          {o.number}
                        </button>
                        <small>{o.customer.name}</small>
                      </td>
                      <td>
                        <span className={`status-pill status-${o.status}`}>
                          {statusLabels[o.status]}
                        </span>
                      </td>
                      <td>{money(o.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="O próximo pedido começa aqui."
              description="As vendas confirmadas aparecem neste painel. Você pode testar o fluxo de compra na loja."
            />
          )}
        </section>
        <section className="admin-panel">
          <div className="admin-section-heading">
            <h2>ATENÇÃO AO ESTOQUE</h2>
            <button
              className="text-link"
              onClick={() => onNavigate("inventory")}
            >
              GERENCIAR
            </button>
          </div>
          {low.length ? (
            low.slice(0, 6).map((v) => (
              <div className="stock-alert" key={v.id}>
                <Image
                  src={v.product.images[0]?.url || "/images/vn-logo.webp"}
                  alt={v.product.name}
                  width={46}
                  height={52}
                />
                <div>
                  <strong>{v.product.name}</strong>
                  <small>
                    {v.color} / {v.size}
                  </small>
                </div>
                <span className={v.stock === 0 ? "out" : "low"}>
                  {v.stock === 0 ? "Esgotado" : `${v.stock} un.`}
                </span>
              </div>
            ))
          ) : (
            <p className="muted">Nenhuma variação abaixo do estoque mínimo.</p>
          )}
        </section>
      </div>
      <section className="admin-panel" style={{ marginTop: 24 }}>
        <div className="admin-section-heading">
          <h2>MAIS VENDIDOS</h2>
          <span className="small muted">
            Baseado apenas em pagamentos confirmados
          </span>
        </div>
        {paid.length ? (
          <div className="bestseller-list">
            {state.products
              .map((p) => ({
                ...p,
                sold: paid
                  .flatMap((o) => o.items)
                  .filter((i) => i.productId === p.id)
                  .reduce((s, i) => s + i.quantity, 0),
              }))
              .filter((p) => p.sold > 0)
              .sort((a, b) => b.sold - a.sold)
              .slice(0, 5)
              .map((p, i) => (
                <div key={p.id}>
                  <span>0{i + 1}</span>
                  <strong>{p.name}</strong>
                  <span>{p.sold} unidades</span>
                </div>
              ))}
          </div>
        ) : (
          <p className="muted small">
            O ranking será formado quando os primeiros pagamentos forem
            aprovados.
          </p>
        )}
      </section>
      <section className="admin-panel setup-panel" style={{ marginTop: 24 }}>
        <h2>PREPARE A ABERTURA</h2>
        <div>
          {[
            [state.settings.whatsapp, "Número do WhatsApp"],
            [state.settings.originCep, "CEP de origem"],
            [
              state.settings.businessName &&
                state.settings.businessDocument &&
                state.settings.businessAddress,
              "Dados comerciais",
            ],
            [state.settings.policiesReviewed, "Políticas revisadas"],
            [
              state.products.some((p) => !p.demo && p.status === "active"),
              "Primeira peça real publicada",
            ],
          ].map(([done, label], i) => (
            <p key={i}>
              <span className={done ? "done" : ""}>{done ? "✓" : "—"}</span>
              {label}
            </p>
          ))}
        </div>
        <button className="text-link" onClick={() => onNavigate("settings")}>
          ABRIR CONFIGURAÇÕES
        </button>
      </section>
    </>
  );
}
