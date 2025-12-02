import { SectionHeading } from '@/components/ui/SectionHeading';

type Notice = {
  title: string;
  detail: string;
};

export function NoticeBoard({ notices }: { notices: Notice[] }) {
  return (
    <section id="notice" className="section-py bg-white">
      <div className="content-width">
        <SectionHeading
          eyebrow="Notices"
          title="Latest notices for applicants and official volunteers."
          description="Stay aligned with interviews, donation cycles, and project rosters."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {notices.map((notice, index) => (
            <div
              key={notice.title}
              className="rounded-3xl border border-border bg-surface p-6 animate-rise"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                {notice.title}
              </p>
              <p className="mt-3 text-sm text-muted">{notice.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
