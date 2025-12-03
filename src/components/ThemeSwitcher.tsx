'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const themes = [
  { name: 'Original', path: '/', color: '#059669' },
  { name: 'UNICEF Blue', path: '/themes/unicef', color: '#00AEEF' },
  { name: 'BRAC Warm', path: '/themes/brac', color: '#E31B23' },
  { name: 'Trust Green', path: '/themes/trust', color: '#00A651' },
  { name: 'Royal Purple', path: '/themes/royal', color: '#6B4C9A' },
  { name: 'Sunrise Gold', path: '/themes/sunrise', color: '#F7941D' },
  { name: 'Navy Classic', path: '/themes/navy', color: '#1E3A5F' },
];

export function ThemeSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = themes.find((t) => t.path === pathname) || themes[0];

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div className="relative">
        {open && (
          <div className="absolute bottom-full right-0 mb-3 w-56 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5">
            <div className="mb-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              Select Theme
            </div>
            {themes.map((theme) => (
              <Link
                key={theme.path}
                href={theme.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  pathname === theme.path
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full shadow-inner"
                  style={{ backgroundColor: theme.color }}
                />
                {theme.name}
              </Link>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold text-white shadow-2xl transition-all hover:scale-105"
          style={{ backgroundColor: current.color }}
        >
          <span className="h-3 w-3 rounded-full bg-white/30" />
          {current.name}
          <svg
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
