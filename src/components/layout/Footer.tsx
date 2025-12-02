import Link from 'next/link';

const quickLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  { label: 'Activities', href: '#activities' },
  { label: 'Project Alokdhara', href: '#alokdhara' },
];

const socials = [
  { label: 'Facebook', href: 'https://facebook.com/AsadVolunteers' },
  { label: 'Messenger', href: 'https://m.me/AsadianAsad' },
];

export function Footer() {
  return (
    <footer id="contact" className="bg-ink-soft text-white">
      <div className="content-width section-py grid gap-12 lg:grid-cols-3">
        <div>
          <p className="text-lg font-semibold uppercase tracking-[0.2em]">Amar Somoy Amar Desh</p>
          <p className="mt-4 text-sm text-white/70">
            A national youth-led volunteer movement empowering students to serve
            their communities through education, culture, charity, and skilled
            leadership.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Quick Links
          </p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-white/70">
            {quickLinks.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Contact
          </p>
          <div className="mt-4 text-sm text-white/70">
            <p>Official FB ID: Asadian Asad</p>
            <p className="mt-2">Email: hello@asadofficial.org</p>
            <p className="mt-2">Phone: +880 1303-123456</p>
            <div className="mt-4 flex gap-3">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 hover:border-white hover:text-white"
                >
                  {social.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/30">
        <div className="content-width flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Amar Somoy Amar Desh. All rights reserved.</p>
          <p>Transparency · Inclusion · Service</p>
        </div>
      </div>
    </footer>
  );
}
