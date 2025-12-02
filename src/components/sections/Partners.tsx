export function Partners({ items }: { items: string[] }) {
  return (
    <section className="bg-surface py-12">
      <div className="content-width">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-muted">
          Our Partners
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((partner, index) => (
            <div
              key={partner}
              className="flex items-center justify-center rounded-2xl border border-border bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted animate-rise"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {partner}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
