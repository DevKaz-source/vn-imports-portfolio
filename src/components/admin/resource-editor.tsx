"use client";
import { useState } from "react";
import type { State, ProductImage } from "@/domain/types";
import type { EntityName } from "@/server/repository";
import { slugify } from "@/domain/commerce";
import { Modal, Field } from "@/components/ui";
import { ImageManager } from "./image-manager";
import { api } from "@/lib/utils";
type Data = Record<string, unknown>;
export const resourceLabels: Record<EntityName, string> = {
  categories: "Categorias",
  collections: "Drops",
  looks: "Lookbook",
  social: "Instagram editorial",
  banners: "Banners",
  coupons: "Cupons",
};
export function newResource(resource: EntityName): Data {
  const id = crypto.randomUUID();
  if (resource === "categories")
    return {
      id,
      name: "",
      slug: "",
      image: "",
      description: "",
      active: true,
      parentId: "",
    };
  if (resource === "collections")
    return {
      id,
      name: "",
      slug: "",
      image: "",
      description: "",
      active: true,
      featured: false,
      startsAt: "",
      endsAt: "",
    };
  if (resource === "looks")
    return { id, name: "", image: "", productIds: [], active: true };
  if (resource === "social")
    return {
      id,
      image: "",
      url: "https://www.instagram.com/vn.imp_067/",
      alt: "",
    };
  if (resource === "banners")
    return {
      id,
      title: "",
      subtitle: "",
      eyebrow: "",
      image: "",
      mobileImage: "",
      cta: "EXPLORAR",
      href: "/produtos",
      position: "left",
      overlay: true,
      active: true,
      order: 0,
      startsAt: "",
      endsAt: "",
    };
  return {
    id,
    code: "",
    type: "percent",
    value: 10,
    minimumCents: 0,
    expiresAt: "",
    usageLimit: 0,
    perCustomerLimit: 1,
    productIds: [],
    categoryIds: [],
    active: true,
  };
}
export function ResourceEditor({
  resource,
  data,
  state,
  onClose,
  onSaved,
}: {
  resource: EntityName;
  data: Data;
  state: State;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [d, setD] = useState(data);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function set(key: string, value: unknown) {
    setD((d) => ({ ...d, [key]: value }));
  }
  const field = (key: string, label: string, type = "text") => (
    <Field key={key} label={label}>
      {type === "textarea" ? (
        <textarea
          value={String(d[key] || "")}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={String(d[key] ?? "")}
          onChange={(e) => {
            set(
              key,
              type === "number" ? Number(e.target.value) : e.target.value,
            );
            if (key === "name" && "slug" in d)
              set("slug", slugify(e.target.value));
          }}
        />
      )}
    </Field>
  );
  const checkbox = (key: string, label: string) => (
    <label className="check-row" key={key}>
      <input
        type="checkbox"
        checked={Boolean(d[key])}
        onChange={(e) => set(key, e.target.checked)}
      />
      {label}
    </label>
  );
  const date = (key: string, label: string) => (
    <Field key={key} label={label}>
      <input
        type="datetime-local"
        value={
          d[key] ? new Date(String(d[key])).toISOString().slice(0, 16) : ""
        }
        onChange={(e) =>
          set(key, e.target.value ? new Date(e.target.value).toISOString() : "")
        }
      />
    </Field>
  );
  const photos = (key: string, label: string) => (
    <div className="span-2" key={key}>
      <h3 className="admin-subheading">{label}</h3>
      <ImageManager
        multiple={false}
        images={
          d[key]
            ? [
                {
                  id: key,
                  url: String(d[key]),
                  alt: String(d.name || d.title || d.alt || "Imagem editorial"),
                },
              ]
            : []
        }
        onChange={(images: ProductImage[]) => set(key, images[0]?.url || "")}
      />
    </div>
  );
  async function save(remove = false) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/${resource}`, { data: d, remove });
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
      title={resourceLabels[resource].toUpperCase()}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="form-grid">
          {"name" in d && field("name", "Nome")}
          {"slug" in d && field("slug", "Endereço (slug)")}
          {"description" in d && (
            <div className="span-2">
              {field("description", "Descrição", "textarea")}
            </div>
          )}
          {resource === "categories" && (
            <Field label="Categoria mãe (opcional)">
              <select
                value={String(d.parentId || "")}
                onChange={(e) => set("parentId", e.target.value)}
              >
                <option value="">Categoria principal</option>
                {state.categories
                  .filter((c) => c.id !== d.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          {resource === "banners" && (
            <>
              {field("eyebrow", "Chamada curta / drop")}
              <div className="span-2">
                {field(
                  "title",
                  "Título (quebras de linha permitidas)",
                  "textarea",
                )}
              </div>
              {field("subtitle", "Subtítulo")}
              {field("cta", "Texto do botão")}
              {field("href", "Link interno do botão")}
              {field("order", "Ordem de exibição", "number")}
              <Field label="Posição do texto">
                <select
                  value={String(d.position)}
                  onChange={(e) => set("position", e.target.value)}
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </Field>
              {checkbox("overlay", "Escurecer imagem para destacar o texto")}
            </>
          )}
          {resource === "social" && (
            <>
              {field("url", "Link do post ou perfil do Instagram", "url")}
              {field("alt", "Descrição acessível (ALT)")}
            </>
          )}
          {resource === "coupons" && (
            <>
              {field("code", "Código do cupom")}
              <Field label="Tipo de desconto">
                <select
                  value={String(d.type)}
                  onChange={(e) => set("type", e.target.value)}
                >
                  <option value="percent">Percentual</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </Field>
              <Field
                label={d.type === "percent" ? "Desconto (%)" : "Desconto (R$)"}
              >
                <input
                  type="number"
                  min="0"
                  step={d.type === "percent" ? "1" : "0.01"}
                  value={
                    d.type === "fixed" ? Number(d.value) / 100 : Number(d.value)
                  }
                  onChange={(e) =>
                    set(
                      "value",
                      d.type === "fixed"
                        ? Math.round(Number(e.target.value) * 100)
                        : Number(e.target.value),
                    )
                  }
                />
              </Field>
              <Field label="Compra mínima (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={Number(d.minimumCents) / 100}
                  onChange={(e) =>
                    set(
                      "minimumCents",
                      Math.round(Number(e.target.value) * 100),
                    )
                  }
                />
              </Field>
              {field("usageLimit", "Limite total (0 = sem limite)", "number")}
              {field(
                "perCustomerLimit",
                "Limite por e-mail (0 = sem limite)",
                "number",
              )}
              {date("expiresAt", "Validade")}
            </>
          )}
          {"startsAt" in d && date("startsAt", "Início (opcional)")}
          {"endsAt" in d && date("endsAt", "Fim (opcional)")}
          {"image" in d && photos("image", "IMAGEM PRINCIPAL")}
          {"mobileImage" in d &&
            photos("mobileImage", "IMAGEM MOBILE (OPCIONAL)")}
          {"productIds" in d && (
            <div className="span-2">
              <h3 className="admin-subheading">
                {resource === "coupons"
                  ? "RESTRINGIR A PRODUTOS (VAZIO = TODOS)"
                  : "PEÇAS DO LOOK"}
              </h3>
              <div className="selection-list">
                {state.products.map((p) => (
                  <label className="check-row small" key={p.id}>
                    <input
                      type="checkbox"
                      checked={(d.productIds as string[]).includes(p.id)}
                      onChange={(e) =>
                        set(
                          "productIds",
                          e.target.checked
                            ? [...(d.productIds as string[]), p.id]
                            : (d.productIds as string[]).filter(
                                (id) => id !== p.id,
                              ),
                        )
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {"categoryIds" in d && (
            <div className="span-2">
              <h3 className="admin-subheading">
                RESTRINGIR A CATEGORIAS (VAZIO = TODAS)
              </h3>
              <div className="selection-list">
                {state.categories.map((c) => (
                  <label className="check-row small" key={c.id}>
                    <input
                      type="checkbox"
                      checked={(d.categoryIds as string[]).includes(c.id)}
                      onChange={(e) =>
                        set(
                          "categoryIds",
                          e.target.checked
                            ? [...(d.categoryIds as string[]), c.id]
                            : (d.categoryIds as string[]).filter(
                                (id) => id !== c.id,
                              ),
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {"active" in d && checkbox("active", "Ativo")}
          {"featured" in d && checkbox("featured", "Destaque na loja")}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <button
            type="button"
            className="button button-outline"
            onClick={onClose}
          >
            CANCELAR
          </button>
          <button className="button" disabled={busy}>
            {busy ? "SALVANDO…" : "SALVAR"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
