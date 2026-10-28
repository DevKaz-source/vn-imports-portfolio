"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { useStore } from "./store-provider";
import { ProductCard } from "./product-card";
import { Empty, Modal } from "./ui";
import { availableStock } from "@/domain/commerce";
import { track } from "./tracking";
export function CatalogView({
  category,
  collection,
  wishlist = false,
}: {
  category?: string;
  collection?: string;
  wishlist?: boolean;
}) {
  const { catalog, favorites } = useStore();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState(search.get("q") || "");
  const get = (key: string) => search.get(key) || "";
  function set(key: string, value: string) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "pagina") next.delete("pagina");
    router.replace(`${pathname}${next.size ? "?" + next : ""}`, {
      scroll: false,
    });
  }
  const activeCategory = category || get("categoria");
  const activeCollection = collection || get("colecao");
  const categoryData = catalog.categories.find(
    (c) => c.slug === activeCategory || c.id === activeCategory,
  );
  const collectionData = catalog.collections.find(
    (c) => c.slug === activeCollection || c.id === activeCollection,
  );
  const filtered = (() => {
    let list = catalog.products.filter(
      (p) =>
        (!wishlist || favorites.includes(p.id)) &&
        (!activeCategory || p.categoryId === categoryData?.id) &&
        (!activeCollection ||
          p.collectionIds.includes(collectionData?.id || "")) &&
        (!get("q") ||
          `${p.name} ${p.tags.join(" ")} ${p.description}`
            .toLocaleLowerCase("pt-BR")
            .includes(get("q").toLocaleLowerCase("pt-BR"))) &&
        (!get("subcategoria") || p.subcategory === get("subcategoria")) &&
        (!get("tamanho") ||
          p.variants.some((v) => v.size === get("tamanho"))) &&
        (!get("cor") || p.variants.some((v) => v.color === get("cor"))) &&
        (!get("min") || p.priceCents >= Number(get("min")) * 100) &&
        (!get("max") || p.priceCents <= Number(get("max")) * 100) &&
        (!get("estoque") || availableStock(p) > 0) &&
        (!get("sale") || (p.compareAtCents || 0) > p.priceCents) &&
        (!get("novidades") || p.isNew) &&
        (!get("destaques") || p.featured),
    );
    const sort = get("ordem");
    list = [...list].sort((a, b) =>
      sort === "menor"
        ? a.priceCents - b.priceCents
        : sort === "maior"
          ? b.priceCents - a.priceCents
          : sort === "novidades"
            ? Date.parse(b.createdAt) - Date.parse(a.createdAt)
            : sort === "vendidos"
              ? (b.soldCount || 0) - (a.soldCount || 0)
              : Number(b.featured) - Number(a.featured),
    );
    return list;
  })();
  const page = Math.max(
    1,
    Math.min(
      Number(get("pagina")) || 1,
      Math.max(1, Math.ceil(filtered.length / 12)),
    ),
  );
  const pages = Math.ceil(filtered.length / 12);
  const visibleItems = JSON.stringify(
    filtered
      .slice((page - 1) * 12, page * 12)
      .map((p) => ({
        item_id: p.id,
        item_name: p.name,
        price: p.priceCents / 100,
      })),
  );
  useEffect(() => {
    track("view_item_list", {
      item_list_id: pathname,
      items: JSON.parse(visibleItems),
    });
  }, [visibleItems, pathname]);
  const sizes = [
    ...new Set(catalog.products.flatMap((p) => p.variants.map((v) => v.size))),
  ];
  const colors = [
    ...new Set(catalog.products.flatMap((p) => p.variants.map((v) => v.color))),
  ];
  const subs = [
    ...new Set(catalog.products.map((p) => p.subcategory).filter(Boolean)),
  ];
  const filterControls = (
    <div className="filters">
      {!category && (
        <div className="filter-group">
          <h3>CATEGORIAS</h3>
          <label>
            <input
              type="radio"
              name="category-filter"
              checked={!activeCategory}
              onChange={() => set("categoria", "")}
            />
            Todas as peças
          </label>
          {catalog.categories.map((c) => (
            <label key={c.id}>
              <input
                type="radio"
                name="category-filter"
                checked={activeCategory === c.id || activeCategory === c.slug}
                onChange={() => set("categoria", c.slug)}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}
      {subs.length > 0 && (
        <div className="filter-group">
          <h3>SUBCATEGORIA</h3>
          <select
            aria-label="Subcategoria"
            value={get("subcategoria")}
            onChange={(e) => set("subcategoria", e.target.value)}
          >
            <option value="">Todas</option>
            {subs.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      <div className="filter-group">
        <h3>TAMANHO</h3>
        <div className="chips">
          {sizes.map((s) => (
            <button
              key={s}
              className={`chip ${get("tamanho") === s ? "active" : ""}`}
              aria-pressed={get("tamanho") === s}
              onClick={() => set("tamanho", get("tamanho") === s ? "" : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h3>COR</h3>
        <select
          aria-label="Filtrar por cor"
          value={get("cor")}
          onChange={(e) => set("cor", e.target.value)}
        >
          <option value="">Todas as cores</option>
          {colors.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <h3>PREÇO (R$)</h3>
        <div className="price-range">
          <input
            aria-label="Preço mínimo"
            type="number"
            min="0"
            placeholder="De"
            value={get("min")}
            onChange={(e) => set("min", e.target.value)}
          />
          <input
            aria-label="Preço máximo"
            type="number"
            min="0"
            placeholder="Até"
            value={get("max")}
            onChange={(e) => set("max", e.target.value)}
          />
        </div>
      </div>
      {!collection && (
        <div className="filter-group">
          <h3>DROP</h3>
          <select
            aria-label="Filtrar por drop"
            value={get("colecao")}
            onChange={(e) => set("colecao", e.target.value)}
          >
            <option value="">Todos os drops</option>
            {catalog.collections.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="filter-group">
        {[
          ["estoque", "Em estoque"],
          ["sale", "Em promoção"],
          ["novidades", "Novidades"],
          ["destaques", "VN Selects"],
        ].map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={Boolean(get(key))}
              onChange={(e) => set(key, e.target.checked ? "1" : "")}
            />
            {label}
          </label>
        ))}
      </div>
      <button
        className="text-link"
        onClick={() => router.replace(pathname, { scroll: false })}
      >
        LIMPAR FILTROS
      </button>
    </div>
  );
  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Navegação estrutural">
        <Link href="/">Início</Link>
        <span>/</span>
        <span>{wishlist ? "Favoritos" : "Shop"}</span>
      </nav>
      <p className="eyebrow">
        {wishlist
          ? "SALVO DO SEU JEITO"
          : collectionData
            ? "A PRÓXIMA SELEÇÃO"
            : "SELECTED BY VN"}
      </p>
      <h1 className="page-title">
        {wishlist
          ? "SEUS FAVORITOS."
          : categoryData?.name.toUpperCase() ||
            collectionData?.name ||
            (get("destaques")
              ? "VN SELECTS."
              : get("novidades")
                ? "NOVO DROP."
                : "SEU PRÓXIMO FIT.")}
      </h1>
      <p className="page-intro">
        {categoryData?.description ||
          collectionData?.description ||
          (wishlist
            ? "As peças que ficaram no seu radar."
            : "Essenciais com presença. Encontre as peças que falam por você.")}
      </p>
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          set("q", searchText);
          track("search", { search_term: searchText });
        }}
      >
        <input
          aria-label="Buscar peças no catálogo"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar uma peça…"
        />
        <button className="button" aria-label="Buscar" type="submit">
          <Search size={18} />
        </button>
      </form>
      <div className="catalog-toolbar">
        <button
          className="button button-outline filter-button"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal size={16} />
          FILTROS
        </button>
        <span className="muted small">
          {filtered.length}{" "}
          {filtered.length === 1 ? "peça encontrada" : "peças encontradas"}
        </span>
        <label className="sr-only" htmlFor="sort-products">
          Ordenar produtos
        </label>
        <select
          id="sort-products"
          value={get("ordem")}
          onChange={(e) => set("ordem", e.target.value)}
        >
          <option value="">Relevância</option>
          <option value="vendidos">Mais vendidos</option>
          <option value="novidades">Novidades</option>
          <option value="menor">Menor preço</option>
          <option value="maior">Maior preço</option>
        </select>
      </div>
      {search.size > 0 && (
        <div className="catalog-active">
          {[...search.entries()]
            .filter(([k]) => !["pagina", "ordem"].includes(k))
            .map(([k, v]) => (
              <button key={k} className="chip" onClick={() => set(k, "")}>
                {(
                  {
                    q: "Busca",
                    categoria: "Categoria",
                    colecao: "Drop",
                    tamanho: "Tamanho",
                    cor: "Cor",
                    min: "A partir de",
                    max: "Até",
                    estoque: "Em estoque",
                    sale: "Promoção",
                    novidades: "Novidades",
                    destaques: "VN Selects",
                  } as Record<string, string>
                )[k] || k}
                {v !== "1" ? `: ${v}` : ""}
                <X size={12} />
                <span className="sr-only">Remover filtro</span>
              </button>
            ))}
        </div>
      )}
      <div className="catalog-layout">
        <aside className="desktop-filters">{filterControls}</aside>
        <div>
          {filtered.length ? (
            <>
              <div className="product-grid">
                {filtered.slice((page - 1) * 12, page * 12).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} eager />
                ))}
              </div>
              {pages > 1 && (
                <nav className="pagination" aria-label="Páginas do catálogo">
                  {Array.from({ length: pages }, (_, i) => (
                    <button
                      key={i}
                      className={page === i + 1 ? "active" : ""}
                      aria-current={page === i + 1 ? "page" : undefined}
                      onClick={() => set("pagina", String(i + 1))}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              )}
            </>
          ) : (
            <Empty
              title={
                wishlist ? "Seu radar está livre." : "Nenhuma peça por aqui."
              }
              description={
                wishlist
                  ? "Toque no coração de uma peça para salvar seus favoritos."
                  : "Experimente remover um filtro ou buscar de outro jeito."
              }
            >
              <Link className="button" href="/produtos">
                EXPLORAR TODAS AS PEÇAS
              </Link>
            </Empty>
          )}
        </div>
      </div>
      <Modal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="REFINE SEU FIT"
        drawer
      >
        {filterControls}
        <button
          className="button full"
          style={{ marginTop: 25 }}
          onClick={() => setFiltersOpen(false)}
        >
          VER {filtered.length} PEÇAS
        </button>
      </Modal>
    </div>
  );
}
