"use client";
import Image from "next/image";
import { track } from "./tracking";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import type { Product } from "@/domain/types";
import { money, availableStock } from "@/domain/commerce";
import { useStore } from "./store-provider";
export function ProductCard({
  product: p,
  index = 0,
  eager = false,
}: {
  product: Product;
  index?: number;
  eager?: boolean;
}) {
  const { favorites, toggleFavorite, catalog } = useStore();
  const sold = availableStock(p) === 0;
  const pix = Math.round(
    p.priceCents * (1 - (p.pixPercent ?? catalog.settings.pixPercent) / 100),
  );
  return (
    <article className="product-card">
      <div className="product-image">
        <Link
          href={`/produto/${p.slug}`}
          onClick={() =>
            track("select_item", {
              items: [{ item_id: p.id, item_name: p.name }],
            })
          }
          aria-label={`Ver ${p.name}`}
        >
          <Image
            src={p.images[0]?.url || "/images/vn-logo.webp"}
            alt={p.images[0]?.alt || p.name}
            width={512}
            height={512}
            sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw"
            loading={eager && index < 4 ? "eager" : "lazy"}
          />
          {p.images[1] && (
            <Image
              className="secondary-image"
              src={p.images[1].url}
              alt={p.images[1].alt}
              width={512}
              height={512}
              sizes="25vw"
            />
          )}
        </Link>
        <span className="product-badge">
          {sold
            ? "ESGOTADO"
            : p.compareAtCents && p.compareAtCents > p.priceCents
              ? `−${Math.round((1 - p.priceCents / p.compareAtCents) * 100)}%`
              : p.isNew
                ? "NOVO DROP"
                : ""}
        </span>
        <button
          className={`product-heart ${favorites.includes(p.id) ? "selected" : ""}`}
          aria-label={`${favorites.includes(p.id) ? "Remover" : "Adicionar"} ${p.name} ${favorites.includes(p.id) ? "dos" : "aos"} favoritos`}
          aria-pressed={favorites.includes(p.id)}
          onClick={() => toggleFavorite(p.id)}
        >
          <Heart
            size={19}
            fill={favorites.includes(p.id) ? "currentColor" : "none"}
          />
        </button>
        <Link className="quick-view" href={`/produto/${p.slug}`}>
          <Plus size={17} />
          ESCOLHER TAMANHO
        </Link>
      </div>
      <div className="product-meta">
        <p className="product-category">
          {catalog.categories.find((c) => c.id === p.categoryId)?.name}
          {p.demo ? " / DEMO" : ""}
        </p>
        <Link className="product-name" href={`/produto/${p.slug}`}>
          {p.name}
        </Link>
        <div className="product-price">
          <strong>{money(p.priceCents)}</strong>
          {p.compareAtCents && p.compareAtCents > p.priceCents ? (
            <del>{money(p.compareAtCents)}</del>
          ) : null}
        </div>
        <p className="pix-price">{money(pix)} no Pix</p>
        <div className="color-dots">
          {[...new Map(p.variants.map((v) => [v.color, v])).values()].map(
            (v) => (
              <span
                key={v.color}
                style={{ background: v.colorHex }}
                title={v.color}
              />
            ),
          )}
        </div>
      </div>
    </article>
  );
}
