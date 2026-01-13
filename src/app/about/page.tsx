import Link from 'next/link';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'About — Amar Somoy Amar Desh',
  description: 'About Amar Somoy Amar Desh and our official volunteers directory.',
};

export default async function AboutPage() {
  const users = await prisma.user.findMany({
    where: { status: 'OFFICIAL', fullName: { not: null } },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });

  return (
    <div>
      <Header />

      <main className="section-py bg-white">
        <div className="content-width">
          <SectionHeading
            eyebrow="About Us"
            title="Amar Somoy Amar Desh — About"
            description="ASAD mobilizes students across Bangladesh to lead community initiatives in education, culture, environment, medical aid and more."
          />

          <div className="mt-6 text-sm text-muted">
            <p>
              Amar Somoy Amar Desh (ASAD) is a non-political youth collective that nurtures civic
              responsibility through structured sectors, departments, and clubs. Volunteers join
              through a transparent application and ranking system and serve across many programs
              nation-wide.
            </p>
          </div>

          <h3 className="mt-10 text-lg font-semibold">Official Volunteers</h3>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {users.map((u) => (
              <div key={u.id} className="rounded-xl border border-border/80 bg-white p-4 text-sm font-medium text-ink shadow-sm">
                {u.fullName}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
