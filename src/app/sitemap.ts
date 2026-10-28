import type { MetadataRoute } from "next";
import { getCatalog } from "@/server/repository";
import { isDemo, siteUrl } from "@/server/config";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isDemo()) return [];
  const { products, categories, collections } = await getCatalog();
  return [
    "",
    "/produtos",
    "/lookbook",
    "/colecoes",
    ...categories.map((c) => `/categorias/${c.slug}`),
    ...collections.map((c) => `/colecoes/${c.slug}`),
    ...products.filter((p) => !p.demo).map((p) => `/produto/${p.slug}`),
  ].map((path) => ({
    url: siteUrl() + path,
    changeFrequency: "weekly" as const,
    priority: path ? 0.7 : 1,
  }));
}
