"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <p className="eyebrow">VN IMPORTS</p>
      <h1 className="page-title">PAUSA RÁPIDA.</h1>
      <p>Não conseguimos carregar esta página. Tente novamente em instantes.</p>
      <button className="button" onClick={reset}>
        TENTAR NOVAMENTE
      </button>
    </main>
  );
}
