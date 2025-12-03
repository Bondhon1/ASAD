/* Theme 1: UNICEF Blue - Clean, trustworthy, global humanitarian */
"use client";

import { useState } from 'react';
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

export default function UnicefTheme() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      {/* Themed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <Link href="#" className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl">
                <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
              </div>
              <span className="text-lg font-bold text-gray-900">ASAD</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" className="text-sm font-semibold text-gray-600 hover:text-[#00AEEF] transition">{item}</Link>
              ))}
              <Link href="#join" className="rounded-lg bg-[#00AEEF] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0099d4] transition">Join Us</Link>
            </div>
            {/* Mobile burger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block h-0.5 w-6 bg-gray-900 transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-6 bg-gray-900 transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-6 bg-gray-900 transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4">
            <div className="flex flex-col gap-4">
              {['Home', 'About', 'Sectors', 'Activities', 'Contact'].map((item) => (
                <Link key={item} href="#" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-gray-600 hover:text-[#00AEEF] transition">{item}</Link>
              ))}
              <Link href="#join" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#00AEEF] px-6 py-3 text-center text-sm font-bold text-white hover:bg-[#0099d4] transition">Join Us</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero with Full Banner Background */}
      <section className="relative min-h-[85vh] flex items-center pt-20">
        <div className="absolute inset-0">
          <Image
            src="/banner.jpg"
            alt="ASAD volunteers"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#00AEEF]/95 via-[#00AEEF]/85 to-[#0077B6]/80" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
              Amar Somoy Amar Desh
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-tight text-white md:text-6xl lg:text-7xl">
              {heroContent.title}
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/90">
              {heroContent.description}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={heroContent.primaryAction.href}
                className="rounded-lg bg-white px-8 py-4 text-lg font-bold text-[#00AEEF] shadow-xl transition hover:bg-gray-100 hover:shadow-2xl"
              >
                {heroContent.primaryAction.label}
              </Link>
              <Link
                href={heroContent.secondaryAction.href}
                className="rounded-lg border-2 border-white px-8 py-4 text-lg font-bold text-white transition hover:bg-white/10"
              >
                {heroContent.secondaryAction.label}
              </Link>
            </div>
          </div>
        </div>
        {/* Floating Stats */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="mx-auto max-w-6xl px-6 translate-y-1/2">
            <div className="grid gap-4 md:grid-cols-3">
              {stats.map((stat, i) => (
                <div key={i} className="rounded-2xl bg-white p-6 text-center shadow-2xl">
                  <p className="text-4xl font-extrabold text-[#00AEEF]">{stat.value}</p>
                  <p className="mt-2 text-sm font-medium uppercase tracking-wider text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-gray-50 px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-[#00AEEF]">{aboutContent.eyebrow}</span>
              <h2 className="mt-4 text-4xl font-extrabold text-gray-900 lg:text-5xl">{aboutContent.title}</h2>
              <p className="mt-6 text-lg leading-relaxed text-gray-600">{aboutContent.description}</p>
              <div className="mt-8 space-y-4">
                {aboutContent.paragraphs.map((p, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed">{p}</p>
                ))}
              </div>
              <Link href={aboutContent.learnMore.href} className="mt-8 inline-flex items-center gap-2 text-lg font-bold text-[#00AEEF] hover:underline">
                {aboutContent.learnMore.label}
              </Link>
            </div>
            <div className="grid gap-6">
              <div className="rounded-3xl bg-[#00AEEF] p-8 text-white shadow-xl">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">Our Mission</h3>
                <p className="mt-4 text-xl font-semibold leading-relaxed">{aboutContent.mission}</p>
              </div>
              <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#00AEEF]">Our Vision</h3>
                <p className="mt-4 text-xl font-semibold leading-relaxed text-gray-800">{aboutContent.vision}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors Grid */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-[#00AEEF]">Our Sectors</span>
            <h2 className="mt-4 text-4xl font-extrabold text-gray-900">Seven sectors driving national impact</h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, i) => (
              <div key={i} className="group rounded-2xl bg-gray-50 p-6 transition-all hover:bg-[#00AEEF] hover:shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00AEEF] text-xl font-bold text-white group-hover:bg-white group-hover:text-[#00AEEF]">
                  {sector.name.charAt(0)}
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900 group-hover:text-white">{sector.name}</h3>
                <p className="mt-2 text-gray-600 group-hover:text-white/90">{sector.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Volunteer Journey */}
      <section className="bg-[#00AEEF] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-white">Your Journey With Us</h2>
            <p className="mt-4 text-xl text-white/80">Four steps to becoming an official ASAD volunteer</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {journeySteps.map((step, i) => (
              <div key={i} className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-[#00AEEF]">
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
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-[#00AEEF]">Activities</span>
            <h2 className="mt-4 text-4xl font-extrabold text-gray-900">What We Do</h2>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {activities.map((activity, i) => (
              <div key={i} className="rounded-2xl border-2 border-gray-100 p-8">
                <h3 className="text-xl font-bold text-gray-900">{activity.title}</h3>
                <ul className="mt-4 space-y-3">
                  {activity.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-3 text-gray-600">
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#00AEEF]" />
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
      <section className="relative overflow-hidden bg-gray-900 px-6 py-24">
        <div className="absolute inset-0 opacity-30">
          <Image src="/banner.jpg" alt="" fill className="object-cover" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-[#00AEEF]">Featured Project</span>
              <h2 className="mt-4 text-4xl font-extrabold text-white lg:text-5xl">{projectAlokdhara.title}</h2>
              <p className="mt-6 text-xl text-gray-300">{projectAlokdhara.summary}</p>
              <ul className="mt-8 space-y-4">
                {projectAlokdhara.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#00AEEF]" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href={projectAlokdhara.ctaHref}
                className="mt-8 inline-flex rounded-lg bg-[#00AEEF] px-8 py-4 text-lg font-bold text-white shadow-xl transition hover:bg-[#0099d4]"
              >
                {projectAlokdhara.ctaLabel}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Children Served', value: '180+/week' },
                { label: 'Volunteer Squads', value: '4 Active' },
                { label: 'Meals Provided', value: '2x Weekly' },
                { label: 'Learning Hours', value: '12 hrs/week' },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                  <p className="text-3xl font-extrabold text-white">{item.value}</p>
                  <p className="mt-2 text-sm font-medium uppercase tracking-wider text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Notices */}
      <section className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-extrabold text-gray-900">Latest Notices</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {notices.map((notice, i) => (
              <div key={i} className="rounded-2xl bg-white p-6 shadow-lg">
                <div className="h-1 w-12 rounded-full bg-[#00AEEF]" />
                <h3 className="mt-4 text-lg font-bold text-gray-900">{notice.title}</h3>
                <p className="mt-2 text-gray-600">{notice.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900">Join Our Movement</h2>
            <p className="mt-4 text-xl text-gray-600">Multiple ways to contribute and make a difference</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {joinOptions.map((option, i) => (
              <div key={i} className="rounded-2xl bg-gray-50 p-8 transition-all hover:shadow-xl">
                <h3 className="text-xl font-bold text-gray-900">{option.title}</h3>
                <p className="mt-3 text-gray-600">{option.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="bg-gray-100 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-gray-500">Our Partners</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
            {partners.map((partner, i) => (
              <div key={i} className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-600 shadow">
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
              <h3 className="text-2xl font-extrabold">Amar Somoy Amar Desh</h3>
              <p className="mt-4 text-gray-400">A youth-led volunteer movement empowering students across Bangladesh through service, education, and leadership.</p>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-[#00AEEF]">Quick Links</h4>
              <div className="mt-4 flex flex-col gap-2 text-gray-400">
                <Link href="#" className="hover:text-white">Home</Link>
                <Link href="#" className="hover:text-white">About Us</Link>
                <Link href="#" className="hover:text-white">Activities</Link>
                <Link href="#" className="hover:text-white">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-[#00AEEF]">Contact</h4>
              <div className="mt-4 space-y-2 text-gray-400">
                <p>Official FB: Asadian Asad</p>
                <p>Email: hello@asadofficial.org</p>
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
