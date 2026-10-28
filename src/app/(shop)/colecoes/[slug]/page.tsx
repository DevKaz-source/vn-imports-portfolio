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
  const c = (await getCatalog()).collections.find((c) => c.slug === slug);
  return {
    title: c?.name || "Drop",
    description: c?.description,
    alternates: { canonical: `/colecoes/${slug}` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await getCatalog()).collections.some((c) => c.slug === slug))
    notFound();
  return (
    <Suspense>
      <CatalogView collection={slug} />
    </Suspense>
  );
}
