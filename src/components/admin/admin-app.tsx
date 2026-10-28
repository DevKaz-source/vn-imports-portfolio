"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Shirt,
  Package,
  ShoppingBag,
  Tags,
  Layers,
  Image as ImageIcon,
  Ticket,
  Settings,
  LogOut,
  Plus,
  Copy,
  Archive,
  Mail,
  Eye,
  Search,
  RefreshCw,
  Menu,
  Camera,
  BookOpen,
  Trash2,
} from "lucide-react";
import type { Product, State, Order } from "@/domain/types";
import type { EntityName } from "@/server/repository";
import { availableStock, money, statusLabels } from "@/domain/commerce";
import { api } from "@/lib/utils";
import { Field, Modal, Empty } from "@/components/ui";
import { ProductEditor, newProduct } from "./product-editor";
import { ResourceEditor, newResource, resourceLabels } from "./resource-editor";
import { SettingsEditor } from "./settings-editor";
import { AdminDashboard } from "./admin-dashboard";
import { OrderEditor } from "./order-editor";
type Tab =
  | "dashboard"
  | "products"
  | "inventory"
  | "orders"
  | "settings"
  | "newsletter"
  | EntityName;
const navigation: [Tab, string, typeof LayoutDashboard][] = [
  ["dashboard", "Visão geral", LayoutDashboard],
  ["products", "Produtos", Shirt],
  ["orders", "Pedidos", ShoppingBag],
  ["inventory", "Estoque", Package],
  ["categories", "Categorias", Tags],
  ["collections", "Drops", Layers],
  ["looks", "Lookbook", BookOpen],
  ["banners", "Banners", ImageIcon],
  ["social", "Instagram", Camera],
  ["coupons", "Cupons", Ticket],
  ["newsletter", "VN List", Mail],
  ["settings", "Configurações", Settings],
];
type AdminState = State & { demo: boolean };
export function AdminApp({
  initial,
  admin,
}: {
  initial: AdminState;
  admin: string;
}) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [product, setProduct] = useState<{
    p: Product;
    existing: boolean;
  } | null>(null);
  const [resource, setResource] = useState<{
    name: EntityName;
    data: Record<string, unknown>;
  } | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [adjust, setAdjust] = useState<{
    id: string;
    name: string;
    stock: number;
  } | null>(null);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    action: () => Promise<void>;
  } | null>(null);
  const [subscribers, setSubscribers] = useState<
    { email: string; consentAt?: string; consent_at?: string }[]
  >([]);
  const router = useRouter();
  async function refresh() {
    setState(await api<AdminState>("/api/admin/state"));
  }
  async function act(fn: () => Promise<unknown>, success = "Alteração salva.") {
    setMessage("");
    try {
      await fn();
      await refresh();
      setMessage(success);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function change(next: Tab) {
    setTab(next);
    setQuery("");
    setMenu(false);
    setMessage("");
    if (next === "newsletter")
      void api<typeof subscribers>("/api/admin/newsletter")
        .then(setSubscribers)
        .catch((e) => setMessage(e.message));
  }
  function duplicate(p: Product) {
    const suffix = crypto.randomUUID().slice(0, 8);
    const next = {
      ...structuredClone(p),
      id: crypto.randomUUID(),
      name: `${p.name} (cópia)`,
      slug: `${p.slug}-copia-${suffix}`,
      sku: `${p.sku}-COPIA`,
      status: "draft" as const,
      variants: p.variants.map((v) => ({
        ...v,
        id: crypto.randomUUID(),
        sku: `${v.sku}-C${suffix}`,
        stock: 0,
      })),
    };
    delete next.soldCount;
    setProduct({ p: next, existing: false });
  }
  const variants = state.products.flatMap((p) =>
    p.variants.map((v) => ({ ...v, product: p })),
  );
  const products = state.products.filter((p) =>
    `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()),
  );
  const orders = state.orders.filter((o) =>
    `${o.number} ${o.customer.name} ${o.customer.email}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const currentLabel = navigation.find((n) => n[0] === tab)?.[1];
  const entity = [
    "categories",
    "collections",
    "looks",
    "banners",
    "social",
    "coupons",
  ].includes(tab)
    ? (tab as EntityName)
    : null;
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menu ? "open" : ""}`}>
        <Link href="/" className="admin-brand">
          <Image
            src={state.settings.logo || "/images/vn-logo.webp"}
            alt="VN Imports"
            width={46}
            height={46}
          />
          <span>
            VN IMPORTS<small>PAINEL DA LOJA</small>
          </span>
        </Link>
        <nav aria-label="Administração">
          {navigation.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => change(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" target="_blank">
            <Eye size={17} />
            Abrir loja
          </Link>
          <button
            onClick={async () => {
              await api("/api/auth/logout", {});
              router.push("/admin/login");
              router.refresh();
            }}
          >
            <LogOut size={17} />
            Sair
          </button>
          <span>{admin}</span>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <button
            className="icon-button mobile-only"
            aria-label="Menu administrativo"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span>PAINEL / {currentLabel?.toUpperCase()}</span>
          <div>
            {state.demo && <span className="status-pill">DEMONSTRAÇÃO</span>}
            <button
              className="icon-button"
              aria-label="Atualizar painel"
              onClick={() => void act(refresh, "Painel atualizado.")}
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>
        <div className="admin-content">
          <div className="admin-title-row">
            <div>
              <p className="eyebrow">VN IMPORTS / CONTROLE DA LOJA</p>
              <h1>
                {tab === "dashboard"
                  ? "TUDO SOB CONTROLE."
                  : currentLabel?.toUpperCase()}
              </h1>
            </div>
            {tab === "products" && (
              <button
                className="button"
                onClick={() => setProduct({ p: newProduct(), existing: false })}
              >
                <Plus size={17} />
                NOVA PEÇA
              </button>
            )}
            {entity && (
              <button
                className="button"
                onClick={() =>
                  setResource({ name: entity, data: newResource(entity) })
                }
              >
                <Plus size={17} />
                ADICIONAR
              </button>
            )}
          </div>
          {message && (
            <p className="notice" role="status" style={{ marginBottom: 20 }}>
              {message}
            </p>
          )}
          {tab === "dashboard" && (
            <AdminDashboard
              state={state}
              onOpenOrder={setOrder}
              onNavigate={change}
            />
          )}
          {(tab === "products" || tab === "orders" || tab === "inventory") && (
            <div className="admin-search">
              <Search size={18} />
              <input
                aria-label="Buscar no painel"
                placeholder={
                  tab === "orders"
                    ? "Buscar pedido ou cliente…"
                    : "Buscar nome ou SKU…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          {tab === "products" && (
            <div className="admin-panel table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="table-product">
                          <Image
                            src={p.images[0]?.url || "/images/vn-logo.webp"}
                            alt={p.name}
                            width={54}
                            height={64}
                          />
                          <button
                            className="row-link"
                            onClick={() => setProduct({ p, existing: true })}
                          >
                            {p.name}
                            <small>
                              {p.sku}
                              {p.demo ? " · DEMO" : ""}
                            </small>
                          </button>
                        </div>
                      </td>
                      <td>{money(p.priceCents)}</td>
                      <td>
                        {availableStock(p)} un.
                        <small>{p.variants.length} variações</small>
                      </td>
                      <td>
                        <span className="status-pill">
                          {
                            {
                              active: "Publicado",
                              draft: "Rascunho",
                              archived: "Arquivado",
                            }[p.status]
                          }
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="text-link"
                            onClick={() => setProduct({ p, existing: true })}
                          >
                            EDITAR
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Duplicar ${p.name}`}
                            onClick={() => duplicate(p)}
                          >
                            <Copy size={17} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Arquivar ${p.name}`}
                            onClick={() =>
                              setConfirmation({
                                title: `Arquivar ${p.name}? A peça sairá da vitrine e seu histórico será preservado.`,
                                action: async () => {
                                  const clean = { ...p, status: "archived" };
                                  delete clean.soldCount;
                                  await act(() =>
                                    api("/api/admin/products", {
                                      product: clean,
                                      expectedUpdatedAt: p.updatedAt,
                                    }),
                                  );
                                },
                              })
                            }
                          >
                            <Archive size={17} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Excluir ${p.name}`}
                            onClick={() =>
                              setConfirmation({
                                title: `Excluir ${p.name}? Só será permitido se não houver vínculos que precisem ser preservados.`,
                                action: async () => {
                                  await act(() =>
                                    api("/api/admin/delete-product", {
                                      id: p.id,
                                    }),
                                  );
                                },
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!products.length && (
                <Empty
                  title="Nenhuma peça encontrada."
                  description="Adicione sua primeira peça ou altere a busca."
                />
              )}
            </div>
          )}
          {tab === "inventory" && (
            <>
              <div className="admin-panel table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Peça / SKU</th>
                      <th>Variação</th>
                      <th>Disponível</th>
                      <th>Mínimo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants
                      .filter((v) =>
                        `${v.product.name} ${v.sku}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((v) => (
                        <tr key={v.id}>
                          <td>
                            {v.product.name}
                            <small>{v.sku}</small>
                          </td>
                          <td>
                            {v.color} / {v.size}
                          </td>
                          <td>
                            <span
                              className={`status-pill ${v.stock <= v.minimumStock ? "status-cancelled" : ""}`}
                            >
                              {v.stock}
                            </span>
                          </td>
                          <td>{v.minimumStock}</td>
                          <td>
                            <button
                              className="text-link"
                              onClick={() => {
                                setAdjust({
                                  id: v.id,
                                  name: `${v.product.name} / ${v.color} / ${v.size}`,
                                  stock: v.stock,
                                });
                                setDelta(0);
                                setReason("");
                              }}
                            >
                              AJUSTAR
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <section className="admin-panel" style={{ marginTop: 24 }}>
                <h2>HISTÓRICO DE MOVIMENTAÇÕES</h2>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Peça / variação</th>
                        <th>Quantidade</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.movements.slice(0, 100).map((m) => {
                        const v = variants.find((v) => v.id === m.variantId);
                        return (
                          <tr key={m.id}>
                            <td>
                              {new Date(m.createdAt).toLocaleString("pt-BR")}
                            </td>
                            <td>
                              {v?.product.name}
                              <small>
                                {v?.size} / {v?.color}
                              </small>
                            </td>
                            <td>
                              {m.delta > 0 ? "+" : ""}
                              {m.delta}
                            </td>
                            <td>
                              {m.reason}
                              <small>{m.actor}</small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!state.movements.length && (
                    <p className="muted small">
                      Nenhuma movimentação registrada ainda.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
          {tab === "orders" && (
            <div className="admin-panel table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <button
                          className="row-link"
                          onClick={() => setOrder(o)}
                        >
                          {o.number}
                        </button>
                      </td>
                      <td>
                        {o.customer.name}
                        <small>{o.customer.email}</small>
                      </td>
                      <td>
                        {new Date(o.createdAt).toLocaleDateString("pt-BR")}
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
              {!orders.length && (
                <Empty
                  title="Nenhum pedido por aqui."
                  description="Pedidos da loja aparecerão automaticamente nesta lista."
                />
              )}
            </div>
          )}
          {entity && (
            <div className="admin-panel table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{resourceLabels[entity]}</th>
                    <th>Detalhes</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {state[entity].map((record) => {
                    const d = record as unknown as Record<string, unknown>;
                    return (
                      <tr key={String(d.id)}>
                        <td>
                          <div className="table-product">
                            {Boolean(d.image) && (
                              <Image
                                src={String(d.image)}
                                alt={String(
                                  d.name || d.title || d.alt || "Imagem",
                                )}
                                width={55}
                                height={55}
                              />
                            )}
                            <strong>
                              {String(
                                d.name ||
                                  d.title ||
                                  d.code ||
                                  d.alt ||
                                  "Imagem editorial",
                              )}
                            </strong>
                          </div>
                        </td>
                        <td>
                          {String(
                            d.slug ||
                              d.href ||
                              d.url ||
                              (d.type === "percent"
                                ? `${d.value}%`
                                : d.type === "fixed"
                                  ? money(Number(d.value))
                                  : "Seleção editorial"),
                          )}
                        </td>
                        <td>
                          <span className="status-pill">
                            {d.active === false ? "Inativo" : "Ativo"}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="text-link"
                              onClick={() =>
                                setResource({ name: entity, data: d })
                              }
                            >
                              EDITAR
                            </button>
                            <button
                              className="icon-button"
                              aria-label="Excluir item"
                              onClick={() =>
                                setConfirmation({
                                  title:
                                    "Excluir este item? Esta ação remove o conteúdo selecionado.",
                                  action: async () => {
                                    await act(() =>
                                      api(`/api/admin/${entity}`, {
                                        data: d,
                                        remove: true,
                                      }),
                                    );
                                  },
                                })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!state[entity].length && (
                <Empty
                  title="Dê seu toque à loja."
                  description="Adicione o primeiro item usando o botão acima."
                />
              )}
            </div>
          )}
          {tab === "settings" && (
            <SettingsEditor
              key={JSON.stringify(state.settings)}
              settings={state.settings}
              onSaved={refresh}
            />
          )}
          {tab === "newsletter" && (
            <section className="admin-panel">
              <h2>VN LIST · {subscribers.length} CONTATOS</h2>
              <p className="muted small" style={{ margin: "15px 0" }}>
                Contatos cadastrados com consentimento na loja.
              </p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Consentimento</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.email}>
                      <td>{s.email}</td>
                      <td>
                        {new Date(
                          s.consentAt || s.consent_at || "",
                        ).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
      {product && (
        <ProductEditor
          product={product.p}
          existing={product.existing}
          state={state}
          onClose={() => setProduct(null)}
          onSaved={refresh}
        />
      )}{" "}
      {resource && (
        <ResourceEditor
          resource={resource.name}
          data={resource.data}
          state={state}
          onClose={() => setResource(null)}
          onSaved={refresh}
        />
      )}{" "}
      {order && (
        <OrderEditor
          order={order}
          demo={state.demo}
          onClose={() => setOrder(null)}
          onSaved={refresh}
        />
      )}
      <Modal
        open={Boolean(adjust)}
        onOpenChange={(v) => {
          if (!v) setAdjust(null);
        }}
        title="AJUSTAR ESTOQUE"
      >
        {adjust && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/api/admin/inventory", {
                  variantId: adjust.id,
                  delta,
                  reason,
                });
                await refresh();
                setAdjust(null);
                setMessage("Estoque ajustado com histórico.");
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <p>{adjust.name}</p>
            <p className="muted small" style={{ marginBottom: 20 }}>
              Disponível agora: {adjust.stock} unidades
            </p>
            <Field
              label="Quantidade do ajuste"
              hint="Use +10 para repor, -2 para retirar."
            >
              <input
                type="number"
                required
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
              />
            </Field>
            <Field label="Motivo do ajuste">
              <textarea
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            {message && (
              <p className="notice" role="status">
                {message}
              </p>
            )}
            <div className="editor-footer">
              <button
                className="button"
                disabled={!delta || reason.trim().length < 3}
              >
                CONFIRMAR AJUSTE
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={Boolean(confirmation)}
        onOpenChange={(v) => {
          if (!v) setConfirmation(null);
        }}
        title="CONFIRMAR ALTERAÇÃO"
      >
        <p>{confirmation?.title}</p>
        <div className="editor-footer">
          <button
            className="button button-outline"
            onClick={() => setConfirmation(null)}
          >
            VOLTAR
          </button>
          <button
            className="button"
            onClick={async () => {
              await confirmation?.action();
              setConfirmation(null);
            }}
          >
            CONFIRMAR
          </button>
        </div>
      </Modal>
    </div>
  );
}
