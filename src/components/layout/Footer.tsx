import Link from 'next/link';

const socials = [
  { label: 'Facebook', href: 'https://www.facebook.com/amarsomoyamardesh' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/amar-somoy-amar-desh' },
  { label: 'Instagram', href: 'https://www.instagram.com/amarsomoyamardesh/?hl=en' },
  { label: 'YouTube', href: 'https://www.youtube.com/@amarsomoyamardesh3268' },
];

export function Footer() {
  return (
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
              <Link href="/#home" className="hover:text-white transition-colors duration-300">Home</Link>
              <Link href="/about" className="hover:text-white transition-colors duration-300">About Us</Link>
              <Link href="/#sectors" className="hover:text-white transition-colors duration-300">Sectors</Link>
              <Link href="/auth" className="hover:text-white transition-colors duration-300">Join Us</Link>
              <Link href="/terms" className="hover:text-white transition-colors duration-300">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors duration-300">Privacy Policy</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4A90D9]">Contact</h4>
            <div className="mt-6 space-y-3 text-white/60">
              <p>Facebook: Amar Somoy Amar Desh</p>
              <p>Email: amarsomoyamardesh.it@gmail.com</p>
              <div className="mt-4 flex gap-3">
                {socials.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 hover:border-white hover:text-white"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-white/40">
          © {new Date().getFullYear()} Amar Somoy Amar Desh. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
