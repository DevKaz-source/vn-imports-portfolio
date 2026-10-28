import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog } from "@/server/repository";
import { ProductDetail } from "@/components/product-detail";
import { siteUrl } from "@/server/config";
import { availableStock } from "@/domain/commerce";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getCatalog()).products.find((p) => p.slug === slug);
  if (!p) return { title: "Peça não encontrada" };
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.description,
    alternates: { canonical: `/produto/${p.slug}` },
    robots: p.demo ? { index: false } : undefined,
    openGraph: {
      title: p.name,
      description: p.seoDescription || p.description,
      url: `${siteUrl()}/produto/${p.slug}`,
      type: "website",
      images: p.images
        .slice(0, 1)
        .map((i) => ({ url: new URL(i.url, siteUrl()).href, alt: i.alt })),
    },
    twitter: { card: "summary", title: p.name, description: p.seoDescription },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (await getCatalog()).products.find((p) => p.slug === slug);
  if (!p) notFound();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.sku,
    image: p.images.map((i) => new URL(i.url, siteUrl()).href),
    brand: { "@type": "Brand", name: p.brand },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (p.priceCents / 100).toFixed(2),
      availability:
        availableStock(p) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${siteUrl()}/produto/${p.slug}`,
    },
  };
  return (
    <>
      {!p.demo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              schema,
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Início",
                    item: siteUrl(),
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Shop",
                    item: `${siteUrl()}/produtos`,
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: p.name,
                    item: `${siteUrl()}/produto/${p.slug}`,
                  },
                ],
              },
            ]).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <ProductDetail product={p} />
    </>
  );
}
