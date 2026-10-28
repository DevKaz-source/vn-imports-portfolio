import { notFound } from "next/navigation";
import { getCatalog } from "@/server/repository";
const titles: Record<string, string> = {
  privacidade: "Política de Privacidade",
  cookies: "Política de Cookies",
  termos: "Termos de Uso",
  trocas: "Trocas e Devoluções",
  entregas: "Política de Entrega",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return { title: titles[(await params).slug] || "Política" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!titles[slug]) notFound();
  const { settings: s } = await getCatalog();
  return (
    <article className="content-page">
      <p className="eyebrow">VN IMPORTS / INFORMAÇÕES</p>
      <h1>{titles[slug]}</h1>
      {!s.policiesReviewed && (
        <p className="notice" style={{ marginBottom: 25 }}>
          Conteúdo em preparação. As vendas reais ficam desativadas até a
          revisão dos dados e das políticas da loja.
        </p>
      )}
      <div className="policy-copy">
        {s.policies[slug] || "Esta informação será disponibilizada em breve."}
      </div>
      {s.email && (
        <p style={{ marginTop: 30 }}>
          Atendimento: <a href={`mailto:${s.email}`}>{s.email}</a>
        </p>
      )}
    </article>
  );
}
