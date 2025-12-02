import Link from 'next/link';
import { SectionHeading } from '@/components/ui/SectionHeading';

type Project = {
  title: string;
  summary: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export function ProjectHighlight({ project }: { project: Project }) {
  return (
    <section id="alokdhara" className="section-py bg-surface">
      <div className="content-width grid gap-10 lg:grid-cols-2">
        <div className="animate-rise">
          <SectionHeading
            eyebrow="Featured Project"
            title={project.title}
            description={project.summary}
          />
          <ul className="mt-8 space-y-4 text-base text-muted">
            {project.bullets.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary"></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href={project.ctaHref}
            className="mt-8 inline-flex rounded-full bg-primary px-8 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-white"
          >
            {project.ctaLabel}
          </Link>
        </div>
        <div className="rounded-[32px] bg-white p-4 shadow-[0_30px_70px_rgba(0,0,0,0.1)] animate-rise delay-2">
          <div className="h-full rounded-[24px] bg-gradient-to-br from-primary/80 via-primary to-ink-soft p-6 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">Field Journal</p>
            <p className="mt-4 text-2xl font-semibold">Weekly street classroom</p>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Volunteers prepare lesson kits, serve meals, and document attendance for transparency. Photos and reports are archived for donors.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Children Served', value: '180+/week' },
                { label: 'Volunteer Rotations', value: '4 squads' },
                { label: 'Meal Support', value: '2 drops/week' },
                { label: 'Learning Hours', value: '12 hrs/week' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
