import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty">
      <p className="eyebrow">404 / VN IMPORTS</p>
      <h1 className="page-title">FORA DO RADAR.</h1>
      <p>Essa página não está aqui. Seu próximo fit pode estar na seleção.</p>
      <Link className="button" href="/produtos">
        EXPLORAR AS PEÇAS
      </Link>
    </main>
  );
}
