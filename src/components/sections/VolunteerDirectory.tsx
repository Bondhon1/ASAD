import { SectionHeading } from '@/components/ui/SectionHeading';

type DirectoryContent = {
  title: string;
  detail: string;
  badges: string[];
};

export function VolunteerDirectory({ content }: { content: DirectoryContent }) {
  return (
    <section id="volunteers" className="section-py bg-white">
      <div className="content-width">
        <SectionHeading
          eyebrow="Volunteers"
          title={content.title}
          description={content.detail}
        />
        <div className="mt-10 flex flex-wrap gap-4">
          {content.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted"
            >
              {badge}
            </span>
          ))}
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((card, index) => (
            <div
              key={card}
              className="rounded-3xl border border-border bg-surface p-6 animate-rise"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="h-16 w-16 rounded-full bg-white shadow-inner"></div>
              <p className="mt-4 text-base font-semibold text-ink">Volunteer Name</p>
              <p className="text-sm text-muted">ID: ASAD-00{card}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-primary">Sector Tag</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
