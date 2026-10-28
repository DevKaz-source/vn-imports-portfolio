export default function Loading() {
  return (
    <div className="page shop-loading" role="status" aria-label="Carregando peças">
      <div className="skeleton-row">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    </div>
  );
}
