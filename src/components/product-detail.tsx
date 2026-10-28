"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, ZoomIn, ShoppingBag } from "lucide-react";
import type { Product } from "@/domain/types";
import { availableStock, money, priceOf, whatsappUrl } from "@/domain/commerce";
import { useStore } from "./store-provider";
import { Modal } from "./ui";
import { ShippingCalculator } from "./shipping-calculator";
import { ProductCard } from "./product-card";
import { track } from "./tracking";
export function ProductDetail({ product: p }: { product: Product }) {
  const { catalog, add, favorites, toggleFavorite, view, recent } = useStore();
  const [color, setColor] = useState(
    p.variants.find((v) => v.active)?.color || "",
  );
  const [size, setSize] = useState("");
  const [currentImage, setCurrentImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [guide, setGuide] = useState(false);
  const [error, setError] = useState("");
  const touch = useRef(0);
  useEffect(() => {
    view(p.id);
    track("view_item", {
      currency: "BRL",
      value: p.priceCents / 100,
      items: [{ item_id: p.id, item_name: p.name }],
    });
  }, [p.id, p.name, p.priceCents, view]);
  const variant = p.variants.find(
    (v) => v.color === color && v.size === size && v.active,
  );
  const price = priceOf(p, variant?.id);
  const colors = [
    ...new Map(
      p.variants.filter((v) => v.active).map((v) => [v.color, v]),
    ).values(),
  ];
  const sizes = [
    ...new Set(
      p.variants
        .filter((v) => v.color === color && v.active)
        .map((v) => v.size),
    ),
  ];
  const image = p.images[currentImage] || p.images[0];
  const category = catalog.categories.find((c) => c.id === p.categoryId);
  const wa = whatsappUrl(
    catalog.settings.whatsapp,
    `Olá! Tenho interesse neste produto da VN Imports:\n${p.name}\n${variant ? `${variant.size} / ${variant.color}\n` : ""}${process.env.NEXT_PUBLIC_SITE_URL || ""}/produto/${p.slug}`,
  );
  const related = catalog.products
    .filter((x) => x.id !== p.id)
    .sort(
      (a, b) =>
        Number(b.categoryId === p.categoryId) -
        Number(a.categoryId === p.categoryId),
    )
    .slice(0, 4);
  function buy() {
    if (!variant) {
      setError("Escolha o tamanho da sua peça.");
      return;
    }
    if (add(p, variant)) {
      setError("");
      track("add_to_cart", {
        currency: "BRL",
        value: price / 100,
        items: [
          {
            item_id: p.id,
            item_name: p.name,
            item_variant: variant.id,
            quantity: 1,
          },
        ],
      });
    }
  }
  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Navegação estrutural">
        <Link href="/">Início</Link>
        <span>/</span>
        <Link href="/produtos">Shop</Link>
        <span>/</span>
        {category && (
          <>
            <Link href={`/categorias/${category.slug}`}>{category.name}</Link>
            <span>/</span>
          </>
        )}
        <span>{p.name}</span>
      </nav>
      <div className="detail-layout">
        <div className="product-gallery">
          <button
            className="main-product-image"
            onClick={() => setZoom(true)}
            onTouchStart={(e) => {
              touch.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const delta = e.changedTouches[0].clientX - touch.current;
              if (Math.abs(delta) > 50) {
                setCurrentImage(
                  (i) =>
                    (i + (delta < 0 ? 1 : -1) + p.images.length) %
                    p.images.length,
                );
              }
            }}
            aria-label={`Ampliar imagem de ${p.name}`}
          >
            <Image
              src={image?.url || "/images/vn-logo.webp"}
              alt={image?.alt || p.name}
              width={1000}
              height={1080}
              priority
              sizes="(max-width:640px) 100vw,55vw"
            />
            <span className="zoom-icon">
              <ZoomIn size={18} />
            </span>
          </button>
          {p.images.length > 1 && (
            <div className="gallery-thumbs">
              {p.images.map((im, i) => (
                <button
                  key={im.id}
                  className={i === currentImage ? "active" : ""}
                  onClick={() => setCurrentImage(i)}
                  aria-label={`Ver imagem ${i + 1}`}
                >
                  <Image src={im.url} alt={im.alt} width={80} height={80} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-detail">
          <p className="eyebrow">
            {category?.name.toUpperCase()} / VN SELECTION
          </p>
          <h1>{p.name}</h1>
          <div className="detail-prices">
            <strong>{money(price)}</strong>
            {p.compareAtCents && p.compareAtCents > price ? (
              <del>{money(p.compareAtCents)}</del>
            ) : null}
          </div>
          <p className="detail-pix">
            ou{" "}
            <strong>
              {money(
                Math.round(
                  price *
                    (1 - (p.pixPercent ?? catalog.settings.pixPercent) / 100),
                ),
              )}
            </strong>{" "}
            no Pix ({p.pixPercent ?? catalog.settings.pixPercent}% OFF)
          </p>
          <p className="detail-description">{p.description}</p>
          <div className="variant-heading">
            <span>
              COR: <strong>{color}</strong>
            </span>
            <button
              className="icon-button"
              aria-label="Salvar nos favoritos"
              aria-pressed={favorites.includes(p.id)}
              onClick={() => toggleFavorite(p.id)}
            >
              <Heart
                size={20}
                fill={favorites.includes(p.id) ? "currentColor" : "none"}
              />
            </button>
          </div>
          <div className="color-options">
            {colors.map((v) => (
              <button
                key={v.color}
                className={v.color === color ? "active" : ""}
                aria-pressed={v.color === color}
                onClick={() => {
                  setColor(v.color);
                  setSize("");
                  if (v.image) {
                    const idx = p.images.findIndex((im) => im.url === v.image);
                    if (idx >= 0) setCurrentImage(idx);
                  }
                }}
              >
                <span style={{ background: v.colorHex }} />
                {v.color}
              </button>
            ))}
          </div>
          <div className="variant-heading">
            <span>
              TAMANHO: <strong>{size || "SELECIONE"}</strong>
            </span>
            <button onClick={() => setGuide(true)}>Guia de tamanhos</button>
          </div>
          <div className="size-options">
            {sizes.map((s) => {
              const v = p.variants.find(
                (v) => v.color === color && v.size === s && v.active,
              );
              return (
                <button
                  key={s}
                  className={s === size ? "active" : ""}
                  aria-pressed={s === size}
                  disabled={!v?.stock}
                  aria-label={`${s}${!v?.stock ? " indisponível" : ""}`}
                  onClick={() => {
                    setSize(s);
                    setError("");
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <p className="stock-note">
            {variant
              ? variant.stock <= 3
                ? `Restam ${variant.stock} no tamanho ${variant.size}${p.demo ? " · estoque de exemplo" : ""}.`
                : "Peça disponível nesta variação."
              : "Selecione um tamanho para continuar."}
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button full add-to-bag"
            onClick={buy}
            disabled={availableStock(p) === 0}
          >
            <ShoppingBag size={18} />
            {availableStock(p) === 0 ? "PEÇA ESGOTADA" : "ADICIONAR À SACOLA"}
          </button>
          {wa ? (
            <a
              className="product-contact"
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={17} />
              Dúvidas? Chamar no WhatsApp
            </a>
          ) : (
            <a
              className="product-contact"
              href={catalog.settings.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={17} />
              Dúvidas? Fale com a VN no Instagram
            </a>
          )}
          <ShippingCalculator
            items={
              variant
                ? [{ productId: p.id, variantId: variant.id, quantity: 1 }]
                : []
            }
          />
          <div className="details-accordion">
            <details open>
              <summary>COMPOSIÇÃO E CUIDADOS</summary>
              <p>{p.material}</p>
            </details>
            <details>
              <summary>DETALHES DA PEÇA</summary>
              <p>{p.details}</p>
              <p>SKU: {variant?.sku || p.sku}</p>
            </details>
            <details>
              <summary>TROCAS E DEVOLUÇÕES</summary>
              <p>
                Confira as condições e o canal de atendimento na nossa{" "}
                <Link className="text-link" href="/politicas/trocas">
                  política de trocas
                </Link>
                .
              </p>
            </details>
          </div>
          {p.demo && (
            <p className="product-demo">
              PEÇA DEMO — imagem ilustrativa, preço, medidas e estoque de
              exemplo. Nenhuma cobrança real.
            </p>
          )}
        </div>
      </div>
      <section className="related">
        <div className="section-heading">
          <div>
            <span className="eyebrow">COMBINA COM VOCÊ</span>
            <h2>COMPLETE O FIT.</h2>
          </div>
        </div>
        <div className="product-grid">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      {recent.some((id) => id !== p.id) && (
        <section className="related">
          <div className="section-heading">
            <h2>NO SEU RADAR.</h2>
          </div>
          <div className="product-grid">
            {recent
              .filter((id) => id !== p.id)
              .slice(0, 4)
              .map((id) => {
                const product = catalog.products.find((p) => p.id === id);
                return product ? (
                  <ProductCard key={id} product={product} />
                ) : null;
              })}
          </div>
        </section>
      )}
      <Modal open={zoom} onOpenChange={setZoom} title={p.name} wide>
        <Image
          src={image?.url || "/images/vn-logo.webp"}
          alt={image?.alt || p.name}
          width={1200}
          height={1200}
        />
      </Modal>
      <Modal open={guide} onOpenChange={setGuide} title="ENCONTRE SEU TAMANHO">
        <p className="muted small">
          {p.demo ? "Medidas demonstrativas. " : ""}Compare com uma peça que
          veste bem em você. Medidas em centímetros, com a peça estendida.
        </p>
        <table className="size-table">
          <thead>
            <tr>
              <th>Tamanho</th>
              <th>Largura</th>
              <th>
                {p.categoryId === "sneakers" ? "Palmilha" : "Comprimento"}
              </th>
              {p.sizeGuide.some((r) => r.waist) && <th>Cintura</th>}
            </tr>
          </thead>
          <tbody>
            {p.sizeGuide.map((row) => (
              <tr key={row.size}>
                <td>{row.size}</td>
                <td>{row.chest}</td>
                <td>{row.length}</td>
                {p.sizeGuide.some((r) => r.waist) && (
                  <td>{row.waist || "—"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!p.sizeGuide.length && (
          <p>
            Medidas ainda não cadastradas. Fale com a VN para conferir o
            caimento.
          </p>
        )}
      </Modal>
    </div>
  );
}
