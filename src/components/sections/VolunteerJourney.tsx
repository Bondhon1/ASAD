import { SectionHeading } from '@/components/ui/SectionHeading';

type Step = {
  title: string;
  detail: string;
};

export function VolunteerJourney({ steps }: { steps: Step[] }) {
  return (
    <section className="section-py bg-white">
      <div className="content-width">
        <SectionHeading
          eyebrow="Volunteer Path"
          title="Four disciplined stages from applicant to impactful volunteer."
          description="Each milestone unlocks more capabilities—interviews, official IDs, donations, tasks, points, and rankings."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-3xl border border-border bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)] animate-rise"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Step {index + 1}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-3 text-base text-muted">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
