"use client";

import Link from "next/link";
import Image from "next/image";
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
  volunteerDirectory,
} from "@/content/homepage";

/**
 * Navy Blue Theme - Bold & Professional
 * Colors: Deep Navy (#1E3A5F) with Sky Blue (#4A90D9) accents
 * Cards: Sharp corners, strong borders, professional shadows
 * Typography: Inter font, bold and authoritative
 */

export default function NavyTheme() {
  return (
    <div className="min-h-screen bg-[#F5F7FA]" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1E3A5F]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#" className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden bg-white">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <div className="text-white">
                <span className="block text-lg font-bold leading-tight">ASAD</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#4A90D9]">Amar Somoy Amar Desh</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" className="text-sm font-semibold text-white/80 hover:text-[#4A90D9] transition">{item}</Link>
              ))}
              <Link href="#join" className="bg-[#4A90D9] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#3A7BC8] transition">Become a Volunteer</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero with Full Banner Background */}
      <section className="relative min-h-[90vh] flex items-center pt-20">
        <div className="absolute inset-0">
          <Image
            src="/banner.jpg"
            alt="ASAD Banner"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/95 via-[#1E3A5F]/80 to-[#1E3A5F]/50" />
        </div>
        
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24">
          <div className="max-w-2xl">
            <div className="mb-6 inline-block border-l-4 border-[#4A90D9] bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="text-sm font-bold uppercase tracking-widest text-[#4A90D9]">
                Volunteer Organization
              </span>
            </div>
            
            <h1 className="mb-8 text-5xl font-black leading-tight text-white md:text-6xl lg:text-7xl">
              {heroContent.title}
            </h1>
            
            <p className="mb-10 max-w-lg text-lg leading-relaxed text-white/80">
              {heroContent.description}
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link
                href="#join"
                className="group bg-[#4A90D9] px-8 py-4 text-base font-bold text-white transition hover:bg-[#3A7BC8]"
              >
                Join Our Mission
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="#about"
                className="border-2 border-white/40 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Bar at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#1E3A5F]/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-2 gap-px bg-white/10 md:grid-cols-4">
              {stats.map((stat, i) => (
                <div key={i} className="bg-[#1E3A5F] px-8 py-6 text-center">
                  <div className="text-4xl font-black text-[#4A90D9]">{stat.value}</div>
                  <div className="mt-1 text-sm font-semibold uppercase tracking-wider text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 md:grid-cols-2 items-center">
            <div>
              <div className="mb-4 inline-block bg-[#1E3A5F] px-4 py-2">
                <span className="text-sm font-bold uppercase tracking-widest text-white">Who We Are</span>
              </div>
              <h2 className="mb-6 text-4xl font-black text-[#1E3A5F] md:text-5xl">
                {aboutContent.title}
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-gray-600">
                {aboutContent.description}
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4 border-l-4 border-[#4A90D9] bg-[#F5F7FA] p-4">
                  <div className="font-black text-[#4A90D9]">●</div>
                  <div>
                    <h4 className="font-bold text-[#1E3A5F]">Mission</h4>
                    <p className="text-sm text-gray-600">{aboutContent.mission}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 border-l-4 border-[#4A90D9] bg-[#F5F7FA] p-4">
                  <div className="font-black text-[#4A90D9]">●</div>
                  <div>
                    <h4 className="font-bold text-[#1E3A5F]">Vision</h4>
                    <p className="text-sm text-gray-600">{aboutContent.vision}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-[#1E3A5F] p-2">
                <div className="relative h-full w-full overflow-hidden">
                  <Image
                    src="/logo.jpg"
                    alt="ASAD Logo"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-[#4A90D9] px-8 py-6 text-white">
                <div className="text-4xl font-black">ASAD</div>
                <div className="text-sm font-bold uppercase tracking-wider">আমার সময় আমার দেশ</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors Grid */}
      <section className="py-24 bg-[#F5F7FA]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block bg-[#1E3A5F] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white mb-4">Our Focus</span>
            <h2 className="text-4xl font-black text-[#1E3A5F] md:text-5xl">Working Sectors</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, i) => (
              <div
                key={i}
                className="group bg-white border-2 border-transparent p-8 transition-all hover:border-[#4A90D9] hover:shadow-xl"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center bg-[#1E3A5F] text-xl font-black text-white group-hover:bg-[#4A90D9] transition-colors">
                  {i + 1}
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#1E3A5F] group-hover:text-[#4A90D9] transition-colors">{sector.name}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{sector.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Volunteer Journey */}
      <section className="py-24 bg-[#1E3A5F]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block border border-[#4A90D9] px-4 py-2 text-sm font-bold uppercase tracking-widest text-[#4A90D9] mb-4">Your Path</span>
            <h2 className="text-4xl font-black text-white md:text-5xl">Volunteer Journey</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-4">
            {journeySteps.map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-white/10 backdrop-blur-sm p-8 h-full border border-white/20">
                  <div className="absolute -top-4 left-8 bg-[#4A90D9] px-4 py-2 text-2xl font-black text-white">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="pt-6">
                    <h3 className="mb-3 text-lg font-bold text-white">{step.title}</h3>
                    <p className="text-sm text-white/70">{step.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block bg-[#1E3A5F] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white mb-4">What We Do</span>
            <h2 className="text-4xl font-black text-[#1E3A5F] md:text-5xl">Our Activities</h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {activities.map((activity, i) => (
              <div
                key={i}
                className="group border-2 border-gray-100 bg-white transition-all hover:border-[#4A90D9]"
              >
                <div className="bg-[#1E3A5F] p-6">
                  <h3 className="text-xl font-bold text-white">{activity.title}</h3>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {activity.points.map((point, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-[#4A90D9] font-bold">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Highlight */}
      <section className="py-24 bg-[#F5F7FA]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 items-center md:grid-cols-2">
            <div>
              <span className="inline-block bg-[#4A90D9] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white mb-4">Featured Initiative</span>
              <h2 className="mb-6 text-4xl font-black text-[#1E3A5F]">{projectAlokdhara.title}</h2>
              <p className="mb-8 text-lg leading-relaxed text-gray-600">{projectAlokdhara.summary}</p>
              <ul className="space-y-3">
                {projectAlokdhara.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 bg-white border-l-4 border-[#4A90D9] p-4">
                    <span className="text-[#4A90D9] font-black">✓</span>
                    <span className="text-gray-600">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-[#1E3A5F] to-[#4A90D9] p-8 flex items-end">
                <div className="text-white">
                  <div className="text-6xl font-black opacity-20">&ldquo;</div>
                  <p className="text-lg font-medium italic">Illuminating futures through education and empowerment</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notice Board */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Notices */}
            <div className="lg:col-span-2">
              <div className="mb-8 flex items-center gap-4">
                <span className="bg-[#1E3A5F] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white">Announcements</span>
                <div className="flex-1 h-px bg-[#1E3A5F]/20"></div>
              </div>
              <div className="space-y-4">
                {notices.map((notice, i) => (
                  <div key={i} className="flex gap-6 border-l-4 border-[#4A90D9] bg-[#F5F7FA] p-6 transition-all hover:bg-[#E8EFF8]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#1E3A5F] text-xl font-black text-white">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1E3A5F]">{notice.title}</h4>
                      <p className="mt-1 text-sm text-gray-600">{notice.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Directory */}
            <div>
              <div className="mb-8">
                <span className="bg-[#1E3A5F] px-4 py-2 text-sm font-bold uppercase tracking-widest text-white">Volunteer Directory</span>
              </div>
              <div className="bg-[#1E3A5F] p-6">
                <h4 className="text-lg font-bold text-white mb-3">{volunteerDirectory.title}</h4>
                <p className="text-sm text-white/70 mb-6">{volunteerDirectory.detail}</p>
                <div className="flex flex-wrap gap-2">
                  {volunteerDirectory.badges.map((badge, i) => (
                    <span key={i} className="bg-[#4A90D9] px-3 py-1.5 text-xs font-bold text-white">
                      {badge}
                    </span>
                  ))}
                </div>
                <Link href="#" className="mt-6 block text-center text-sm font-bold text-[#4A90D9] hover:text-white transition">
                  View Full Directory →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section id="join" className="py-24 bg-[#1E3A5F]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block border border-[#4A90D9] px-4 py-2 text-sm font-bold uppercase tracking-widest text-[#4A90D9] mb-4">Take Action</span>
            <h2 className="text-4xl font-black text-white md:text-5xl">Ways to Join</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">Choose your path to make a difference</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {joinOptions.map((option, i) => (
              <div
                key={i}
                className="group bg-white p-8 transition-all hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center bg-[#1E3A5F] text-2xl font-black text-white group-hover:bg-[#4A90D9] transition-colors">
                  {i + 1}
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#1E3A5F]">{option.title}</h3>
                <p className="text-sm text-gray-600">{option.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-10">
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Trusted Partners</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {partners.map((partner, i) => (
              <div key={i} className="text-2xl font-black text-[#1E3A5F]/20 transition hover:text-[#4A90D9]">
                {partner}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0D1F33] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-10 w-10 overflow-hidden bg-white">
                  <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
                </div>
                <span className="text-xl font-bold">ASAD</span>
              </div>
              <p className="text-sm text-white/60 max-w-md leading-relaxed">
                {aboutContent.description}
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-bold uppercase tracking-wider text-[#4A90D9]">Quick Links</h4>
              <div className="space-y-2">
                {['About Us', 'Our Activities', 'Join Us', 'Contact'].map((link) => (
                  <Link key={link} href="#" className="block text-sm text-white/60 hover:text-[#4A90D9] transition">{link}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-bold uppercase tracking-wider text-[#4A90D9]">Connect</h4>
              <div className="space-y-2 text-sm text-white/60">
                <p>Dhaka, Bangladesh</p>
                <p>info@asad.org.bd</p>
                <p>+880 1XXX XXXXXX</p>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/40">
            <p>&copy; {new Date().getFullYear()} Amar Somoy Amar Desh (ASAD). All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
