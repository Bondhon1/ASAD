/* Theme 2: BRAC Warm - Bold red, professional NGO aesthetic */
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

export default function BracTheme() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#" className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <div>
                <span className="block text-lg font-extrabold text-gray-900 leading-tight">ASAD</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-[#E31B23]">Amar Somoy Amar Desh</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" className="text-sm font-bold text-gray-700 hover:text-[#E31B23] transition">{item}</Link>
              ))}
              <Link href="#join" className="rounded-full bg-[#E31B23] px-7 py-3 text-sm font-bold text-white hover:bg-[#c4161f] transition shadow-lg shadow-red-500/20">Become a Volunteer</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero with Full Banner Background */}
      <section className="relative min-h-[90vh] flex items-center pt-20">
        <div className="absolute inset-0">
          <Image
            src="/banner.jpg"
            alt="ASAD volunteers"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#E31B23]/70 to-[#8B0000]/80" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E31B23] px-5 py-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-semibold uppercase tracking-widest text-white">Since 2020</span>
              </div>
              <h1 className="mt-8 text-5xl font-extrabold leading-[1.1] text-white md:text-6xl lg:text-7xl">
                {heroContent.title}
              </h1>
              <p className="mt-8 text-xl leading-relaxed text-white/80">
                {heroContent.description}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href={heroContent.primaryAction.href}
                  className="group relative overflow-hidden rounded-full bg-[#E31B23] px-10 py-5 text-lg font-bold text-white shadow-2xl transition-all hover:shadow-[#E31B23]/50"
                >
                  <span className="relative z-10">{heroContent.primaryAction.label}</span>
                </Link>
                <Link
                  href={heroContent.secondaryAction.href}
                  className="rounded-full border-2 border-white/50 px-10 py-5 text-lg font-bold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/10"
                >
                  {heroContent.secondaryAction.label}
                </Link>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className={`rounded-3xl p-8 backdrop-blur-md ${i === 0 ? 'bg-[#E31B23] col-span-2' : 'bg-white/10'}`}>
                  <p className={`text-5xl font-extrabold ${i === 0 ? 'text-white' : 'text-white'}`}>{stat.value}</p>
                  <p className={`mt-2 text-sm font-medium uppercase tracking-wider ${i === 0 ? 'text-white/80' : 'text-white/60'}`}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-14 w-8 rounded-full border-2 border-white/50 p-2">
            <div className="h-3 w-1 mx-auto rounded-full bg-white" />
          </div>
        </div>
      </section>

      {/* Mobile Stats */}
      <section className="lg:hidden bg-[#E31B23] px-6 py-12">
        <div className="mx-auto max-w-7xl grid gap-6 grid-cols-3">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-extrabold text-white">{stat.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] items-center">
            <div className="relative">
              <div className="aspect-[4/5] rounded-[40px] bg-gradient-to-br from-[#E31B23] to-[#8B0000] p-1">
                <div className="h-full w-full rounded-[36px] bg-gray-100 overflow-hidden relative">
                  <Image src="/banner.jpg" alt="" fill className="object-cover" />
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 rounded-2xl bg-[#E31B23] p-6 text-white shadow-2xl">
                <p className="text-4xl font-extrabold">5+</p>
                <p className="text-sm font-medium uppercase tracking-wider text-white/80">Years of Impact</p>
              </div>
            </div>
            <div>
              <span className="inline-block rounded-full bg-[#E31B23]/10 px-4 py-2 text-sm font-bold uppercase tracking-widest text-[#E31B23]">{aboutContent.eyebrow}</span>
              <h2 className="mt-6 text-4xl font-extrabold text-gray-900 lg:text-5xl leading-tight">{aboutContent.title}</h2>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed">{aboutContent.description}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border-2 border-[#E31B23] p-6">
                  <h3 className="font-bold text-[#E31B23] uppercase tracking-wider text-sm">Mission</h3>
                  <p className="mt-3 text-gray-700 font-medium">{aboutContent.mission}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-6">
                  <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Vision</h3>
                  <p className="mt-3 text-gray-700 font-medium">{aboutContent.vision}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors with horizontal scroll */}
      <section className="bg-gray-50 px-6 py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-[#E31B23]">Sectors</span>
              <h2 className="mt-4 text-4xl font-extrabold text-gray-900">Our Areas of Impact</h2>
            </div>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, i) => (
              <div key={i} className="group relative rounded-3xl bg-white p-8 shadow-lg transition-all hover:-translate-y-2 hover:shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#E31B23] to-[#FF6B6B] transform origin-left scale-x-0 transition-transform group-hover:scale-x-100" />
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E31B23]/10 text-2xl font-bold text-[#E31B23]">
                  {sector.name.charAt(0)}
                </span>
                <h3 className="mt-6 text-xl font-bold text-gray-900">{sector.name}</h3>
                <p className="mt-3 text-gray-600">{sector.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Timeline */}
      <section className="bg-[#E31B23] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-white">Volunteer Journey</h2>
            <p className="mt-4 text-xl text-white/70">Your path from applicant to changemaker</p>
          </div>
          <div className="mt-16 relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/20 hidden lg:block" />
            <div className="grid gap-8 lg:grid-cols-4">
              {journeySteps.map((step, i) => (
                <div key={i} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-extrabold text-[#E31B23] shadow-xl">
                      {i + 1}
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-white">{step.title}</h3>
                    <p className="mt-3 text-white/70">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Activities */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <span className="text-sm font-bold uppercase tracking-widest text-[#E31B23]">What We Do</span>
            <h2 className="mt-4 text-4xl font-extrabold text-gray-900">Our Activities</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {activities.map((activity, i) => (
              <div key={i} className="rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E31B23] text-lg font-bold text-white">{i + 1}</span>
                  <h3 className="text-xl font-bold text-gray-900">{activity.title}</h3>
                </div>
                <ul className="mt-6 space-y-4">
                  {activity.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#E31B23]" />
                      <span className="text-gray-600">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Alokdhara */}
      <section className="relative min-h-[70vh] flex items-center px-6 py-24">
        <div className="absolute inset-0">
          <Image src="/banner.jpg" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl w-full">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full bg-[#E31B23] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white">Featured Project</span>
            <h2 className="mt-6 text-5xl font-extrabold text-white lg:text-6xl">{projectAlokdhara.title}</h2>
            <p className="mt-6 text-xl text-white/80">{projectAlokdhara.summary}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              {projectAlokdhara.bullets.map((bullet, i) => (
                <span key={i} className="rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
                  {bullet}
                </span>
              ))}
            </div>
            <Link
              href={projectAlokdhara.ctaHref}
              className="mt-10 inline-flex rounded-full bg-[#E31B23] px-10 py-5 text-lg font-bold text-white shadow-2xl transition hover:bg-[#c4161f]"
            >
              {projectAlokdhara.ctaLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-extrabold text-gray-900">Latest Notices</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {notices.map((notice, i) => (
              <div key={i} className="rounded-3xl bg-white p-8 shadow-lg hover:shadow-xl transition-shadow">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E31B23]/10 text-sm font-bold text-[#E31B23]">{i + 1}</span>
                <h3 className="mt-4 text-xl font-bold text-gray-900">{notice.title}</h3>
                <p className="mt-3 text-gray-600">{notice.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[40px] bg-gradient-to-br from-[#E31B23] to-[#8B0000] p-12 lg:p-20">
            <div className="text-center">
              <h2 className="text-4xl font-extrabold text-white lg:text-5xl">Ready to Make a Difference?</h2>
              <p className="mt-4 text-xl text-white/80">Join thousands of volunteers creating positive change</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {joinOptions.map((option, i) => (
                <div key={i} className="rounded-3xl bg-white/10 p-8 backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-white">{option.title}</h3>
                  <p className="mt-3 text-white/70">{option.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-gray-100 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-gray-500">Trusted By</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {partners.map((partner, i) => (
              <div key={i} className="rounded-2xl bg-white px-8 py-4 text-sm font-bold text-gray-700 shadow">
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
              <h3 className="text-2xl font-extrabold">ASAD</h3>
              <p className="mt-2 text-sm text-[#E31B23] font-semibold">Amar Somoy Amar Desh</p>
              <p className="mt-4 text-gray-400">Empowering youth through structured volunteering and national service.</p>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-[#E31B23]">Navigation</h4>
              <div className="mt-4 flex flex-col gap-2 text-gray-400">
                <Link href="#" className="hover:text-white transition">Home</Link>
                <Link href="#" className="hover:text-white transition">About</Link>
                <Link href="#" className="hover:text-white transition">Sectors</Link>
                <Link href="#" className="hover:text-white transition">Join Us</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-[#E31B23]">Connect</h4>
              <div className="mt-4 space-y-2 text-gray-400">
                <p>FB: Asadian Asad</p>
                <p>hello@asadofficial.org</p>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Amar Somoy Amar Desh
          </div>
        </div>
      </footer>
    </div>
  );
}
