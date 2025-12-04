/* Theme 4: Royal Purple - Distinguished, elegant, prestigious */
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

export default function RoyalTheme() {
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
    <div className="min-h-screen bg-[#FAF9FC]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#2D1B4E] transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#" className="flex items-center gap-4 group">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-[#D4AF37] transition-transform duration-300 group-hover:scale-110">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <span className="text-xl font-bold text-white italic">Amar Somoy Amar Desh</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" className="text-sm font-medium text-white/70 hover:text-[#D4AF37] transition-colors duration-300" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{item}</Link>
              ))}
              <Link href="#join" className="bg-[#D4AF37] px-8 py-3 text-sm font-bold text-[#2D1B4E] hover:bg-[#E5C349] transition-all duration-300 hover:scale-105" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Join Us</Link>
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
        <div className={`md:hidden bg-[#2D1B4E] border-t border-white/10 overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-96 py-4' : 'max-h-0'}`}>
          <div className="flex flex-col gap-4 px-6">
            {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
              <Link key={item} href="#" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-white/70 hover:text-[#D4AF37] transition-colors duration-300" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{item}</Link>
            ))}
            <Link href="#join" onClick={() => setMobileMenuOpen(false)} className="bg-[#D4AF37] px-8 py-3 text-center text-sm font-bold text-[#2D1B4E] hover:bg-[#E5C349] transition-all duration-300" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Join Us</Link>
          </div>
        </div>
      </nav>

      {/* Hero with Full Banner Background */}
      <section ref={heroAnim.ref} className="relative min-h-[92vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/banner.jpg"
            alt="ASAD volunteers"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#6B4C9A]/95 via-[#4A3A6B]/90 to-[#2D1B4E]/95" />
        </div>
        {/* Decorative patterns */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className={`inline-flex items-center gap-4 transition-all duration-700 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="h-px w-12 bg-[#D4AF37]" />
              <span className="text-sm font-medium tracking-[0.3em] text-[#D4AF37] uppercase" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Est. 2020</span>
              <span className="h-px w-12 bg-[#D4AF37]" />
            </div>
            <h1 className={`mt-8 text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl italic transition-all duration-700 delay-100 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {heroContent.title}
            </h1>
            <p className={`mt-8 text-xl leading-relaxed text-white/80 max-w-3xl mx-auto transition-all duration-700 delay-200 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
              {heroContent.description}
            </p>
            <div className={`mt-12 flex flex-wrap justify-center gap-6 transition-all duration-700 delay-300 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link
                href={heroContent.primaryAction.href}
                className="rounded-none bg-[#D4AF37] px-12 py-5 text-sm font-bold uppercase tracking-[0.2em] text-[#2D1B4E] shadow-2xl transition-all duration-300 hover:bg-[#E5C349] hover:scale-105"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {heroContent.primaryAction.label}
              </Link>
              <Link
                href={heroContent.secondaryAction.href}
                className="rounded-none border-2 border-white/50 px-12 py-5 text-sm font-bold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-white hover:bg-white/10"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {heroContent.secondaryAction.label}
              </Link>
            </div>
          </div>
        </div>
        
        {/* Bottom Stats Bar */}
        <div ref={statsAnim.ref} className="absolute bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="grid grid-cols-3 divide-x divide-white/20">
              {stats.map((stat, i) => (
                <div 
                  key={i} 
                  className={`text-center px-4 transition-all duration-500 ${statsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <p className="text-4xl font-bold text-[#D4AF37]">{stat.value}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-white/70" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section ref={aboutAnim.ref} className="px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-20 lg:grid-cols-2">
            <div className={`transition-all duration-700 ${aboutAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#6B4C9A]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{aboutContent.eyebrow}</span>
              <h2 className="mt-6 text-4xl font-bold text-gray-900 lg:text-5xl italic leading-tight">{aboutContent.title}</h2>
              <p className="mt-8 text-lg text-gray-600 leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{aboutContent.description}</p>
              <div className="mt-10 border-l-4 border-[#6B4C9A] pl-8">
                {aboutContent.paragraphs.map((p, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{p}</p>
                ))}
              </div>
            </div>
            <div className={`space-y-8 transition-all duration-700 delay-200 ${aboutAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <div className="relative p-10 bg-[#6B4C9A] transform hover:scale-[1.02] transition-transform duration-300">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#D4AF37]" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#D4AF37]" />
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-[#D4AF37]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Our Mission</h3>
                <p className="mt-4 text-xl text-white leading-relaxed italic">{aboutContent.mission}</p>
              </div>
              <div className="relative p-10 bg-white shadow-xl transform hover:scale-[1.02] transition-transform duration-300">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#6B4C9A]" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#6B4C9A]" />
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-[#6B4C9A]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Our Vision</h3>
                <p className="mt-4 text-xl text-gray-800 leading-relaxed italic">{aboutContent.vision}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section ref={sectorsAnim.ref} className="bg-[#2D1B4E] px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#D4AF37]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Excellence in Service</span>
            <h2 className="mt-4 text-4xl font-bold text-white italic">Our Seven Pillars</h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, i) => (
              <div 
                key={i} 
                className={`group relative bg-white/5 p-8 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-500 hover:scale-105 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="absolute top-4 right-4 text-6xl font-bold text-white/5">0{i + 1}</span>
                <h3 className="text-xl font-bold text-[#D4AF37] italic">{sector.name}</h3>
                <p className="mt-4 text-white/70" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{sector.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section ref={journeyAnim.ref} className="bg-white px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#6B4C9A]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>The Path Forward</span>
            <h2 className="mt-4 text-4xl font-bold text-gray-900 italic">Your Journey With Us</h2>
          </div>
          <div className="mt-20 relative">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-[#6B4C9A]/20 hidden lg:block" />
            <div className="grid gap-10 lg:grid-cols-4">
              {journeySteps.map((step, i) => (
                <div 
                  key={i} 
                  className={`text-center relative transition-all duration-500 hover:scale-105 ${journeyAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                  style={{ transitionDelay: `${i * 150}ms` }}
                >
                  <div className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center bg-[#6B4C9A] text-2xl font-bold text-[#D4AF37]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-gray-900 italic">{step.title}</h3>
                  <p className="mt-3 text-gray-600" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Activities */}
      <section ref={activitiesAnim.ref} className="bg-[#FAF9FC] px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center mb-16 transition-all duration-700 ${activitiesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#6B4C9A]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>What We Accomplish</span>
            <h2 className="mt-4 text-4xl font-bold text-gray-900 italic">Activities & Initiatives</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {activities.map((activity, i) => (
              <div 
                key={i} 
                className={`bg-white p-10 shadow-xl border-t-4 border-[#6B4C9A] transition-all duration-500 hover:shadow-2xl ${activitiesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <h3 className="text-xl font-bold text-gray-900 italic">{activity.title}</h3>
                <ul className="mt-6 space-y-4">
                  {activity.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-4" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                      <span className="mt-1.5 h-2 w-2 bg-[#D4AF37]" />
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
      <section ref={projectAnim.ref} className="relative min-h-[80vh] flex items-center px-6 py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/alokdhara.jpg" alt="Project Alokdhara" fill className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2D1B4E]/95 via-[#2D1B4E]/90 to-[#2D1B4E]/70" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-700 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
              <div className="inline-flex items-center gap-4">
                <span className="h-px w-8 bg-[#D4AF37]" />
                <span className="text-sm font-medium uppercase tracking-[0.3em] text-[#D4AF37]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Signature Initiative</span>
              </div>
              <h2 className="mt-6 text-5xl font-bold text-white italic lg:text-6xl">{projectAlokdhara.title}</h2>
              <p className="mt-8 text-xl text-white/80 leading-relaxed" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{projectAlokdhara.summary}</p>
              <ul className="mt-10 space-y-4">
                {projectAlokdhara.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-4 text-white/80" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                    <span className="mt-2 h-2 w-2 bg-[#D4AF37]" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href={projectAlokdhara.ctaHref}
                className="mt-10 inline-flex bg-[#D4AF37] px-12 py-5 text-sm font-bold uppercase tracking-[0.2em] text-[#2D1B4E] transition-all duration-300 hover:bg-[#E5C349] hover:scale-105"
                style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {projectAlokdhara.ctaLabel}
              </Link>
            </div>
            <div className={`grid grid-cols-2 gap-6 transition-all duration-700 delay-200 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              {[
                { label: 'Children Served', value: '180+' },
                { label: 'Active Squads', value: '4' },
                { label: 'Weekly Meals', value: '2x' },
                { label: 'Learning Hours', value: '12' },
              ].map((item, i) => (
                <div key={i} className="border border-white/20 p-8 text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                  <p className="text-4xl font-bold text-[#D4AF37]">{item.value}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/60" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section ref={noticesAnim.ref} className="bg-white px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <h2 className={`text-3xl font-bold text-gray-900 italic transition-all duration-700 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>Latest Announcements</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {notices.map((notice, i) => (
              <div 
                key={i} 
                className={`border-l-4 border-[#6B4C9A] bg-[#FAF9FC] p-8 transition-all duration-500 hover:shadow-lg hover:scale-105 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B4C9A]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Notice #{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold text-gray-900 italic">{notice.title}</h3>
                <p className="mt-3 text-gray-600" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{notice.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section ref={joinAnim.ref} id="join" className="bg-[#6B4C9A] px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-700 ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl font-bold text-white italic lg:text-5xl">Become Part of Our Legacy</h2>
            <p className="mt-4 text-xl text-white/70" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Choose your path to excellence</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {joinOptions.map((option, i) => (
              <div 
                key={i} 
                className={`bg-white/10 backdrop-blur-sm p-10 border border-white/20 transition-all duration-500 hover:bg-white/20 hover:scale-105 ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <h3 className="text-xl font-bold text-[#D4AF37] italic">{option.title}</h3>
                <p className="mt-4 text-white/70" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{option.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-[#FAF9FC] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold uppercase tracking-[0.3em] text-gray-500" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Distinguished Partners</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {partners.map((partner, i) => (
              <div key={i} className="bg-white px-8 py-4 text-sm font-bold text-gray-700 shadow-lg border-b-2 border-[#6B4C9A] hover:shadow-xl hover:text-[#6B4C9A] transition-all duration-300 hover:scale-105" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2D1B4E] px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-2xl font-bold italic">Amar Somoy Amar Desh</h3>
              <p className="mt-4 text-white/60" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Excellence through service. Leadership through action. Legacy through impact.</p>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-[0.3em] text-[#D4AF37] text-sm" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Navigate</h4>
              <div className="mt-6 flex flex-col gap-3 text-white/60" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                <Link href="#" className="hover:text-white transition-colors duration-300">Home</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">About</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">Sectors</Link>
                <Link href="#" className="hover:text-white transition-colors duration-300">Join</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-[0.3em] text-[#D4AF37] text-sm" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>Connect</h4>
              <div className="mt-6 space-y-3 text-white/60" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                <p>FB: Asadian Asad</p>
                <p>hello@asadofficial.org</p>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            © {new Date().getFullYear()} Amar Somoy Amar Desh. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
