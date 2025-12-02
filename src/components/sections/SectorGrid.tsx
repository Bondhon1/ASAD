import { SectionHeading } from '@/components/ui/SectionHeading';

type Sector = {
  name: string;
  summary: string;
};

export function SectorGrid({ sectors }: { sectors: Sector[] }) {
  return (
    <section className="section-py bg-surface">
      <div className="content-width">
        <SectionHeading
          eyebrow="Sectors & Units"
          title="Seven sectors plus clubs and departments keep ASAD agile."
          description="Each division launches its own tasks, events, donations, and recognition programs with transparent reporting."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector, index) => (
            <div
              key={sector.name}
              className="h-full rounded-3xl border border-border bg-white p-6 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(0,0,0,0.08)] animate-rise"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                {sector.name}
              </p>
              <p className="mt-3 text-base font-semibold text-ink">{sector.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
