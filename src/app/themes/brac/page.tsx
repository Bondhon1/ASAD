/* Theme 2: BRAC Warm - Bold red, professional NGO aesthetic */
"use client";

import { useState, useEffect, useRef } from 'react';
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

// Hook for intersection observer animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [threshold]);

  return { ref, isInView };
}

export default function BracTheme() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Animation refs
  const heroAnim = useInView(0.1);
  const statsAnim = useInView(0.2);
  const aboutAnim = useInView(0.1);
  const sectorsAnim = useInView(0.1);
  const journeyAnim = useInView(0.1);
  const activitiesAnim = useInView(0.1);
  const projectAnim = useInView(0.1);
  const noticesAnim = useInView(0.1);
  const joinAnim = useInView(0.1);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-xl transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#" className="flex items-center gap-3 group">
              <div className="relative h-11 w-11 overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-110">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <div>
                <span className="block text-lg font-extrabold text-gray-900 leading-tight">ASAD</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-[#E31B23]">Amar Somoy Amar Desh</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" className="text-sm font-bold text-gray-700 hover:text-[#E31B23] transition-colors duration-300">{item}</Link>
              ))}
              <Link href="#join" className="rounded-full bg-[#E31B23] px-7 py-3 text-sm font-bold text-white hover:bg-[#c4161f] transition-all duration-300 shadow-lg shadow-red-500/20 hover:scale-105">Become a Volunteer</Link>
            </div>
            {/* Mobile burger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block h-0.5 w-6 bg-gray-900 transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-6 bg-gray-900 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-6 bg-gray-900 transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`md:hidden bg-white border-t border-gray-100 overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-96 py-4' : 'max-h-0'}`}>
          <div className="flex flex-col gap-4 px-6">
            {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
              <Link key={item} href="#" onClick={() => setMobileMenuOpen(false)} className="text-base font-bold text-gray-700 hover:text-[#E31B23] transition-colors duration-300">{item}</Link>
            ))}
            <Link href="#join" onClick={() => setMobileMenuOpen(false)} className="rounded-full bg-[#E31B23] px-7 py-3 text-center text-sm font-bold text-white hover:bg-[#c4161f] transition-all duration-300">Become a Volunteer</Link>
          </div>
        </div>
      </nav>

      {/* Hero with Full Banner Background */}
      <section ref={heroAnim.ref} className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
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
              <div className={`inline-flex items-center gap-2 rounded-full bg-[#E31B23] px-5 py-2 transition-all duration-700 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-semibold uppercase tracking-widest text-white">Since 2020</span>
              </div>
              <h1 className={`mt-8 text-5xl font-extrabold leading-[1.1] text-white md:text-6xl lg:text-7xl transition-all duration-700 delay-100 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {heroContent.title}
              </h1>
              <p className={`mt-8 text-xl leading-relaxed text-white/80 transition-all duration-700 delay-200 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {heroContent.description}
              </p>
              <div className={`mt-10 flex flex-wrap gap-4 transition-all duration-700 delay-300 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <Link
                  href={heroContent.primaryAction.href}
                  className="group relative overflow-hidden rounded-full bg-[#E31B23] px-10 py-5 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:shadow-[#E31B23]/50 hover:scale-105"
                >
                  <span className="relative z-10">{heroContent.primaryAction.label}</span>
                </Link>
                <Link
                  href={heroContent.secondaryAction.href}
                  className="rounded-full border-2 border-white/50 px-10 py-5 text-lg font-bold text-white backdrop-blur-sm transition-all duration-300 hover:border-white hover:bg-white/10"
                >
                  {heroContent.secondaryAction.label}
                </Link>
              </div>
            </div>
            <div ref={statsAnim.ref} className="hidden lg:grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <div 
                  key={i} 
                  className={`rounded-3xl p-8 backdrop-blur-md transition-all duration-500 hover:scale-105 ${i === 0 ? 'bg-[#E31B23] col-span-2' : 'bg-white/10'} ${statsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <p className="text-5xl font-extrabold text-white">{stat.value}</p>
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
      <section ref={aboutAnim.ref} className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] items-center">
            <div className={`relative transition-all duration-700 ${aboutAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
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
            <div className={`transition-all duration-700 delay-200 ${aboutAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <span className="inline-block rounded-full bg-[#E31B23]/10 px-4 py-2 text-sm font-bold uppercase tracking-widest text-[#E31B23]">{aboutContent.eyebrow}</span>
              <h2 className="mt-6 text-4xl font-extrabold text-gray-900 lg:text-5xl leading-tight">{aboutContent.title}</h2>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed">{aboutContent.description}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border-2 border-[#E31B23] p-6 transform hover:scale-[1.02] transition-transform duration-300">
                  <h3 className="font-bold text-[#E31B23] uppercase tracking-wider text-sm">Mission</h3>
                  <p className="mt-3 text-gray-700 font-medium">{aboutContent.mission}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-6 transform hover:scale-[1.02] transition-transform duration-300">
                  <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Vision</h3>
                  <p className="mt-3 text-gray-700 font-medium">{aboutContent.vision}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors with horizontal scroll */}
      <section ref={sectorsAnim.ref} className="bg-gray-50 px-6 py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className={`flex items-end justify-between transition-all duration-700 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-[#E31B23]">Sectors</span>
              <h2 className="mt-4 text-4xl font-extrabold text-gray-900">Our Areas of Impact</h2>
            </div>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, i) => (
              <div 
                key={i} 
                className={`group relative rounded-3xl bg-white p-8 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl overflow-hidden ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#E31B23] to-[#FF6B6B] transform origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E31B23]/10 text-2xl font-bold text-[#E31B23] group-hover:bg-[#E31B23] group-hover:text-white transition-all duration-300">
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
      <section ref={journeyAnim.ref} className="bg-[#E31B23] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-extrabold text-white">Volunteer Journey</h2>
            <p className="mt-4 text-xl text-white/70">Your path from applicant to changemaker</p>
          </div>
          <div className="mt-16 relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/20 hidden lg:block" />
            <div className="grid gap-8 lg:grid-cols-4">
              {journeySteps.map((step, i) => (
                <div 
                  key={i} 
                  className={`relative transition-all duration-500 hover:scale-105 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
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
      <section ref={activitiesAnim.ref} className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center mb-16 transition-all duration-700 ${activitiesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-sm font-bold uppercase tracking-widest text-[#E31B23]">What We Do</span>
            <h2 className="mt-4 text-4xl font-extrabold text-gray-900">Our Activities</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {activities.map((activity, i) => (
              <div 
                key={i} 
                className={`rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 p-8 transition-all duration-500 hover:shadow-xl ${activitiesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
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
      <section ref={projectAnim.ref} className="relative min-h-[80vh] flex items-center px-6 py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/alokdhara.jpg" alt="Project Alokdhara" fill className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/60" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl w-full">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className={`transition-all duration-700 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
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
                className="mt-10 inline-flex rounded-full bg-[#E31B23] px-10 py-5 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:bg-[#c4161f] hover:scale-105"
              >
                {projectAlokdhara.ctaLabel}
              </Link>
            </div>
            <div className={`grid grid-cols-2 gap-4 transition-all duration-700 delay-200 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              {[
                { label: 'Children Served', value: '180+/week' },
                { label: 'Volunteer Squads', value: '4 Active' },
                { label: 'Meals Provided', value: '2x Weekly' },
                { label: 'Learning Hours', value: '12 hrs/week' },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <p className="text-3xl font-extrabold text-white">{item.value}</p>
                  <p className="mt-2 text-sm font-medium uppercase tracking-wider text-[#E31B23]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section ref={noticesAnim.ref} className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className={`text-3xl font-extrabold text-gray-900 transition-all duration-700 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>Latest Notices</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {notices.map((notice, i) => (
              <div 
                key={i} 
                className={`rounded-3xl bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E31B23]/10 text-sm font-bold text-[#E31B23]">{i + 1}</span>
                <h3 className="mt-4 text-xl font-bold text-gray-900">{notice.title}</h3>
                <p className="mt-3 text-gray-600">{notice.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section ref={joinAnim.ref} id="join" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[40px] bg-gradient-to-br from-[#E31B23] to-[#8B0000] p-12 lg:p-20">
            <div className={`text-center transition-all duration-700 ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl font-extrabold text-white lg:text-5xl">Ready to Make a Difference?</h2>
              <p className="mt-4 text-xl text-white/80">Join thousands of volunteers creating positive change</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {joinOptions.map((option, i) => (
                <div 
                  key={i} 
                  className={`rounded-3xl bg-white/10 p-8 backdrop-blur-sm transition-all duration-500 hover:bg-white/20 hover:scale-105 ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
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
              <div key={i} className="rounded-2xl bg-white px-8 py-4 text-sm font-bold text-gray-700 shadow hover:shadow-lg hover:text-[#E31B23] transition-all duration-300 hover:scale-105">
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
                <Link href="#" className="hover:text-white transition-colors duration-300">Home</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">About</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">Sectors</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">Join Us</Link>
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
