/* Theme 6: Navy Classic - Professional, trustworthy, strong and reliable */
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
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

// Helper to clear all cached user data
const clearAllCaches = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('asad_user_profile_v1');
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('asad_user_profile_v2_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem('asad_session');
      localStorage.removeItem('userEmail');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (e) {
    console.error('Error clearing cache:', e);
  }
};
import { Footer } from '@/components/layout/Footer';

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
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSector, setActiveSector] = useState<{name: string; image: string; summary: string; color: string} | null>(null);
  const [currentEvent, setCurrentEvent] = useState(0);
  const [isEventHovered, setIsEventHovered] = useState(false);

  // Events data
  const events = [
    { title: 'Annual Volunteer Summit 2025', date: 'Jan 15, 2025', location: 'Dhaka Convention Center', image: '/banner.jpg', desc: 'Join 500+ volunteers for our biggest gathering of the year featuring workshops, networking, and celebration of impact.' },
    { title: 'Blood Donation Camp', date: 'Dec 20, 2024', location: 'ASAD HQ, Mirpur', image: '/alokdhara.jpg', desc: 'Monthly blood donation drive in collaboration with local hospitals. Save lives, donate blood!' },
    { title: 'Project Alokdhara Graduation', date: 'Dec 28, 2024', location: 'Community Center, Kamrangirchar', image: '/banner.jpg', desc: 'Celebrating the achievements of 50 children completing their educational milestones.' },
    { title: 'Winter Clothing Distribution', date: 'Jan 5, 2025', location: 'Various Locations', image: '/alokdhara.jpg', desc: 'Distributing warm clothes to underprivileged families across rural Bangladesh.' },
  ];

  // Auto-rotate events (paused on hover)
  useEffect(() => {
    if (isEventHovered) return;
    const interval = setInterval(() => {
      setCurrentEvent((prev) => (prev + 1) % events.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [events.length, isEventHovered]);

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

  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#home" className="flex items-center gap-3 group">
              <div className="relative h-11 w-11 overflow-hidden rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <span className="text-lg font-bold text-[#1E3A5F]">ASAD</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Home', href: '#home' },
                { label: 'About', href: '/about' },
                { label: 'Sectors', href: '/sectors' },
                { label: 'Activities', href: '#activities' },
                { label: 'Contact Us', href: 'https://www.facebook.com/share/1J4n1fVsW8/?mibextid=wwXIfr' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="text-sm font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300" {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.label}</Link>
              ))}
              {status === 'authenticated' ? (
                <div className="flex items-center gap-3">
                  <Link href="/dashboard" className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-[#1E3A5F] shadow-xl transition-all duration-300 hover:shadow-2xl">View Dashboard</Link>
                  <button onClick={() => { clearAllCaches(); signOut({ callbackUrl: '/' }); }} className="rounded-lg bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-[#0b2140] border border-[#0b2140]">Logout</button>
                </div>
              ) : (
                <Link href="/auth" className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-sm font-semibold text-white hover:bg-[#2a4d75] transition-all duration-300">Join Now</Link>
              )}
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
            {[
              { label: 'Home', href: '#home' },
              { label: 'About', href: '/about' },
              { label: 'Sectors', href: '/sectors' },
              { label: 'Activities', href: '#activities' },
              { label: 'Contact Us', href: 'https://www.facebook.com/share/1J4n1fVsW8/?mibextid=wwXIfr' },
            ].map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300" {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.label}</Link>
            ))}
            {status === 'authenticated' ? (
              <div className="flex gap-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1E3A5F]">View Dashboard</Link>
                <button onClick={() => { setMobileMenuOpen(false); clearAllCaches(); signOut({ callbackUrl: '/' }); }} className="rounded-lg bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-[#0b2140] border border-[#0b2140]">Logout</button>
              </div>
            ) : (
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-center text-sm font-semibold text-white transition-all duration-300">Join Now</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero with Full Banner Background */}
      <section id="home" ref={heroAnim.ref} className="relative min-h-screen flex items-center overflow-hidden pt-20">
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
              <div className={`mt-10 flex flex-nowrap items-center gap-3 transition-all duration-700 delay-300 ${heroAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <Link
                  href={heroContent.primaryAction.href}
                  className="group rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#1E3A5F] shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 md:px-8 md:py-4 md:text-base"
                >
                  <span className="flex items-center gap-2">
                    {heroContent.primaryAction.label}
                    <svg className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="#donate"
                  className="rounded-lg border-2 border-white/50 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white flex items-center gap-2 whitespace-nowrap md:px-8 md:py-4 md:text-base"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Donate
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
      <section id="about" ref={aboutAnim.ref} className="px-6 py-24 bg-white">
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
      <section id="sectors" ref={sectorsAnim.ref} className="bg-gray-50 px-6 py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className={`text-center transition-all duration-1000 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
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
              { name: 'Cultural', image: '/sectors/cultural.png', summary: 'Talent showcases, monthly live shows, Artistic Carnival, and creative mentorship.', color: '#ffb380' },
              { name: 'Photography', image: '/sectors/photography.png', summary: 'Weekly tutorials, exhibitions, event coverage, and Photo of the Week challenges.', color: '#6ba3d9' },
              { name: 'Blood Bank', image: '/sectors/blood.png', summary: 'Donor network, awareness drives, fulfillment reports, and Life Drop collaborations.', color: '#ff7b7b' },
              { name: 'Environment', image: '/sectors/nature.png', summary: 'Tree planting, waste reduction, cleanliness campaigns, and eco workshops.', color: '#5bc97c' },
              { name: 'Education', image: '/sectors/education.png', summary: 'Workshops, rural outreach, free classes, and study resources for under-resourced learners.', color: '#b57edc' },
              { name: 'Charity', image: '/sectors/charity.png', summary: 'Fundraisers, relief responses, and festival programs delivering healthcare, food, and clothing.', color: '#ff6b6b' },
              { name: 'Medical', image: '/sectors/medical.png', summary: 'Health camps, seminars, consultations, and essential medical supply distribution.', color: '#4db8c9' },
            ].map((sector, i) => (
              <div 
                key={i}
                className={`group relative flex-shrink-0 w-28 h-28 rounded-2xl shadow-lg cursor-pointer transition-all duration-700 ease-out hover:w-96 hover:shadow-2xl hover:z-10 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0 rotate-0' : 'opacity-0 translate-y-16 -rotate-6'}`}
                style={{ 
                  transitionDelay: `${i * 100}ms`,
                  border: '3px solid',
                  borderColor: sector.color,
                  animation: `borderPulse-${i} 4s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                  '--border-color': sector.color
                } as React.CSSProperties}
              >
                <style>{`
                  @keyframes borderPulse-${i} {
                    0%, 100% { border-width: 3px; box-shadow: 0 0 0 rgba(${parseInt(sector.color.slice(1,3), 16)}, ${parseInt(sector.color.slice(3,5), 16)}, ${parseInt(sector.color.slice(5,7), 16)}, 0); }
                    50% { border-width: 3.5px; box-shadow: 0 0 12px rgba(${parseInt(sector.color.slice(1,3), 16)}, ${parseInt(sector.color.slice(3,5), 16)}, ${parseInt(sector.color.slice(5,7), 16)}, 0.3); }
                  }
                `}</style>
                {/* Square image state */}
                <div className="absolute inset-0 p-2 transition-all duration-300 group-hover:opacity-0 group-hover:scale-110">
                  <div className="relative w-full h-full rounded-xl overflow-hidden">
                    <Image src={sector.image} alt={sector.name} fill className="object-contain p-2" />
                  </div>
                </div>
                
                {/* Expanded state */}
                <div className="absolute inset-0 flex items-center px-6 py-4 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200">
                  <div className="flex items-start gap-4 w-full">
                    <div className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden" style={{ border: `2px solid ${sector.color}` }}>
                      <Image src={sector.image} alt={sector.name} fill className="object-contain p-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold" style={{ color: sector.color }}>{sector.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-700">{sector.summary}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: Grid layout with modal on tap */}
          <div className="mt-16 flex flex-wrap justify-center gap-4 lg:hidden">
            {[
              { name: 'Cultural', image: '/sectors/cultural.png', summary: 'Talent showcases, monthly live shows, Artistic Carnival, and creative mentorship.', color: '#ffb380' },
              { name: 'Photography', image: '/sectors/photography.png', summary: 'Weekly tutorials, exhibitions, event coverage, and Photo of the Week challenges.', color: '#6ba3d9' },
              { name: 'Blood Bank', image: '/sectors/blood.png', summary: 'Donor network, awareness drives, fulfillment reports, and Life Drop collaborations.', color: '#ff7b7b' },
              { name: 'Environment', image: '/sectors/nature.png', summary: 'Tree planting, waste reduction, cleanliness campaigns, and eco workshops.', color: '#5bc97c' },
              { name: 'Education', image: '/sectors/education.png', summary: 'Workshops, rural outreach, free classes, and study resources for under-resourced learners.', color: '#b57edc' },
              { name: 'Charity', image: '/sectors/charity.png', summary: 'Fundraisers, relief responses, and festival programs delivering healthcare, food, and clothing.', color: '#ff6b6b' },
              { name: 'Medical', image: '/sectors/medical.png', summary: 'Health camps, seminars, consultations, and essential medical supply distribution.', color: '#4db8c9' },
            ].map((sector, i) => (
              <button 
                key={i}
                onClick={() => setActiveSector(sector)}
                className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-lg p-3 transition-all duration-500 active:scale-95 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'}`}
                style={{ 
                  transitionDelay: `${i * 100}ms`,
                  border: '3px solid',
                  borderColor: sector.color,
                  animation: `borderPulseMobile-${i} 4s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                } as React.CSSProperties}
              >
                <style>{`
                  @keyframes borderPulseMobile-${i} {
                    0%, 100% { border-width: 3px; box-shadow: 0 0 0 rgba(${parseInt(sector.color.slice(1,3), 16)}, ${parseInt(sector.color.slice(3,5), 16)}, ${parseInt(sector.color.slice(5,7), 16)}, 0); }
                    50% { border-width: 3.5px; box-shadow: 0 0 12px rgba(${parseInt(sector.color.slice(1,3), 16)}, ${parseInt(sector.color.slice(3,5), 16)}, ${parseInt(sector.color.slice(5,7), 16)}, 0.3); }
                  }
                `}</style>
                <div className="relative w-full h-full">
                  <Image src={sector.image} alt={sector.name} fill className="object-contain" />
                </div>
              </button>
            ))}
          </div>

          {/* View Details Button */}
          <div className={`mt-12 text-center transition-all duration-700 delay-700 ${sectorsAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link 
              href="/sectors" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#1E3A5F] text-white font-semibold rounded-xl shadow-lg hover:bg-[#2a4d75] hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <span>View All Sectors</span>
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Mobile Modal */}
        {activeSector && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setActiveSector(null)}
          >
            <div 
              className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200 bg-gradient-to-br from-gray-50 to-gray-100"
              style={{ border: `4px solid ${activeSector.color}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveSector(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center transition-colors hover:bg-gray-300"
                style={{ color: activeSector.color }}
              >
                ✕
              </button>
              <div className="flex flex-col items-center text-center">
                <div className="relative w-32 h-32 rounded-2xl mb-6 overflow-hidden" style={{ border: `3px solid ${activeSector.color}` }}>
                  <Image src={activeSector.image} alt={activeSector.name} fill className="object-contain p-4" />
                </div>
                <h3 className="text-2xl font-bold" style={{ color: activeSector.color }}>{activeSector.name}</h3>
                <p className="mt-4 text-base leading-relaxed text-gray-700">{activeSector.summary}</p>
                <Link 
                  href="/sectors" 
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-300 hover:shadow-lg"
                  style={{ 
                    border: `2px solid ${activeSector.color}`,
                    color: activeSector.color,
                    backgroundColor: 'transparent'
                  }}
                >
                  <span>Learn More</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Activities - What We Do Together */}
      <section id="activities" ref={activitiesAnim.ref} className="bg-[#1E3A5F] px-6 py-24">
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
                className="mt-8 inline-flex rounded-lg bg-[#4A90D9] px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-lg font-bold text-white shadow-xl transition-all duration-300 hover:bg-[#3a7fc8] hover:scale-105"
              >
                {projectAlokdhara.ctaLabel}
              </Link>
            </div>
            <div className={`grid grid-cols-2 gap-2 sm:gap-4 transition-all duration-700 delay-200 ${projectAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              {[
                { label: 'Children Served', value: '180+/week' },
                { label: 'Volunteer Squads', value: '4 Active' },
                { label: 'Meals Provided', value: '2x Weekly' },
                { label: 'Learning Hours', value: '12 hrs/week' },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/10 p-3 sm:p-6 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <p className="text-xl sm:text-3xl font-extrabold text-white">{item.value}</p>
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium uppercase tracking-wider text-[#4A90D9]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Events & Announcements */}
      <section ref={noticesAnim.ref} className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className={`flex items-center gap-4 mb-12 transition-all duration-700 ${noticesAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="h-px w-12 bg-[#1E3A5F]" />
            <h2 className="text-3xl font-bold text-[#1E3A5F]">Events & Announcements</h2>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-8">
            {/* Events Section - 2/3 width */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4A90D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Upcoming Events
                </h3>
                <div className="flex items-center gap-4">
                  {/* Event indicators */}
                  <div className="flex gap-2">
                    {events.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentEvent(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentEvent === i ? 'bg-[#1E3A5F] w-8' : 'bg-gray-300 hover:bg-gray-400'}`}
                      />
                    ))}
                  </div>
                  <Link href="/events" className="text-sm font-semibold text-[#4A90D9] hover:text-[#1E3A5F] transition-colors flex items-center gap-1">
                    View All
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
              
              {/* Single Event Display */}
              <div 
                className="relative h-[400px] rounded-3xl overflow-hidden shadow-xl group cursor-pointer"
                onMouseEnter={() => setIsEventHovered(true)}
                onMouseLeave={() => setIsEventHovered(false)}
              >
                {events.map((event, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      currentEvent === i 
                        ? 'opacity-100 translate-x-0 z-10' 
                        : currentEvent > i 
                          ? 'opacity-0 -translate-x-full z-0' 
                          : 'opacity-0 translate-x-full z-0'
                    }`}
                  >
                    <Image src={event.image} alt={event.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A5F] via-[#1E3A5F]/60 to-transparent transition-all duration-300 group-hover:from-[#1E3A5F]/95 group-hover:via-[#1E3A5F]/80" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      {/* Hover indicator */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Paused
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-[#4A90D9] uppercase tracking-wider mb-3">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {event.date}
                      </span>
                      <h3 className="text-3xl font-bold text-white mb-3 transition-transform duration-300 group-hover:-translate-y-1">{event.title}</h3>
                      <p className="text-white/80 text-lg mb-4 max-w-2xl transition-all duration-300 group-hover:text-white">{event.desc}</p>
                      {/* Additional details on hover */}
                      <div className="max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-500 ease-out">
                        <div className="flex items-center gap-4 mb-4 text-sm text-white/90">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            10:00 AM - 5:00 PM
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Open to all volunteers
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-white/70 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {event.location}
                        </p>
                        <button className="px-6 py-2 bg-[#4A90D9] text-white font-semibold rounded-lg hover:bg-[#3a7fc8] transition-all duration-300 group-hover:bg-white group-hover:text-[#1E3A5F] group-hover:shadow-lg">
                          Learn More
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Navigation arrows */}
                <button 
                  onClick={() => setCurrentEvent((prev) => (prev - 1 + events.length) % events.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                  onClick={() => setCurrentEvent((prev) => (prev + 1) % events.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            
            {/* Announcements Section - 1/3 width */}
            <div className={`transition-all duration-700 delay-200 ${noticesAnim.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4A90D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  Announcements
                </h3>
                <Link href="/announcements" className="text-sm font-semibold text-[#4A90D9] hover:text-[#1E3A5F] transition-colors flex items-center gap-1">
                  View All
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden h-[400px]">
                <div className="h-full overflow-y-auto custom-scrollbar">
                  {[
                    { title: 'New Volunteer Registration Open', date: '2 hours ago', type: 'info' },
                    { title: 'December Newsletter Released', date: '1 day ago', type: 'news' },
                    { title: 'Office Closed: Victory Day', date: '3 days ago', type: 'alert' },
                    { title: 'Photography Contest Winners', date: '5 days ago', type: 'success' },
                    { title: 'Updated Volunteer Guidelines', date: '1 week ago', type: 'info' },
                    { title: 'Partnership with EduFirst', date: '1 week ago', type: 'news' },
                    { title: 'Blood Bank Stock Update', date: '2 weeks ago', type: 'alert' },
                    { title: 'Training Session Schedule', date: '2 weeks ago', type: 'info' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer group">
                      <div className="flex items-start gap-3">
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          item.type === 'alert' ? 'bg-red-500' : 
                          item.type === 'success' ? 'bg-green-500' : 
                          item.type === 'news' ? 'bg-[#4A90D9]' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1E3A5F] transition-colors">{item.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-8">
            {/* Mobile Events - Single Event Display */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4A90D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Events
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {events.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentEvent(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${currentEvent === i ? 'bg-[#1E3A5F] w-6' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                  <Link href="/events" className="text-xs font-semibold text-[#4A90D9] hover:text-[#1E3A5F] transition-colors">
                    View All
                  </Link>
                </div>
              </div>
              
              <div 
                className="relative h-56 rounded-2xl overflow-hidden shadow-lg group"
                onMouseEnter={() => setIsEventHovered(true)}
                onMouseLeave={() => setIsEventHovered(false)}
                onTouchStart={() => setIsEventHovered(true)}
                onTouchEnd={() => setTimeout(() => setIsEventHovered(false), 3000)}
              >
                {events.map((event, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-all duration-500 ${
                      currentEvent === i ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                  >
                    <Image src={event.image} alt={event.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A5F] via-[#1E3A5F]/50 to-transparent transition-all duration-300 group-hover:from-[#1E3A5F]/95 group-hover:via-[#1E3A5F]/70" />
                    <div className="absolute inset-0 p-5 flex flex-col justify-end">
                      {/* Paused indicator */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Paused
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#4A90D9] uppercase">{event.date}</span>
                      <h4 className="text-lg font-bold text-white mt-1">{event.title}</h4>
                      {/* Show description on hover */}
                      <p className="text-xs text-white/80 mt-1 max-h-0 overflow-hidden group-hover:max-h-16 transition-all duration-300 line-clamp-2">{event.desc}</p>
                      <p className="text-sm text-white/70 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                        {event.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Mobile Announcements */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#1E3A5F] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4A90D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  Announcements
                </h3>
                <Link href="/announcements" className="text-xs font-semibold text-[#4A90D9] hover:text-[#1E3A5F] transition-colors">
                  View All
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="h-[280px] overflow-y-auto mobile-scrollbar">
                  {[
                    { title: 'New Volunteer Registration Open', date: '2 hours ago', type: 'info' },
                    { title: 'December Newsletter Released', date: '1 day ago', type: 'news' },
                    { title: 'Office Closed: Victory Day', date: '3 days ago', type: 'alert' },
                    { title: 'Photography Contest Winners', date: '5 days ago', type: 'success' },
                    { title: 'Updated Volunteer Guidelines', date: '1 week ago', type: 'info' },
                    { title: 'Partnership with EduFirst', date: '1 week ago', type: 'news' },
                    { title: 'Blood Bank Stock Update', date: '2 weeks ago', type: 'alert' },
                    { title: 'Training Session Schedule', date: '2 weeks ago', type: 'info' },
                  ].map((item, i) => (
                    <div key={i} className="p-3 border-b border-gray-100 last:border-0 active:bg-gray-50">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          item.type === 'alert' ? 'bg-red-500' : 
                          item.type === 'success' ? 'bg-green-500' : 
                          item.type === 'news' ? 'bg-[#4A90D9]' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Custom scrollbar styles */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar,
          .mobile-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track,
          .mobile-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb,
          .mobile-scrollbar::-webkit-scrollbar-thumb {
            background: #1E3A5F;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover,
          .mobile-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #4A90D9;
          }
          .mobile-scrollbar {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #1E3A5F #f1f1f1;
          }
        `}</style>
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
          <div className={`mt-12 text-center transition-all duration-700 delay-300 ${joinAnim.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A5F] px-8 py-4 text-base font-semibold text-white hover:bg-[#2a4d75] transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Start Your Journey
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Partners - Infinite Scroll */}
      <section className="bg-white py-10 sm:py-16 border-t border-gray-100 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-6 sm:mb-10">Trusted Partners</p>
        </div>
        <div className="relative">
          {/* Gradient masks */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />
          
          {/* Scrolling track */}
          <div className="partners-scroll-track">
            <div className="partners-scroll-content">
              {/* Partner logos - using SVG placeholders */}
              {[
                { name: 'TechCorp', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#1E3A5F" rx="8"/><circle cx="30" cy="30" r="15" fill="#4A90D9"/><rect x="50" y="20" width="55" height="6" fill="white" rx="3"/><rect x="50" y="32" width="40" height="6" fill="#4A90D9" rx="3"/></svg> },
                { name: 'EduFirst', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#4A90D9" rx="8"/><path d="M25 45 L40 20 L55 45 Z" fill="white"/><circle cx="40" cy="18" r="5" fill="white"/><rect x="65" y="22" width="40" height="5" fill="white" rx="2"/><rect x="65" y="32" width="30" height="5" fill="white" opacity="0.7" rx="2"/></svg> },
                { name: 'HealthPlus', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#00A651" rx="8"/><rect x="25" y="22" width="20" height="16" fill="white" rx="2"/><rect x="30" y="17" width="10" height="26" fill="white" rx="2"/><rect x="55" y="20" width="50" height="6" fill="white" rx="3"/><rect x="55" y="32" width="35" height="6" fill="white" opacity="0.7" rx="3"/></svg> },
                { name: 'BuildBD', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#E31B23" rx="8"/><rect x="20" y="25" width="15" height="20" fill="white" rx="2"/><rect x="38" y="20" width="15" height="25" fill="white" rx="2"/><rect x="56" y="30" width="15" height="15" fill="white" rx="2"/><rect x="80" y="22" width="25" height="5" fill="white" rx="2"/><rect x="80" y="32" width="18" height="5" fill="white" opacity="0.7" rx="2"/></svg> },
                { name: 'GreenLife', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#2E7D32" rx="8"/><ellipse cx="35" cy="32" rx="12" ry="18" fill="#81C784"/><ellipse cx="30" cy="28" rx="8" ry="12" fill="white"/><rect x="55" y="22" width="50" height="5" fill="white" rx="2"/><rect x="55" y="32" width="35" height="5" fill="#81C784" rx="2"/></svg> },
                { name: 'YouthFund', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#6B4C9A" rx="8"/><circle cx="35" cy="25" r="10" fill="white"/><path d="M25 35 Q35 50 45 35" fill="white"/><rect x="55" y="20" width="50" height="6" fill="white" rx="3"/><rect x="55" y="32" width="40" height="6" fill="#B39DDB" rx="3"/></svg> },
                { name: 'MediaHub', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#F7941D" rx="8"/><polygon points="25,20 25,40 45,30" fill="white"/><rect x="55" y="22" width="50" height="5" fill="white" rx="2"/><rect x="55" y="32" width="35" height="5" fill="white" opacity="0.7" rx="2"/></svg> },
                { name: 'FinServe', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#0D47A1" rx="8"/><rect x="20" y="35" width="10" height="12" fill="#64B5F6" rx="1"/><rect x="32" y="28" width="10" height="19" fill="#90CAF9" rx="1"/><rect x="44" y="20" width="10" height="27" fill="white" rx="1"/><rect x="62" y="22" width="45" height="5" fill="white" rx="2"/><rect x="62" y="32" width="30" height="5" fill="#64B5F6" rx="2"/></svg> },
                { name: 'AidNet', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#00796B" rx="8"/><circle cx="30" cy="30" r="12" fill="none" stroke="white" strokeWidth="3"/><circle cx="30" cy="30" r="5" fill="white"/><line x1="30" y1="18" x2="30" y2="42" stroke="white" strokeWidth="2"/><line x1="18" y1="30" x2="42" y2="30" stroke="white" strokeWidth="2"/><rect x="52" y="22" width="55" height="5" fill="white" rx="2"/><rect x="52" y="32" width="40" height="5" fill="#80CBC4" rx="2"/></svg> },
                { name: 'EcoWorld', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#558B2F" rx="8"/><circle cx="32" cy="30" r="14" fill="#8BC34A"/><path d="M32 20 Q25 30 32 40 Q39 30 32 20" fill="white"/><rect x="55" y="22" width="50" height="5" fill="white" rx="2"/><rect x="55" y="32" width="35" height="5" fill="#C5E1A5" rx="2"/></svg> },
              ].map((partner, i) => (
                <div 
                  key={i}
                  className="w-16 h-10 sm:w-36 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden shadow-md sm:shadow-lg mx-2 sm:mx-4 flex-shrink-0 hover:scale-105 transition-transform duration-300"
                  title={partner.name}
                >
                  {partner.logo}
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {[
                { name: 'TechCorp', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#1E3A5F" rx="8"/><circle cx="30" cy="30" r="15" fill="#4A90D9"/><rect x="50" y="20" width="55" height="6" fill="white" rx="3"/><rect x="50" y="32" width="40" height="6" fill="#4A90D9" rx="3"/></svg> },
                { name: 'EduFirst', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#4A90D9" rx="8"/><path d="M25 45 L40 20 L55 45 Z" fill="white"/><circle cx="40" cy="18" r="5" fill="white"/><rect x="65" y="22" width="40" height="5" fill="white" rx="2"/><rect x="65" y="32" width="30" height="5" fill="white" opacity="0.7" rx="2"/></svg> },
                { name: 'HealthPlus', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#00A651" rx="8"/><rect x="25" y="22" width="20" height="16" fill="white" rx="2"/><rect x="30" y="17" width="10" height="26" fill="white" rx="2"/><rect x="55" y="20" width="50" height="6" fill="white" rx="3"/><rect x="55" y="32" width="35" height="6" fill="white" opacity="0.7" rx="3"/></svg> },
                { name: 'BuildBD', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#E31B23" rx="8"/><rect x="20" y="25" width="15" height="20" fill="white" rx="2"/><rect x="38" y="20" width="15" height="25" fill="white" rx="2"/><rect x="56" y="30" width="15" height="15" fill="white" rx="2"/><rect x="80" y="22" width="25" height="5" fill="white" rx="2"/><rect x="80" y="32" width="18" height="5" fill="white" opacity="0.7" rx="2"/></svg> },
                { name: 'GreenLife', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#2E7D32" rx="8"/><ellipse cx="35" cy="32" rx="12" ry="18" fill="#81C784"/><ellipse cx="30" cy="28" rx="8" ry="12" fill="white"/><rect x="55" y="22" width="50" height="5" fill="white" rx="2"/><rect x="55" y="32" width="35" height="5" fill="#81C784" rx="2"/></svg> },
                { name: 'YouthFund', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#6B4C9A" rx="8"/><circle cx="35" cy="25" r="10" fill="white"/><path d="M25 35 Q35 50 45 35" fill="white"/><rect x="55" y="20" width="50" height="6" fill="white" rx="3"/><rect x="55" y="32" width="40" height="6" fill="#B39DDB" rx="3"/></svg> },
                { name: 'MediaHub', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#F7941D" rx="8"/><polygon points="25,20 25,40 45,30" fill="white"/><rect x="55" y="22" width="50" height="5" fill="white" rx="2"/><rect x="55" y="32" width="35" height="5" fill="white" opacity="0.7" rx="2"/></svg> },
                { name: 'FinServe', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#0D47A1" rx="8"/><rect x="20" y="35" width="10" height="12" fill="#64B5F6" rx="1"/><rect x="32" y="28" width="10" height="19" fill="#90CAF9" rx="1"/><rect x="44" y="20" width="10" height="27" fill="white" rx="1"/><rect x="62" y="22" width="45" height="5" fill="white" rx="2"/><rect x="62" y="32" width="30" height="5" fill="#64B5F6" rx="2"/></svg> },
                { name: 'AidNet', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#00796B" rx="8"/><circle cx="30" cy="30" r="12" fill="none" stroke="white" strokeWidth="3"/><circle cx="30" cy="30" r="5" fill="white"/><line x1="30" y1="18" x2="30" y2="42" stroke="white" strokeWidth="2"/><line x1="18" y1="30" x2="42" y2="30" stroke="white" strokeWidth="2"/><rect x="52" y="22" width="55" height="5" fill="white" rx="2"/><rect x="52" y="32" width="40" height="5" fill="#80CBC4" rx="2"/></svg> },
                { name: 'EcoWorld', logo: <svg viewBox="0 0 120 60" className="w-full h-full"><rect width="120" height="60" fill="#558B2F" rx="8"/><circle cx="32" cy="30" r="14" fill="#8BC34A"/><path d="M32 20 Q25 30 32 40 Q39 30 32 20" fill="white"/><rect x="55" y="22" width="50" height="5" fill="white" rx="2"/><rect x="55" y="32" width="35" height="5" fill="#C5E1A5" rx="2"/></svg> },
              ].map((partner, i) => (
                <div 
                  key={`dup-${i}`}
                  className="w-16 h-10 sm:w-36 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden shadow-md sm:shadow-lg mx-2 sm:mx-4 flex-shrink-0 hover:scale-105 transition-transform duration-300"
                  title={partner.name}
                >
                  {partner.logo}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* CSS for infinite scroll */}
        <style jsx>{`
          .partners-scroll-track {
            overflow: hidden;
            width: 100%;
          }
          .partners-scroll-content {
            display: flex;
            width: fit-content;
            animation: partners-scroll 40s linear infinite;
          }
          @keyframes partners-scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .partners-scroll-track:hover .partners-scroll-content {
            animation-play-state: paused;
          }
        `}</style>
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
          <div className="mt-10 flex flex-row items-center justify-center gap-2 sm:gap-4">
            <Link
              href="#donate"
              className="group rounded-lg sm:rounded-xl bg-white px-4 sm:px-10 py-2.5 sm:py-4 text-sm sm:text-lg font-bold text-[#1E3A5F] shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              <span className="flex items-center gap-2 sm:gap-3">
                <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Donate Now
              </span>
            </Link>
            <Link
              href="#monthly"
              className="rounded-lg sm:rounded-xl border-2 border-white/50 px-3 sm:px-10 py-2.5 sm:py-4 text-xs sm:text-lg font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white whitespace-nowrap"
            >
              Monthly Donor
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-2 sm:gap-6 max-w-xl mx-auto px-2">
            {[{ amount: '৳500', desc: 'Feeds 5 children' }, { amount: '৳1000', desc: 'School supplies' }, { amount: '৳2500', desc: 'Monthly support' }].map((tier, i) => (
              <button
                key={i}
                className="rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm p-3 sm:p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
              >
                <p className="text-base sm:text-2xl font-bold text-white">{tier.amount}</p>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/70">{tier.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
