/* Theme: Ocean Blue - Navy, Sky Blue, White - Professional & Trustworthy */
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

export default function OceanTheme() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Animation refs for different sections
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
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a365d]/95 backdrop-blur-md shadow-lg transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#" className="flex items-center gap-3 group">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-2 ring-[#63b3ed] transition-transform duration-300 group-hover:scale-110">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <span className="text-lg font-bold text-white">ASAD</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" className="text-sm font-semibold text-white/80 hover:text-[#63b3ed] transition-colors duration-300">{item}</Link>
              ))}
              <Link href="#join" className="rounded-lg bg-[#63b3ed] px-6 py-2.5 text-sm font-bold text-[#1a365d] hover:bg-white transition-all duration-300 hover:scale-105">Join Us</Link>
            </div>
            {/* Mobile burger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`md:hidden bg-[#1a365d] border-t border-white/10 overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-96 py-4' : 'max-h-0'}`}>
          <div className="flex flex-col gap-4 px-6">
            {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item, i) => (
              <Link 
                key={item} 
                href="#" 
                onClick={() => setMobileMenuOpen(false)} 
                className="text-base font-semibold text-white/80 hover:text-[#63b3ed] transition-all duration-300"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {item}
              </Link>
            ))}
            <Link href="#join" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#63b3ed] px-6 py-3 text-center text-sm font-bold text-[#1a365d] transition-all duration-300">Join Us</Link>
          </div>
        </div>
      </nav>

      {/* Hero with Full Banner Background */}
      <section ref={heroAnim.ref} className="relative min-h-[85vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/banner.jpg"
            alt="ASAD volunteers"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d]/95 via-[#2c5282]/90 to-[#1a365d]/85" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <span className={`inline-block rounded-full bg-[#63b3ed]/20 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-[#63b3ed] backdrop-blur-sm transition-all duration-700 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Amar Somoy Amar Desh
            </span>
            <h1 className={`mt-6 text-5xl font-extrabold leading-tight text-white md:text-6xl lg:text-7xl transition-all duration-700 delay-100 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {heroContent.title}
            </h1>
            <p className={`mt-6 max-w-2xl text-xl leading-relaxed text-white/90 transition-all duration-700 delay-200 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {heroContent.description}
            </p>
            <div className={`mt-10 flex flex-wrap gap-4 transition-all duration-700 delay-300 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link
                href={heroContent.primaryAction.href}
                className="rounded-lg bg-[#63b3ed] px-8 py-4 text-lg font-bold text-[#1a365d] shadow-xl transition-all duration-300 hover:bg-white hover:shadow-2xl hover:scale-105"
              >
                {heroContent.primaryAction.label}
              </Link>
              <Link
                href={heroContent.secondaryAction.href}
                className="rounded-lg border-2 border-[#63b3ed] px-8 py-4 text-lg font-bold text-white transition-all duration-300 hover:bg-[#63b3ed]/20"
              >
                {heroContent.secondaryAction.label}
              </Link>
            </div>
          </div>
        </div>
        {/* Floating Stats */}
        <div ref={statsAnim.ref} className="absolute bottom-0 left-0 right-0 z-20">
          <div className="mx-auto max-w-6xl px-6 translate-y-1/2">
            <div className="grid gap-4 md:grid-cols-3">
              {stats.map((stat, i) => (
                <div 
                  key={i} 
                  className={`rounded-2xl bg-white p-6 text-center shadow-2xl transition-all duration-500 hover:scale-105 ${statsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <p className="text-4xl font-extrabold text-[#1a365d]">{stat.value}</p>
                  <p className="mt-2 text-sm font-medium uppercase tracking-wider text-[#63b3ed]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section ref={aboutAnim.ref} className="bg-gradient-to-b from-gray-50 to-white px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-2">
            <div className={`transition-all duration-700 ${aboutAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <span className="text-sm font-bold uppercase tracking-widest text-[#63b3ed]">{aboutContent.eyebrow}</span>
              <h2 className="mt-4 text-4xl font-extrabold text-[#1a365d] lg:text-5xl">{aboutContent.title}</h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-600">{aboutContent.description}</p>
              <div className="mt-8 space-y-4">
                {aboutContent.paragraphs.map((p, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed">{p}</p>
                ))}
              </div>
              <Link href={aboutContent.learnMore.href} className="mt-8 inline-flex items-center gap-2 text-lg font-bold text-[#1a365d] hover:text-[#63b3ed] transition-colors duration-300">
                {aboutContent.learnMore.label}
              </Link>
            </div>
            <div className={`grid gap-6 transition-all duration-700 delay-200 ${aboutAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <div className="rounded-3xl bg-gradient-to-br from-[#1a365d] to-[#2c5282] p-8 text-white shadow-xl transform hover:scale-[1.02] transition-transform duration-300">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#63b3ed]">Our Mission</h3>
                <p className="mt-4 text-xl font-semibold leading-relaxed">{aboutContent.mission}</p>
              </div>
              <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-[#1a365d]/10 transform hover:scale-[1.02] transition-transform duration-300">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#1a365d]">Our Vision</h3>
                <p className="mt-4 text-xl font-semibold leading-relaxed text-gray-800">{aboutContent.vision}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors Grid */}
      <section ref={sectorsAnim.ref} className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-sm font-bold uppercase tracking-widest text-[#63b3ed]">Our Sectors</span>
            <h2 className="mt-4 text-4xl font-extrabold text-[#1a365d]">Seven sectors driving national impact</h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, i) => (
              <div 
                key={i} 
                className={`group rounded-2xl bg-white p-6 shadow-md border-2 border-transparent hover:border-[#1a365d] hover:shadow-xl hover:scale-105 transition-all duration-300 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a365d] text-xl font-bold text-white">
                  {sector.name.charAt(0)}
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#1a365d]">{sector.name}</h3>
                <p className="mt-2 text-gray-600">{sector.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Volunteer Journey */}
      <section ref={journeyAnim.ref} className="bg-gradient-to-br from-[#1a365d] via-[#2c5282] to-[#1a365d] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-extrabold text-white">Your Journey With Us</h2>
            <p className="mt-4 text-xl text-[#63b3ed]">Four steps to becoming an official ASAD volunteer</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {journeySteps.map((step, i) => (
              <div 
                key={i} 
                className={`rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/20 transition-all duration-500 hover:bg-white/20 hover:scale-105 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#63b3ed] text-lg font-bold text-[#1a365d]">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-white/80">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activities */}
      <section ref={activitiesAnim.ref} className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${activitiesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-sm font-bold uppercase tracking-widest text-[#63b3ed]">Activities</span>
            <h2 className="mt-4 text-4xl font-extrabold text-[#1a365d]">What We Do</h2>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {activities.map((activity, i) => (
              <div 
                key={i} 
                className={`rounded-2xl border-2 border-[#1a365d]/10 p-8 transition-all duration-500 hover:border-[#63b3ed] hover:shadow-xl ${activitiesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <h3 className="text-xl font-bold text-[#1a365d]">{activity.title}</h3>
                <ul className="mt-4 space-y-3">
                  {activity.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-3 text-gray-600">
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#63b3ed]" />
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
      <section ref={projectAnim.ref} className="relative overflow-hidden min-h-[80vh] flex items-center px-6 py-24">
        <div className="absolute inset-0">
          <Image src="/alokdhara.jpg" alt="Project Alokdhara" fill className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a365d]/95 via-[#1a365d]/85 to-[#1a365d]/70" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className={`transition-all duration-700 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <span className="text-sm font-bold uppercase tracking-widest text-[#63b3ed]">Featured Project</span>
              <h2 className="mt-4 text-4xl font-extrabold text-white lg:text-5xl">{projectAlokdhara.title}</h2>
              <p className="mt-6 text-xl text-gray-300">{projectAlokdhara.summary}</p>
              <ul className="mt-8 space-y-4">
                {projectAlokdhara.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#63b3ed]" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href={projectAlokdhara.ctaHref}
                className="mt-8 inline-flex rounded-lg bg-[#63b3ed] px-8 py-4 text-lg font-bold text-[#1a365d] shadow-xl transition-all duration-300 hover:bg-white hover:scale-105"
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
                  <p className="mt-2 text-sm font-medium uppercase tracking-wider text-[#63b3ed]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section ref={noticesAnim.ref} className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className={`text-3xl font-extrabold text-[#1a365d] transition-all duration-700 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>Latest Notices</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {notices.map((notice, i) => (
              <div 
                key={i} 
                className={`rounded-2xl bg-white p-6 shadow-lg transition-all duration-500 hover:shadow-xl hover:scale-105 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#1a365d] to-[#63b3ed]" />
                <h3 className="mt-4 text-lg font-bold text-[#1a365d]">{notice.title}</h3>
                <p className="mt-2 text-gray-600">{notice.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section ref={joinAnim.ref} id="join" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-extrabold text-[#1a365d]">Join Our Movement</h2>
            <p className="mt-4 text-xl text-gray-600">Multiple ways to contribute and make a difference</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {joinOptions.map((option, i) => (
              <div 
                key={i} 
                className={`rounded-2xl bg-gray-50 p-8 transition-all duration-500 hover:shadow-xl hover:bg-gradient-to-br hover:from-[#1a365d] hover:to-[#2c5282] group ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <h3 className="text-xl font-bold text-[#1a365d] group-hover:text-white transition-colors duration-300">{option.title}</h3>
                <p className="mt-3 text-gray-600 group-hover:text-white/80 transition-colors duration-300">{option.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-[#1a365d]/5 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-[#1a365d]/60">Our Partners</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
            {partners.map((partner, i) => (
              <div key={i} className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1a365d] shadow hover:shadow-lg transition-all duration-300 hover:scale-105">
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a365d] px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-2xl font-extrabold">Amar Somoy Amar Desh</h3>
              <p className="mt-4 text-gray-400">A youth-led volunteer movement empowering students across Bangladesh through service, education, and leadership.</p>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-[#63b3ed]">Quick Links</h4>
              <div className="mt-4 flex flex-col gap-2 text-gray-400">
                <Link href="#" className="hover:text-[#63b3ed] transition-colors duration-300">Home</Link>
                <Link href="#" className="hover:text-[#63b3ed] transition-colors duration-300">About Us</Link>
                <Link href="#" className="hover:text-[#63b3ed] transition-colors duration-300">Activities</Link>
                <Link href="#" className="hover:text-[#63b3ed] transition-colors duration-300">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-[#63b3ed]">Contact</h4>
              <div className="mt-4 space-y-2 text-gray-400">
                <p>Official FB: Asadian Asad</p>
                <p>Email: hello@asadofficial.org</p>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Amar Somoy Amar Desh. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
