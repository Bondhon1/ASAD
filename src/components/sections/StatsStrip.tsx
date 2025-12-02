type Stat = {
  value: string;
  label: string;
};

export function StatsStrip({ items }: { items: Stat[] }) {
  return (
    <section className="bg-surface py-10">
      <div className="content-width grid gap-6 text-center sm:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="rounded-2xl bg-white px-6 py-8 shadow-[0_12px_30px_rgba(0,0,0,0.06)] animate-rise"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <p className="text-4xl font-semibold text-ink">{item.value}</p>
            <p className="mt-3 text-sm uppercase tracking-[0.25em] text-muted">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
