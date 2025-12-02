import { SectionHeading } from '@/components/ui/SectionHeading';

type JoinOption = {
  title: string;
  detail: string;
};

export function JoinUs({ options }: { options: JoinOption[] }) {
  return (
    <section id="join" className="section-py bg-white">
      <div className="content-width">
        <SectionHeading
          eyebrow="Join Us"
          title="Join us through any of the following methods."
          description="Choose the pathway that fits your commitment—individual volunteer, institutional service, partner, or donor."
          align="center"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {options.map((option, index) => (
            <div
              key={option.title}
              className="rounded-3xl border border-border bg-surface p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)] animate-rise"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                {option.title}
              </p>
              <p className="mt-3 text-base text-muted">{option.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
