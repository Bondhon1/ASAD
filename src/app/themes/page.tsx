import Link from 'next/link';

export default function ThemesIndex() {
  const themes = [
    { name: 'UNICEF Blue', path: '/themes/unicef', color: '#00AEEF', desc: 'Clean, trustworthy blue inspired by global humanitarian organizations' },
    { name: 'BRAC Warm', path: '/themes/brac', color: '#E31B23', desc: 'Bold red with warm accents, professional NGO aesthetic' },
    { name: 'Trust Green', path: '/themes/trust', color: '#00A651', desc: 'Fresh green palette conveying growth and sustainability' },
    { name: 'Royal Purple', path: '/themes/royal', color: '#6B4C9A', desc: 'Distinguished purple with elegant typography' },
    { name: 'Sunrise Gold', path: '/themes/sunrise', color: '#F7941D', desc: 'Energetic orange/gold representing hope and new beginnings' },
    { name: 'Navy Classic', path: '/themes/navy', color: '#1E3A5F', desc: 'Professional navy blue conveying trust, stability and authority' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900">ASAD Homepage Themes</h1>
        <p className="mt-4 text-lg text-gray-600">
          Select a theme to preview. Each variant features unique colors, typography, card styles, and a full-width banner hero.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {themes.map((theme) => (
            <Link
              key={theme.path}
              href={theme.path}
              className="group rounded-2xl bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className="h-3 w-16 rounded-full"
                style={{ backgroundColor: theme.color }}
              />
              <h2 className="mt-4 text-xl font-semibold text-gray-900 group-hover:text-gray-700">
                {theme.name}
              </h2>
              <p className="mt-2 text-sm text-gray-500">{theme.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
