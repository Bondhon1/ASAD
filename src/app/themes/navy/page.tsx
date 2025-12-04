/* Theme 6: Navy Classic - Professional, trustworthy, strong and reliable */
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

export default function NavyTheme() {
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
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#" className="flex items-center gap-3 group">
              <div className="relative h-11 w-11 overflow-hidden rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <span className="text-lg font-bold text-[#1E3A5F]">ASAD</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" className="text-sm font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300">{item}</Link>
              ))}
              <Link href="#join" className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-sm font-semibold text-white hover:bg-[#2a4d75] transition-all duration-300">Join Now</Link>
            </div>
            {/* Mobile burger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block h-0.5 w-6 bg-[#1E3A5F] transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-6 bg-[#1E3A5F] transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-6 bg-[#1E3A5F] transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`md:hidden bg-white border-t border-gray-100 overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-96 py-4' : 'max-h-0'}`}>
          <div className="flex flex-col gap-4 px-6">
            {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
              <Link key={item} href="#" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300">{item}</Link>
            ))}
            <Link href="#join" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-center text-sm font-semibold text-white transition-all duration-300">Join Now</Link>
          </div>
        </div>
      </nav>

      {/* Hero with Full Banner Background */}
      <section ref={heroAnim.ref} className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <Image
            src="/banner.jpg"
            alt="ASAD volunteers"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/95 via-[#2a4d75]/90 to-[#1E3A5F]/95" />
        </div>
        
        {/* Geometric patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 border-2 border-white transform rotate-45" />
          <div className="absolute bottom-40 right-20 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-24 h-24 border-2 border-white" />
        </div>
        
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
          <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-16 items-center">
            <div>
              <div className={`inline-flex items-center gap-3 rounded-lg bg-white/10 px-5 py-2.5 backdrop-blur-sm border border-white/20 transition-all duration-700 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#4A90D9] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A90D9]"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">Youth in Action</span>
              </div>
              <h1 className={`mt-10 text-5xl font-bold leading-[1.1] text-white md:text-6xl lg:text-7xl transition-all duration-700 delay-100 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {heroContent.title}
              </h1>
              <p className={`mt-8 text-xl leading-relaxed text-white/80 max-w-2xl transition-all duration-700 delay-200 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {heroContent.description}
              </p>
              <div className={`mt-10 flex flex-wrap gap-4 transition-all duration-700 delay-300 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <Link
                  href={heroContent.primaryAction.href}
                  className="group rounded-lg bg-white px-10 py-4 text-base font-semibold text-[#1E3A5F] shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    {heroContent.primaryAction.label}
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href={heroContent.secondaryAction.href}
                  className="rounded-lg border-2 border-white/50 px-10 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white"
                >
                  {heroContent.secondaryAction.label}
                </Link>
              </div>
            </div>
            <div ref={statsAnim.ref} className="hidden lg:block">
              <div className="relative">
                <div className="relative rounded-2xl bg-white/10 backdrop-blur-md p-8 border border-white/20">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#4A90D9] mb-6">Our Impact</h3>
                  <div className="space-y-6">
                    {stats.map((stat, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center gap-6 transition-all duration-500 ${statsAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
                        style={{ transitionDelay: `${i * 150}ms` }}
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#4A90D9] text-xl font-bold text-white">
                          {stat.value.replace('+', '')}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                          <p className="text-sm text-white/60">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Mobile Stats */}
      <section className="lg:hidden bg-[#1E3A5F] px-6 py-10">
        <div className="mx-auto max-w-7xl grid gap-4 grid-cols-3">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section ref={aboutAnim.ref} className="px-6 py-24 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <div className={`order-2 lg:order-1 transition-all duration-700 ${aboutAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <span className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">
                <span className="h-px w-8 bg-[#4A90D9]" />
                {aboutContent.eyebrow}
              </span>
              <h2 className="mt-6 text-4xl font-bold text-[#1E3A5F] lg:text-5xl leading-tight">{aboutContent.title}</h2>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed">{aboutContent.description}</p>
              <div className="mt-8 space-y-4">
                {aboutContent.paragraphs.map((p, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E3A5F] text-sm font-bold text-white">{i + 1}</span>
                    <p className="text-gray-600">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={`order-1 lg:order-2 space-y-6 transition-all duration-700 delay-200 ${aboutAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <div className="rounded-2xl bg-[#1E3A5F] p-10 text-white shadow-xl transform hover:scale-[1.02] transition-transform duration-300">
                <span className="inline-block rounded-lg bg-[#4A90D9] px-4 py-1.5 text-xs font-bold uppercase tracking-widest">Mission</span>
                <p className="mt-6 text-xl leading-relaxed text-white/90">{aboutContent.mission}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-10 border border-gray-200 transform hover:scale-[1.02] transition-transform duration-300">
                <span className="inline-block rounded-lg bg-[#1E3A5F]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#1E3A5F]">Vision</span>
                <p className="mt-6 text-xl leading-relaxed text-gray-700">{aboutContent.vision}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section ref={sectorsAnim.ref} className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">
              <span className="h-px w-8 bg-[#4A90D9]" />
              Impact Areas
              <span className="h-px w-8 bg-[#4A90D9]" />
            </span>
            <h2 className="mt-6 text-4xl font-bold text-[#1E3A5F]">Our Core Sectors</h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, i) => (
              <div 
                key={i} 
                className={`group rounded-2xl bg-white p-8 border border-gray-200 transition-all duration-500 hover:-translate-y-2 hover:border-[#1E3A5F] hover:shadow-xl ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F] text-lg font-bold text-white transition-all duration-300 group-hover:bg-[#4A90D9]">
                  {sector.name.charAt(0)}
                </div>
                <h3 className="mt-6 text-xl font-bold text-[#1E3A5F]">{sector.name}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{sector.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section ref={journeyAnim.ref} className="bg-white px-6 py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">Get Started</span>
            <h2 className="mt-4 text-4xl font-bold text-[#1E3A5F]">Your Volunteer Journey</h2>
          </div>
          <div className="mt-16 relative">
            <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1E3A5F] to-[#4A90D9] hidden lg:block" />
            <div className="grid gap-8 lg:grid-cols-4">
              {journeySteps.map((step, i) => (
                <div 
                  key={i} 
                  className={`relative text-center transition-all duration-500 hover:scale-105 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E3A5F] text-xl font-bold text-white shadow-lg">
                    {i + 1}
                  </div>
                  <div className="mt-8 rounded-2xl bg-gray-50 p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-[#1E3A5F]">{step.title}</h3>
                    <p className="mt-3 text-sm text-gray-600">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Activities */}
      <section ref={activitiesAnim.ref} className="bg-[#1E3A5F] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center mb-16 transition-all duration-700 ${activitiesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-bold text-white">What We Do Together</h2>
            <p className="mt-4 text-xl text-white/70">Building communities through action</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {activities.map((activity, i) => (
              <div 
                key={i} 
                className={`rounded-2xl bg-white/10 backdrop-blur-sm p-8 border border-white/20 transition-all duration-500 hover:bg-white/15 hover:scale-105 ${activitiesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <h3 className="text-xl font-bold text-white">{activity.title}</h3>
                <ul className="mt-6 space-y-4">
                  {activity.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-[#4A90D9] flex-shrink-0" />
                      <span className="text-white/80">{point}</span>
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
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/95 via-[#1E3A5F]/90 to-[#1E3A5F]/70" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-700 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#4A90D9] px-5 py-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">Featured Project</span>
              </div>
              <h2 className="mt-8 text-5xl font-bold text-white lg:text-6xl">{projectAlokdhara.title}</h2>
              <p className="mt-6 text-xl text-white/80 leading-relaxed">{projectAlokdhara.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {projectAlokdhara.bullets.map((bullet, i) => (
                  <span key={i} className="rounded-lg bg-white/10 px-5 py-2.5 text-sm text-white backdrop-blur-sm border border-white/10">
                    {bullet}
                  </span>
                ))}
              </div>
              <Link
                href={projectAlokdhara.ctaHref}
                className="mt-10 inline-flex rounded-lg bg-white px-10 py-4 text-base font-semibold text-[#1E3A5F] shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
              >
                {projectAlokdhara.ctaLabel}
              </Link>
            </div>
            <div className={`grid grid-cols-2 gap-4 transition-all duration-700 delay-200 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              {[
                { label: 'Children/Week', value: '180+', icon: '👦' },
                { label: 'Volunteer Squads', value: '4', icon: '👥' },
                { label: 'Meals Served', value: '2x', icon: '🍱' },
                { label: 'Learning Hours', value: '12', icon: '📚' },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/10 backdrop-blur-md p-6 text-center border border-white/10 hover:bg-white/15 transition-all duration-300">
                  <span className="text-3xl">{item.icon}</span>
                  <p className="mt-3 text-3xl font-bold text-white">{item.value}</p>
                  <p className="mt-2 text-xs text-white/60 uppercase tracking-wider">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section ref={noticesAnim.ref} className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`flex items-center gap-4 transition-all duration-700 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="h-px w-12 bg-[#1E3A5F]" />
            <h2 className="text-3xl font-bold text-[#1E3A5F]">Latest Updates</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {notices.map((notice, i) => (
              <div 
                key={i} 
                className={`group rounded-2xl bg-gray-50 p-8 border border-gray-200 transition-all duration-500 hover:bg-[#1E3A5F] hover:border-[#1E3A5F] hover:shadow-xl hover:scale-105 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1E3A5F]/10 text-sm font-bold text-[#1E3A5F] group-hover:bg-white/20 group-hover:text-white transition-all duration-300">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold text-[#1E3A5F] group-hover:text-white transition-colors duration-300">{notice.title}</h3>
                <p className="mt-3 text-gray-600 group-hover:text-white/80 transition-colors duration-300">{notice.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section ref={joinAnim.ref} id="join" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-bold text-[#1E3A5F] lg:text-5xl">Ready to Serve?</h2>
            <p className="mt-4 text-xl text-gray-600">Join thousands creating positive change</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {joinOptions.map((option, i) => (
              <div 
                key={i} 
                className={`rounded-2xl bg-white p-10 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-500 hover:scale-105 ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F] text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-6 text-xl font-bold text-[#1E3A5F]">{option.title}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{option.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Trusted Partners</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            {partners.map((partner, i) => (
              <div key={i} className="rounded-lg bg-gray-50 px-8 py-4 text-sm font-semibold text-gray-600 border border-gray-200 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-all duration-300 hover:scale-105">
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-2xl font-bold">ASAD</h3>
              <p className="mt-1 text-[#4A90D9] font-semibold">Amar Somoy Amar Desh</p>
              <p className="mt-4 text-white/60">Building a stronger Bangladesh through dedicated youth volunteerism.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">Explore</h4>
              <div className="mt-6 flex flex-col gap-3 text-white/60">
                <Link href="#" className="hover:text-white transition-colors duration-300">Home</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">About Us</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">Sectors</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">Join Us</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">Contact</h4>
              <div className="mt-6 space-y-3 text-white/60">
                <p>FB: Asadian Asad</p>
                <p>hello@asadofficial.org</p>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40">
            © {new Date().getFullYear()} Amar Somoy Amar Desh. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
