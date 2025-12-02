import Image from 'next/image';
import Link from 'next/link';

type Action = {
  label: string;
  href: string;
};

type HeroProps = {
  title: string;
  description: string;
  primaryAction: Action;
  secondaryAction: Action;
};

export function Hero({ title, description, primaryAction, secondaryAction }: HeroProps) {
  return (
    <section id="home" className="section-py bg-white">
      <div className="content-width grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="animate-rise">
          <p className="eyebrow text-xs font-semibold text-primary tracking-[0.3em]">
            Amar Somoy Amar Desh
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold uppercase leading-tight text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {description}
          </p>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
            <Link
              href={primaryAction.href}
              className="rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-primary/90"
            >
              {primaryAction.label}
            </Link>
            <Link
              href={secondaryAction.href}
              className="rounded-full border border-ink px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-ink transition hover:text-primary"
            >
              {secondaryAction.label}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-xs uppercase tracking-[0.3em] text-muted">
            <div className="rounded-full border border-border px-5 py-2">Task System</div>
            <div className="rounded-full border border-border px-5 py-2">Ranking</div>
            <div className="rounded-full border border-border px-5 py-2">Donation Transparency</div>
          </div>
        </div>
        <div className="animate-rise delay-2">
          <div className="relative mx-auto w-full max-w-xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[32px] bg-surface shadow-[0_40px_120px_rgba(0,0,0,0.18)]">
              <Image
                src="/banner.jpg"
                alt="ASAD volunteers banner"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
            <div className="float-loop absolute -bottom-6 -left-6 hidden w-56 rounded-3xl bg-white p-4 text-xs font-semibold uppercase tracking-[0.3em] text-ink shadow-[0_25px_80px_rgba(0,0,0,0.15)] sm:block">
              <p className="text-primary">Onboarding</p>
              <p className="mt-2 text-base normal-case text-muted">
                Interviews every quarter + institutional service units for 15+ volunteers.
              </p>
            </div>
            <div className="pulse-soft absolute -top-5 -right-5 hidden rounded-full border border-primary px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary lg:block">
              Youth First
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
