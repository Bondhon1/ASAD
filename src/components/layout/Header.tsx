'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  { label: 'Activities', href: '#activities' },
  { label: 'Contact', href: '#contact' },
  { label: 'Become a Volunteer', href: '#join', isButton: true },
  { label: 'Notice', href: '#notice' },
  { label: 'Volunteers', href: '#volunteers' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  const handleNavigate = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-white/90 shadow-[0_4px_30px_rgba(0,0,0,0.06)] backdrop-blur-md">
      <div className="content-width flex h-20 items-center justify-between gap-4 lg:h-24">
        <Link
          href="#home"
          className="flex items-center gap-4 text-left"
          onClick={handleNavigate}
        >
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-border bg-white p-1 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
            <Image
              src="/logo.jpg"
              alt="Amar Somoy Amar Desh logo"
              fill
              sizes="56px"
              className="object-cover"
              priority
            />
          </div>
          <div className="text-xs font-black uppercase tracking-[0.4em] text-ink">
            <span className="block leading-tight">Amar Somoy</span>
            <span className="block text-primary">Amar Desh</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold uppercase tracking-[0.2em] lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'transition-colors duration-200 hover:text-primary',
                item.isButton &&
                  'rounded-full bg-primary px-5 py-3 text-white hover:bg-primary/90'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="lg:hidden"
          aria-label="Toggle navigation"
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="block h-0.5 w-7 bg-ink"></span>
          <span className="my-1 block h-0.5 w-7 bg-ink"></span>
          <span className="block h-0.5 w-7 bg-ink"></span>
        </button>
      </div>
      <div
        className={cn(
          'overflow-hidden border-t border-border/60 transition-[max-height] duration-300 lg:hidden',
          open ? 'max-h-96' : 'max-h-0'
        )}
      >
        <nav className="content-width flex flex-col gap-4 py-6 text-sm font-semibold uppercase tracking-[0.2em]">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'rounded-full border border-transparent px-4 py-3 text-center transition-colors duration-200 hover:text-primary',
                item.isButton &&
                  'border-primary bg-primary text-white hover:bg-primary/90'
              )}
              onClick={handleNavigate}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
