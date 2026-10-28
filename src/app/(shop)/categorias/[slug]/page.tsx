import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog";
import { getCatalog } from "@/server/repository";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = (await getCatalog()).categories.find((c) => c.slug === slug);
  return {
    title: c?.name || "Categoria",
    description: c?.description,
    alternates: { canonical: `/categorias/${slug}` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await getCatalog()).categories.some((c) => c.slug === slug)) notFound();
  return (
    <Suspense>
      <CatalogView category={slug} />
    </Suspense>
  );
}
