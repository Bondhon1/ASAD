import Link from 'next/link';
import { SectionHeading } from '@/components/ui/SectionHeading';

type AboutContent = {
  eyebrow: string;
  title: string;
  description: string;
  paragraphs: string[];
  mission: string;
  vision: string;
  learnMore: { label: string; href: string };
};

export function AboutSection({ content }: { content: AboutContent }) {
  return (
    <section id="about" className="section-py bg-white">
      <div className="content-width grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionHeading eyebrow={content.eyebrow} title={content.title} description={content.description} />
          <div className="mt-8 space-y-5 text-base leading-relaxed text-muted">
            {content.paragraphs.map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </div>
          <Link
            href={content.learnMore.href}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary"
          >
            {content.learnMore.label}
          </Link>
        </div>
        <div className="grid gap-6">
          {[{ title: 'Mission', copy: content.mission }, { title: 'Vision', copy: content.vision }].map((item) => (
            <div key={item.title} className="rounded-3xl border border-border/80 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                {item.title}
              </p>
              <p className="mt-3 text-lg font-semibold text-ink">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
