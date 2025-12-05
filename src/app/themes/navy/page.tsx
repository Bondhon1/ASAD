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
  const [activeSector, setActiveSector] = useState<{name: string; icon: string; summary: string; color: string; textDark?: boolean} | null>(null);

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
              {['Home', 'About', 'Sectors', 'Activities'].map((item) => (
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
            {['Home', 'About', 'Sectors', 'Activities'].map((item) => (
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

      {/* Sectors - Expandable Cards */}
      <section ref={sectorsAnim.ref} className="bg-gray-50 px-6 py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">
              <span className="h-px w-8 bg-[#4A90D9]" />
              Impact Areas
              <span className="h-px w-8 bg-[#4A90D9]" />
            </span>
            <h2 className="mt-6 text-4xl font-bold text-[#1E3A5F]">Our 7 Core Sectors</h2>
            <p className="mt-4 text-gray-600">Hover over each sector to learn more</p>
          </div>
          
          {/* Desktop: 7 cards in a row */}
          <div className="mt-16 hidden lg:flex justify-center items-center gap-3 px-4">
            {[
              { name: 'Education', icon: '📚', summary: 'Workshops, rural outreach, free classes, and study resources for under-resourced learners.', color: 'rgb(22, 52, 182)' },
              { name: 'Cultural', icon: '🎭', summary: 'Talent showcases, monthly live shows, Artistic Carnival, and creative mentorship.', color: 'rgb(255, 97, 0)' },
              { name: 'Photography', icon: '📷', summary: 'Weekly tutorials, exhibitions, event coverage, and Photo of the Week challenges.', color: 'rgb(0, 57, 112)' },
              { name: 'Charity', icon: '🤝', summary: 'Fundraisers, relief responses, and festival programs delivering healthcare, food, and clothing.', color: 'rgb(150, 45, 0)' },
              { name: 'Medical', icon: '⚕️', summary: 'Health camps, seminars, consultations, and essential medical supply distribution.', color: 'rgb(13, 207, 242)' },
              { name: 'Blood Bank', icon: '🩸', summary: 'Donor network, awareness drives, fulfillment reports, and Life Drop collaborations.', color: 'rgb(242, 43, 12)' },
              { name: 'Environment', icon: '🌱', summary: 'Tree planting, waste reduction, cleanliness campaigns, and eco workshops.', color: 'rgb(228, 255, 248)', textDark: true },
            ].map((sector, i) => (
              <div 
                key={i}
                className={`group relative flex-shrink-0 w-28 h-28 rounded-2xl shadow-lg cursor-pointer transition-all duration-500 ease-out hover:w-96 hover:shadow-2xl hover:z-10 overflow-hidden ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 80}ms`, backgroundColor: sector.color }}
              >
                {/* Square icon state */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 transition-all duration-300 group-hover:opacity-0">
                  <span className="text-4xl mb-2 drop-shadow-lg">{sector.icon}</span>
                  <span className={`text-xs font-bold text-center leading-tight drop-shadow-md ${sector.textDark ? 'text-[#1E3A5F]' : 'text-white'}`}>{sector.name}</span>
                </div>
                
                {/* Expanded state */}
                <div className="absolute inset-0 flex items-center px-6 py-4 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-150">
                  <div className="flex items-start gap-4 w-full">
                    <div className="flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <span className="text-3xl">{sector.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xl font-bold ${sector.textDark ? 'text-[#1E3A5F]' : 'text-white'}`}>{sector.name}</h3>
                      <p className={`mt-2 text-sm leading-relaxed ${sector.textDark ? 'text-gray-700' : 'text-white/90'}`}>{sector.summary}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: Grid layout with modal on tap */}
          <div className="mt-16 flex flex-wrap justify-center gap-4 lg:hidden">
            {[
              { name: 'Education', icon: '📚', summary: 'Workshops, rural outreach, free classes, and study resources for under-resourced learners.', color: 'rgb(22, 52, 182)' },
              { name: 'Cultural', icon: '🎭', summary: 'Talent showcases, monthly live shows, Artistic Carnival, and creative mentorship.', color: 'rgb(255, 97, 0)' },
              { name: 'Photography', icon: '📷', summary: 'Weekly tutorials, exhibitions, event coverage, and Photo of the Week challenges.', color: 'rgb(0, 57, 112)' },
              { name: 'Charity', icon: '🤝', summary: 'Fundraisers, relief responses, and festival programs delivering healthcare, food, and clothing.', color: 'rgb(150, 45, 0)' },
              { name: 'Medical', icon: '⚕️', summary: 'Health camps, seminars, consultations, and essential medical supply distribution.', color: 'rgb(13, 207, 242)' },
              { name: 'Blood Bank', icon: '🩸', summary: 'Donor network, awareness drives, fulfillment reports, and Life Drop collaborations.', color: 'rgb(242, 43, 12)' },
              { name: 'Environment', icon: '🌱', summary: 'Tree planting, waste reduction, cleanliness campaigns, and eco workshops.', color: 'rgb(228, 255, 248)', textDark: true },
            ].map((sector, i) => (
              <button 
                key={i}
                onClick={() => setActiveSector(sector)}
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-lg flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-95 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 80}ms`, backgroundColor: sector.color }}
              >
                <span className="text-3xl mb-2 drop-shadow-lg">{sector.icon}</span>
                <span className={`text-xs font-bold text-center leading-tight drop-shadow-md ${sector.textDark ? 'text-[#1E3A5F]' : 'text-white'}`}>{sector.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Modal */}
        {activeSector && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setActiveSector(null)}
          >
            <div 
              className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200"
              style={{ backgroundColor: activeSector.color }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveSector(null)}
                className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${activeSector.textDark ? 'bg-gray-200 text-gray-800' : 'bg-white/20 text-white'}`}
              >
                ✕
              </button>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-5xl">{activeSector.icon}</span>
                </div>
                <h3 className={`text-2xl font-bold ${activeSector.textDark ? 'text-[#1E3A5F]' : 'text-white'}`}>{activeSector.name}</h3>
                <p className={`mt-4 text-base leading-relaxed ${activeSector.textDark ? 'text-gray-700' : 'text-white/90'}`}>{activeSector.summary}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Activities - What We Do Together */}
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

      {/* Journey - Your Volunteer Journey */}
      <section ref={journeyAnim.ref} className="bg-white px-6 py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">Get Started</span>
            <h2 className="mt-4 text-4xl font-bold text-[#1E3A5F]">Your Volunteer Journey</h2>
          </div>
          <div className="mt-16 relative">
            {/* Curved animated path - Desktop */}
            <svg className="absolute top-20 left-0 right-0 w-full h-32 hidden lg:block" viewBox="0 0 1200 120" fill="none" preserveAspectRatio="none">
              <path 
                d="M0,60 C150,120 300,0 450,60 C600,120 750,0 900,60 C1050,120 1200,60 1200,60" 
                stroke="url(#journeyGradient)" 
                strokeWidth="3" 
                fill="none"
                strokeLinecap="round"
                className={`${journeyAnim.isInView ? 'animate-draw-path' : ''}`}
                style={{ 
                  strokeDasharray: 2000,
                  strokeDashoffset: journeyAnim.isInView ? 0 : 2000,
                  transition: 'stroke-dashoffset 2s ease-out'
                }}
              />
              <defs>
                <linearGradient id="journeyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1E3A5F" />
                  <stop offset="50%" stopColor="#4A90D9" />
                  <stop offset="100%" stopColor="#1E3A5F" />
                </linearGradient>
              </defs>
            </svg>
            <div className="grid gap-8 lg:grid-cols-4 relative z-10">
              {journeySteps.map((step, i) => (
                <div 
                  key={i} 
                  className={`relative text-center transition-all duration-500 hover:scale-105 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E3A5F] text-xl font-bold text-white shadow-lg ring-4 ring-white">
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

      {/* Project Alokdhara */}
      <section ref={projectAnim.ref} className="relative overflow-hidden min-h-[80vh] flex items-center px-6 py-24">
        <div className="absolute inset-0">
          <Image src="/alokdhara.jpg" alt="Project Alokdhara" fill className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/95 via-[#1E3A5F]/85 to-[#1E3A5F]/60" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className={`transition-all duration-700 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <span className="text-sm font-bold uppercase tracking-widest text-[#4A90D9]">Featured Project</span>
              <h2 className="mt-4 text-4xl font-extrabold text-white lg:text-5xl">{projectAlokdhara.title}</h2>
              <p className="mt-6 text-xl text-gray-300">{projectAlokdhara.summary}</p>
              <ul className="mt-8 space-y-4">
                {projectAlokdhara.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#4A90D9]" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href={projectAlokdhara.ctaHref}
                className="mt-8 inline-flex rounded-lg bg-[#4A90D9] px-8 py-4 text-lg font-bold text-white shadow-xl transition-all duration-300 hover:bg-[#3a7fc8] hover:scale-105"
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
                  <p className="mt-2 text-sm font-medium uppercase tracking-wider text-[#4A90D9]">{item.label}</p>
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

      {/* Donation Section */}
      <section className="bg-gradient-to-br from-[#4A90D9] to-[#1E3A5F] px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-8">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white lg:text-5xl">Support Our Mission</h2>
          <p className="mt-6 text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
            Your generous donation helps us continue our work in education, healthcare, and community development across Bangladesh.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="#donate"
              className="group rounded-xl bg-white px-10 py-4 text-lg font-bold text-[#1E3A5F] shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              <span className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Donate Now
              </span>
            </Link>
            <Link
              href="#monthly"
              className="rounded-xl border-2 border-white/50 px-10 py-4 text-lg font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white"
            >
              Become a Monthly Donor
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-xl mx-auto">
            {[{ amount: '৳500', desc: 'Feeds 5 children' }, { amount: '৳1000', desc: 'School supplies' }, { amount: '৳2500', desc: 'Monthly support' }].map((tier, i) => (
              <button
                key={i}
                className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
              >
                <p className="text-2xl font-bold text-white">{tier.amount}</p>
                <p className="mt-2 text-sm text-white/70">{tier.desc}</p>
              </button>
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
