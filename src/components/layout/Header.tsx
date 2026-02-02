"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md transition-all duration-300">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl shadow-md transition-transform duration-300 group-hover:scale-110">
              <Image src="/logo.jpg" alt="ASAD Logo" fill className="object-cover" />
            </div>
            <span className="text-lg font-bold text-[#1E3A5F]">ASAD</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
              { label: 'Sectors', href: '/#sectors' },
              { label: 'Activities', href: '/#activities' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="text-sm font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300">{item.label}</Link>
            ))}
            {status === 'authenticated' ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-[#1E3A5F] shadow-xl transition-all duration-300 hover:shadow-2xl">View Dashboard</Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-lg bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-[#0b2140] border border-[#0b2140]">Logout</button>
              </div>
            ) : (
              <Link href="/auth" className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-sm font-semibold text-white hover:bg-[#2a4d75] transition-all duration-300">Join Now</Link>
            )}
          </div>

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

      <div className={`md:hidden bg-white border-t border-gray-100 overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-96 py-4' : 'max-h-0'}`}>
        <div className="flex flex-col gap-4 px-6">
          {[
            { label: 'Home', href: '/' },
            { label: 'About', href: '/about' },
            { label: 'Sectors', href: '/#sectors' },
            { label: 'Activities', href: '/#activities' },
          ].map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-gray-600 hover:text-[#1E3A5F] transition-colors duration-300">{item.label}</Link>
          ))}
          {status === 'authenticated' ? (
            <div className="flex gap-2">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1E3A5F]">View Dashboard</Link>
              <button onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }); }} className="rounded-lg bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-[#0b2140] border border-[#0b2140]">Logout</button>
            </div>
          ) : (
            <Link href="/auth" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#1E3A5F] px-7 py-3 text-center text-sm font-semibold text-white transition-all duration-300">Join Now</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
