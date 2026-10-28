"use client";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import type { Product, State, Variant } from "@/domain/types";
import { slugify } from "@/domain/commerce";
import { api } from "@/lib/utils";
import { Field, Modal } from "@/components/ui";
import { ImageManager } from "./image-manager";
export function newProduct(): Product {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "",
    slug: "",
    categoryId: "",
    subcategory: "",
    collectionIds: [],
    tags: [],
    brand: "",
    sku: "",
    description: "",
    material: "",
    details: "",
    priceCents: 0,
    status: "draft",
    featured: false,
    isNew: false,
    demo: false,
    images: [],
    variants: [
      {
        id: crypto.randomUUID(),
        sku: "",
        size: "P",
        color: "Preto",
        colorHex: "#111111",
        stock: 0,
        minimumStock: 2,
        active: true,
      },
    ],
    sizeGuide: [],
    weightKg: 0,
    widthCm: 0,
    heightCm: 0,
    lengthCm: 0,
    seoTitle: "",
    seoDescription: "",
    createdAt: now,
    updatedAt: now,
  };
}
export function ProductEditor({
  product,
  existing,
  state,
  onClose,
  onSaved,
}: {
  product: Product;
  existing: boolean;
  state: State;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [p, setP] = useState<Product>(structuredClone(product));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sizes, setSizes] = useState("P, M, G, GG");
  const [colors, setColors] = useState("Preto");
  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setP((p) => ({ ...p, [key]: value }));
  }
  function variant(
    id: string,
    key: keyof Variant,
    value: Variant[keyof Variant],
  ) {
    setP((p) => ({
      ...p,
      variants: p.variants.map((v) =>
        v.id === id ? { ...v, [key]: value } : v,
      ),
    }));
  }
  function combinations() {
    const newVariants = [...p.variants.filter((v) => v.sku || existing)];
    for (const color of colors
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean))
      for (const size of sizes
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)) {
        if (!newVariants.some((v) => v.color === color && v.size === size))
          newVariants.push({
            id: crypto.randomUUID(),
            sku: `${p.sku || "VN"}-${slugify(color)}-${size}`,
            size,
            color,
            colorHex:
              color.toLowerCase() === "branco"
                ? "#eeeeee"
                : color.toLowerCase() === "cinza"
                  ? "#777777"
                  : "#111111",
            stock: 0,
            minimumStock: 2,
            active: true,
          });
      }
    set("variants", newVariants);
  }
  async function save() {
    setError("");
    if (p.status === "active" && !p.images.length) {
      setError("Adicione ao menos uma foto para publicar a peça.");
      return;
    }
    setBusy(true);
    try {
      const clean = { ...p };
      delete clean.soldCount;
      await api("/api/admin/products", {
        product: clean,
        ...(existing ? { expectedUpdatedAt: product.updatedAt } : {}),
      });
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
      title={existing ? "EDITAR PEÇA" : "NOVA PEÇA"}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Tabs.Root defaultValue="basic">
          <Tabs.List className="admin-tabs" aria-label="Campos do produto">
            <Tabs.Trigger value="basic">Informações</Tabs.Trigger>
            <Tabs.Trigger value="images">Fotos</Tabs.Trigger>
            <Tabs.Trigger value="variants">Variações</Tabs.Trigger>
            <Tabs.Trigger value="shipping">Frete e medidas</Tabs.Trigger>
            <Tabs.Trigger value="seo">SEO</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="basic" className="tab-content">
            <div className="form-grid">
              <div className="span-2">
                <Field label="Nome da peça">
                  <input
                    required
                    value={p.name}
                    onChange={(e) => {
                      set("name", e.target.value);
                      if (!existing) set("slug", slugify(e.target.value));
                    }}
                  />
                </Field>
              </div>
              <Field label="Categoria">
                <select
                  required
                  value={p.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subcategoria">
                <input
                  value={p.subcategory}
                  onChange={(e) => set("subcategory", e.target.value)}
                />
              </Field>
              <Field label="SKU principal">
                <input
                  required
                  value={p.sku}
                  onChange={(e) => {
                    set("sku", e.target.value);
                    if (p.variants.length === 1 && !existing)
                      set("variants", [
                        { ...p.variants[0], sku: `${e.target.value}-P-PRETO` },
                      ]);
                  }}
                />
              </Field>
              <Field label="Marca">
                <input
                  value={p.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
              </Field>
              <Field label="Preço de venda (R$)">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={p.priceCents / 100 || ""}
                  onChange={(e) =>
                    set("priceCents", Math.round(Number(e.target.value) * 100))
                  }
                />
              </Field>
              <Field
                label="Preço anterior / de (R$)"
                hint="Preencha apenas se houver desconto real."
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={p.compareAtCents ? p.compareAtCents / 100 : ""}
                  onChange={(e) =>
                    set(
                      "compareAtCents",
                      e.target.value
                        ? Math.round(Number(e.target.value) * 100)
                        : undefined,
                    )
                  }
                />
              </Field>
              <Field label="Custo interno (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.costCents ? p.costCents / 100 : ""}
                  onChange={(e) =>
                    set(
                      "costCents",
                      e.target.value
                        ? Math.round(Number(e.target.value) * 100)
                        : undefined,
                    )
                  }
                />
              </Field>
              <Field
                label="Desconto Pix (%)"
                hint="Vazio usa o desconto geral da loja."
              >
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={p.pixPercent ?? ""}
                  onChange={(e) =>
                    set(
                      "pixPercent",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />
              </Field>
              <div className="span-2">
                <Field label="Descrição">
                  <textarea
                    value={p.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
              </div>
              <div className="span-2">
                <Field label="Composição e cuidados">
                  <textarea
                    value={p.material}
                    onChange={(e) => set("material", e.target.value)}
                  />
                </Field>
              </div>
              <div className="span-2">
                <Field label="Informações adicionais">
                  <textarea
                    value={p.details}
                    onChange={(e) => set("details", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Status">
                <select
                  value={p.status}
                  onChange={(e) =>
                    set("status", e.target.value as Product["status"])
                  }
                >
                  <option value="draft">Rascunho</option>
                  <option value="active">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </Field>
              <Field label="Tags separadas por vírgula">
                <input
                  value={p.tags.join(", ")}
                  onChange={(e) =>
                    set(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
              <div className="span-2">
                <p className="small">Drops associados</p>
                <div className="chips">
                  {state.collections.map((c) => (
                    <label className="check-row small" key={c.id}>
                      <input
                        type="checkbox"
                        checked={p.collectionIds.includes(c.id)}
                        onChange={(e) =>
                          set(
                            "collectionIds",
                            e.target.checked
                              ? [...p.collectionIds, c.id]
                              : p.collectionIds.filter((id) => id !== c.id),
                          )
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={p.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                />
                VN Selects / destaque
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={p.isNew}
                  onChange={(e) => set("isNew", e.target.checked)}
                />
                Novidade
              </label>
              <label className="check-row span-2">
                <input
                  type="checkbox"
                  checked={p.demo}
                  onChange={(e) => set("demo", e.target.checked)}
                />
                Produto demonstrativo (bloqueia cobrança real)
              </label>
            </div>
          </Tabs.Content>
          <Tabs.Content value="images" className="tab-content">
            <p className="muted small" style={{ marginBottom: 20 }}>
              A primeira foto é a capa. Reordene arrastando ou usando os
              controles. A segunda aparece no hover.
            </p>
            <ImageManager
              images={p.images}
              onChange={(v) => set("images", v)}
            />
          </Tabs.Content>
          <Tabs.Content value="variants" className="tab-content">
            <p className="notice">
              Cada tamanho/cor tem estoque próprio. O estoque das variações
              existentes só pode ser alterado na seção Estoque, com motivo e
              histórico.
            </p>
            <div className="form-grid" style={{ marginTop: 20 }}>
              <Field label="Tamanhos separados por vírgula">
                <input
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                />
              </Field>
              <Field label="Cores separadas por vírgula">
                <input
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                />
              </Field>
            </div>
            <button
              className="button button-outline"
              type="button"
              onClick={combinations}
              style={{ margin: "16px 0" }}
            >
              GERAR COMBINAÇÕES
            </button>
            <div className="variant-editor-list">
              {p.variants.map((v) => (
                <div className="variant-editor" key={v.id}>
                  <Field label="Tamanho">
                    <input
                      value={v.size}
                      onChange={(e) => variant(v.id, "size", e.target.value)}
                    />
                  </Field>
                  <Field label="Cor">
                    <input
                      value={v.color}
                      onChange={(e) => variant(v.id, "color", e.target.value)}
                    />
                  </Field>
                  <Field label="Tom">
                    <input
                      type="color"
                      value={v.colorHex}
                      onChange={(e) =>
                        variant(v.id, "colorHex", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="SKU">
                    <input
                      value={v.sku}
                      onChange={(e) => variant(v.id, "sku", e.target.value)}
                    />
                  </Field>
                  <Field label="Estoque">
                    <input
                      type="number"
                      min="0"
                      disabled={
                        existing && product.variants.some((x) => x.id === v.id)
                      }
                      value={v.stock}
                      onChange={(e) =>
                        variant(v.id, "stock", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Mínimo">
                    <input
                      type="number"
                      min="0"
                      value={v.minimumStock}
                      onChange={(e) =>
                        variant(v.id, "minimumStock", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Preço R$ (opcional)">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={v.priceCents ? v.priceCents / 100 : ""}
                      onChange={(e) =>
                        variant(
                          v.id,
                          "priceCents",
                          e.target.value
                            ? Math.round(Number(e.target.value) * 100)
                            : undefined,
                        )
                      }
                    />
                  </Field>
                  <Field label="Foto da variação">
                    <select
                      value={v.image || ""}
                      onChange={(e) =>
                        variant(v.id, "image", e.target.value || undefined)
                      }
                    >
                      <option value="">Foto principal</option>
                      {p.images.map((im, i) => (
                        <option key={im.id} value={im.url}>
                          Foto {i + 1}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <label className="check-row small">
                    <input
                      type="checkbox"
                      checked={v.active}
                      onChange={(e) =>
                        variant(v.id, "active", e.target.checked)
                      }
                    />
                    Ativa
                  </label>
                </div>
              ))}
            </div>
          </Tabs.Content>
          <Tabs.Content value="shipping" className="tab-content">
            <div className="form-grid">
              {(
                [
                  ["weightKg", "Peso embalado (kg)"],
                  ["widthCm", "Largura (cm)"],
                  ["heightCm", "Altura (cm)"],
                  ["lengthCm", "Comprimento (cm)"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={p[key]}
                    onChange={(e) => set(key, Number(e.target.value))}
                  />
                </Field>
              ))}
            </div>
            <h3 className="admin-subheading">GUIA DE TAMANHOS</h3>
            <p className="muted small">
              Medidas específicas desta peça. Use largura, comprimento e cintura
              conforme a categoria.
            </p>
            {p.sizeGuide.map((row, i) => (
              <div className="size-edit-row" key={i}>
                {(["size", "chest", "length", "waist"] as const).map(
                  (key, j) => (
                    <input
                      key={key}
                      aria-label={
                        ["Tamanho", "Largura", "Comprimento", "Cintura"][j]
                      }
                      placeholder={
                        ["Tamanho", "Largura", "Comprimento", "Cintura"][j]
                      }
                      value={row[key] || ""}
                      onChange={(e) =>
                        set(
                          "sizeGuide",
                          p.sizeGuide.map((r, k) =>
                            k === i ? { ...r, [key]: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  ),
                )}
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    set(
                      "sizeGuide",
                      p.sizeGuide.filter((_, k) => k !== i),
                    )
                  }
                >
                  Excluir
                </button>
              </div>
            ))}
            <button
              className="button button-outline"
              type="button"
              style={{ marginTop: 20 }}
              onClick={() =>
                set("sizeGuide", [
                  ...p.sizeGuide,
                  { size: "", chest: "", length: "", waist: "" },
                ])
              }
            >
              ADICIONAR MEDIDA
            </button>
          </Tabs.Content>
          <Tabs.Content value="seo" className="tab-content">
            <div className="form-grid">
              <div className="span-2">
                <Field label="Endereço (slug)">
                  <input
                    required
                    value={p.slug}
                    onChange={(e) => set("slug", slugify(e.target.value))}
                  />
                </Field>
              </div>
              <div className="span-2">
                <Field label="Título para buscadores">
                  <input
                    maxLength={80}
                    value={p.seoTitle}
                    onChange={(e) => set("seoTitle", e.target.value)}
                  />
                </Field>
              </div>
              <div className="span-2">
                <Field label="Descrição para buscadores">
                  <textarea
                    maxLength={180}
                    value={p.seoDescription}
                    onChange={(e) => set("seoDescription", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
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
          <button type="submit" className="button" disabled={busy}>
            {busy ? "SALVANDO…" : "SALVAR PEÇA"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
