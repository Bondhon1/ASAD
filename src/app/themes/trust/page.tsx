/* Theme 3: Trust Green - Fresh, growth-oriented, sustainability */
import Image from 'next/image';
import Link from 'next/link';
import {
  heroContent,
  stats,
  aboutContent,
  sectors,
  journeySteps,
  activities,
  projectAlokdhara,
  joinOptions,
  partners,
  notices,
} from '@/content/homepage';

export default function TrustTheme() {
  return (
    <div className="min-h-screen bg-[#FAFDF7]" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-[#00A651]/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#" className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-2xl">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <span className="text-lg font-bold text-gray-900">Amar Somoy Amar Desh</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" className="text-sm font-semibold text-gray-600 hover:text-[#00A651] transition">{item}</Link>
              ))}
              <Link href="#join" className="rounded-2xl bg-[#00A651] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#008B45] transition">Join Movement</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero with Full Banner Background */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <Image
            src="/banner.jpg"
            alt="ASAD volunteers"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#00A651]/95 via-[#00A651]/80 to-[#228B22]/70" />
        </div>
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-[#90EE90]/10 blur-3xl" />
        
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/20 px-6 py-3 backdrop-blur-sm">
              <span className="h-3 w-3 rounded-full bg-[#90EE90]" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Amar Somoy Amar Desh</span>
              <span className="h-3 w-3 rounded-full bg-[#90EE90]" />
            </div>
            <h1 className="mt-10 text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
              {heroContent.title}
            </h1>
            <p className="mt-8 text-xl leading-relaxed text-white/85 max-w-3xl mx-auto">
              {heroContent.description}
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-5">
              <Link
                href={heroContent.primaryAction.href}
                className="rounded-2xl bg-white px-10 py-5 text-lg font-bold text-[#00A651] shadow-2xl transition-all hover:shadow-white/25 hover:-translate-y-1"
              >
                {heroContent.primaryAction.label}
              </Link>
              <Link
                href={heroContent.secondaryAction.href}
                className="rounded-2xl border-2 border-white px-10 py-5 text-lg font-bold text-white transition hover:bg-white/10"
              >
                {heroContent.secondaryAction.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-20 -mt-16 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat, i) => (
              <div key={i} className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-[#00A651]/10">
                <p className="text-5xl font-bold text-[#00A651]">{stat.value}</p>
                <p className="mt-3 text-sm font-medium uppercase tracking-wider text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-20 lg:grid-cols-2 items-center">
            <div>
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#00A651]">{aboutContent.eyebrow}</span>
              <h2 className="mt-4 text-4xl font-bold text-gray-900 lg:text-5xl leading-tight">{aboutContent.title}</h2>
              <p className="mt-8 text-lg text-gray-600 leading-relaxed">{aboutContent.description}</p>
              <div className="mt-8 space-y-4">
                {aboutContent.paragraphs.map((p, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#00A651] flex-shrink-0" />
                    {p}
                  </p>
                ))}
              </div>
              <Link href={aboutContent.learnMore.href} className="mt-8 inline-flex items-center gap-2 text-lg font-bold text-[#00A651] hover:gap-4 transition-all">
                {aboutContent.learnMore.label}
              </Link>
            </div>
            <div className="space-y-6">
              <div className="rounded-[32px] bg-gradient-to-br from-[#00A651] to-[#228B22] p-10 text-white shadow-2xl shadow-[#00A651]/30">
                <div className="h-1 w-16 rounded-full bg-white/50 mb-6" />
                <h3 className="text-lg font-bold uppercase tracking-wider text-white/80">Our Mission</h3>
                <p className="mt-4 text-xl font-medium leading-relaxed">{aboutContent.mission}</p>
              </div>
              <div className="rounded-[32px] bg-white p-10 shadow-xl ring-1 ring-gray-100">
                <div className="h-1 w-16 rounded-full bg-[#00A651] mb-6" />
                <h3 className="text-lg font-bold uppercase tracking-wider text-[#00A651]">Our Vision</h3>
                <p className="mt-4 text-xl font-medium leading-relaxed text-gray-800">{aboutContent.vision}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="bg-[#00A651] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Our Impact Areas</span>
            <h2 className="mt-4 text-4xl font-bold text-white">Seven Sectors of Change</h2>
          </div>
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, i) => (
              <div key={i} className="rounded-[28px] bg-white p-8 shadow-xl transition-all hover:-translate-y-2 hover:shadow-2xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00A651]/10 text-2xl font-bold text-[#00A651]">
                  {sector.name.charAt(0)}
                </div>
                <h3 className="mt-5 text-xl font-bold text-gray-900">{sector.name}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{sector.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#00A651]">How to Join</span>
            <h2 className="mt-4 text-4xl font-bold text-gray-900">Your Volunteer Journey</h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {journeySteps.map((step, i) => (
              <div key={i} className="relative">
                <div className="rounded-[28px] border-2 border-[#00A651]/20 bg-[#FAFDF7] p-8 h-full">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#00A651] text-lg font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-3 text-gray-600">{step.detail}</p>
                </div>
                {i < journeySteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 text-[#00A651]/30 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activities */}
      <section className="bg-[#FAFDF7] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#00A651]">Activities</span>
            <h2 className="mt-4 text-4xl font-bold text-gray-900">What We Do Together</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {activities.map((activity, i) => (
              <div key={i} className="rounded-[28px] bg-white p-8 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-[#00A651]" />
                  {activity.title}
                </h3>
                <ul className="mt-6 space-y-4">
                  {activity.points.map((point, j) => (
                    <li key={j} className="text-gray-600 leading-relaxed pl-6 border-l-2 border-[#00A651]/20">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Alokdhara */}
      <section className="relative overflow-hidden px-6 py-28">
        <div className="absolute inset-0">
          <Image src="/banner.jpg" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 to-black/60" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block rounded-full bg-[#00A651] px-5 py-2 text-sm font-bold uppercase tracking-wider text-white">Featured Initiative</span>
              <h2 className="mt-6 text-5xl font-bold text-white">{projectAlokdhara.title}</h2>
              <p className="mt-6 text-xl text-white/80 leading-relaxed">{projectAlokdhara.summary}</p>
              <ul className="mt-8 space-y-4">
                {projectAlokdhara.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-4 text-white/80">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#00A651] flex-shrink-0" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href={projectAlokdhara.ctaHref}
                className="mt-10 inline-flex rounded-2xl bg-[#00A651] px-10 py-5 text-lg font-bold text-white shadow-2xl transition hover:bg-[#008B45]"
              >
                {projectAlokdhara.ctaLabel}
              </Link>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { label: 'Children Weekly', value: '180+' },
                { label: 'Active Squads', value: '4' },
                { label: 'Meals/Week', value: '2x' },
                { label: 'Learning Hours', value: '12' },
              ].map((item, i) => (
                <div key={i} className="rounded-[24px] bg-white/10 backdrop-blur-sm p-6 text-center">
                  <p className="text-4xl font-bold text-white">{item.value}</p>
                  <p className="mt-2 text-sm text-white/60 uppercase tracking-wider">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-gray-900">Announcements</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {notices.map((notice, i) => (
              <div key={i} className="rounded-[24px] border-2 border-[#00A651]/10 bg-[#FAFDF7] p-8 hover:border-[#00A651]/30 transition-colors">
                <div className="h-1 w-10 rounded-full bg-[#00A651]" />
                <h3 className="mt-5 text-lg font-bold text-gray-900">{notice.title}</h3>
                <p className="mt-3 text-gray-600">{notice.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section className="bg-[#FAFDF7] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900">Join the Movement</h2>
            <p className="mt-4 text-xl text-gray-600">Choose your path to make a difference</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {joinOptions.map((option, i) => (
              <div key={i} className="rounded-[28px] bg-white p-10 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00A651]/10">
                  <span className="text-xl font-bold text-[#00A651]">{i + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-gray-900">{option.title}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{option.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-[#00A651]/5 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Our Partners</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {partners.map((partner, i) => (
              <div key={i} className="rounded-xl bg-white px-8 py-4 text-sm font-bold text-gray-700 shadow-md">
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-2xl font-bold">Amar Somoy Amar Desh</h3>
              <p className="mt-4 text-gray-400 leading-relaxed">Growing leaders, nurturing communities, building a greener future together.</p>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-[#00A651]">Quick Links</h4>
              <div className="mt-4 flex flex-col gap-3 text-gray-400">
                <Link href="#" className="hover:text-white transition">Home</Link>
                <Link href="#" className="hover:text-white transition">About Us</Link>
                <Link href="#" className="hover:text-white transition">Sectors</Link>
                <Link href="#" className="hover:text-white transition">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-[#00A651]">Contact Us</h4>
              <div className="mt-4 space-y-3 text-gray-400">
                <p>Official FB: Asadian Asad</p>
                <p>hello@asadofficial.org</p>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Amar Somoy Amar Desh. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
