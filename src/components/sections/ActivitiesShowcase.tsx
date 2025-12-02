import { SectionHeading } from '@/components/ui/SectionHeading';

type Activity = {
  title: string;
  points: string[];
};

export function ActivitiesShowcase({ cards }: { cards: Activity[] }) {
  return (
    <section id="activities" className="section-py bg-white">
      <div className="content-width">
        <SectionHeading
          eyebrow="Activities"
          title="Weekly tasks, live shows, outreach drives, and community-funded projects."
          description="Every sector or department has its own cadence of posts, workshops, hangouts, and recognition programs so volunteers always have purposeful work."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {cards.map((card, index) => (
            <div
              key={card.title}
              className="flex h-full flex-col rounded-3xl border border-border bg-surface p-8 animate-rise"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <h3 className="text-lg font-semibold text-ink">{card.title}</h3>
              <ul className="mt-4 flex flex-1 list-disc flex-col gap-3 pl-4 text-sm text-muted">
                {card.points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
