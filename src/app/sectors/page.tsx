"use client";

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import './sectors.css';

export default function SectorsPage() {
  const [activeSector, setActiveSector] = useState<string>('cultural');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const cardsRef = useRef<Map<number, HTMLElement>>(new Map());

  const sectors = [
    { id: 'cultural', name: 'Cultural' },
    { id: 'photography', name: 'Photography' },
    { id: 'blood', name: 'Blood Bank' },
    { id: 'nature', name: 'Nature & Environment' },
    { id: 'education', name: 'Education' },
    { id: 'charity', name: 'Charity' },
    { id: 'medical', name: 'Medical' },
    { id: 'clubs', name: 'Clubs' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      // Update back to top button visibility
      setShowBackToTop(window.scrollY > 300);

      // Update active sector based on scroll position
      const viewportCenter = window.innerHeight * 0.4;
      let closestSectorId: string | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      cardsRef.current.forEach((card) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();

        if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
          return;
        }

        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          const sectorId = card.getAttribute('data-sector');
          if (sectorId) {
            closestSectorId = sectorId;
          }
        }
      });

      if (closestSectorId) {
        setActiveSector(closestSectorId);
      }
    };

    // Add entrance animation to cards
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    // Observe all cards
    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, []);

  const scrollToSector = (sectorId: string) => {
    const targetCard = Array.from(cardsRef.current.values()).find(
      (card) => card?.getAttribute('data-sector') === sectorId
    );
    if (targetCard) {
      const headerOffset = 100; // Offset for fixed header
      const elementPosition = targetCard.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSector(sectorId);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="page">
        <header className="page-header">
          <h1>Our Sectors</h1>
          <p>
            Each sector plays a vital role in shaping creativity, skills, and leadership within our organization.
            Through structured activities, regular events, and continuous engagement, our sectors empower volunteers
            to explore their potential, grow collaboratively, and contribute meaningfully to our shared vision.
          </p>
        </header>

        <div className="layout">
          <section className="cards" aria-live="polite">
            {/* Cultural Sector */}
            <section
              className="card cultural reveal-card"
              id="cultural"
              data-sector="cultural"
              aria-label="Cultural Sector"
              ref={(el) => { if (el) cardsRef.current.set(0, el); }}
            >
              <Image src="/sectors/cultural.png" alt="Cultural Sector" width={400} height={300} />
              <p>
                The Cultural Sector works to <span className="accent">develop and showcase volunteers' talents</span>
                {' '}through regular <span className="accent">creative activities, live shows, workshops, and interactive sessions,</span>
                {' '}while recognizing outstanding contributions through monthly awards and an annual mega event.
              </p>
              <div className="features">
                <div className="feature">ARTIST OF<br />THE MONTH</div>
                <div className="feature">MONTHLY<br />LIVE SHOW</div>
                <div className="feature">WEEKLY<br />STREAMING</div>
                <div className="feature">BEST<br />CONTRIBUTOR</div>
                <div className="feature">MONTHLY<br />WORKSHOP</div>
                <div className="feature">ARTISTIC<br />CARNIVAL</div>
              </div>
            </section>

            {/* Photography Sector */}
            <section
              className="card photography reveal-card"
              id="photography"
              data-sector="photography"
              aria-label="Photography Sector"
              ref={(el) => { if (el) cardsRef.current.set(1, el); }}
            >
              <Image src="/sectors/photography.png" alt="Photography Sector" width={400} height={300} />
              <p>
                The Photography Sector <span className="accent">enhances volunteers' photography skills</span>
                {' '}through <span className="accent">regular photo posts, weekly features, tutorial sharing, workshops, and interactive sessions,</span>
                {' '}while recognizing excellence and covering all organizational outdoor events, along with hosting an annual photo exhibition.
              </p>
              <div className="features">
                <div className="feature">PHOTOGRAPHER<br />OF THE MONTH</div>
                <div className="feature">WEEKLY<br />TUTORIAL</div>
                <div className="feature">MONTHLY<br />WORKSHOP</div>
                <div className="feature">OUTDOOR<br />EVENT COVER</div>
                <div className="feature">PHOTO<br />EXHIBITION</div>
                <div className="feature">BEST<br />CONTRIBUTOR</div>
              </div>
            </section>

            {/* Blood Bank Sector */}
            <section
              className="card blood reveal-card"
              id="blood"
              data-sector="blood"
              aria-label="Blood Bank Sector"
              ref={(el) => { if (el) cardsRef.current.set(2, el); }}
            >
              <Image src="/sectors/blood.png" alt="Blood Bank Sector" width={400} height={300} />
              <p>
                The Blood Bank Sector <span className="accent">promotes blood donation awareness</span>
                {' '}through <span className="accent">regular posts, monthly reports and donor lists.</span>
                {' '}It strengthens volunteer engagement with adda sessions, recognizes top contributors, organizes special outdoor events on Blood Donor Day, and appreciates donors through dedicated posts.
              </p>
              <div className="features">
                <div className="feature">MONTLY REPORT<br />PUBLISH</div>
                <div className="feature">BLOOD<br />DONOR LIST</div>
                <div className="feature">BEST<br />CONTRIBUTOR</div>
                <div className="feature">OUTDOOR<br />EVENT</div>
                <div className="feature">BLOOD DONOR<br />APPRECIATION</div>
              </div>
            </section>

            {/* Nature & Environment Sector */}
            <section
              className="card nature reveal-card"
              id="nature"
              data-sector="nature"
              aria-label="Nature and Environment Sector"
              ref={(el) => { if (el) cardsRef.current.set(3, el); }}
            >
              <Image src="/sectors/nature.png" alt="Nature and Environment Sector" width={400} height={300} />
              <p>
                The Nature &amp; Environment Sector <span className="accent">raises awareness about environmental care</span>
                {' '}through <span className="accent">regular posts, organizes tree planting drives, clean-up campaigns, and indoor activities</span>
                {' '}like sapling distribution and workshops, while recognizing top contributors each month.
              </p>
              <div className="features">
                <div className="feature">CONSERVATION<br />EVENT</div>
                <div className="feature">CLEAN-UP<br />DRIVE</div>
                <div className="feature">SEMINAR<br />EVENT</div>
                <div className="feature">INDOOR<br />ACTIVITIES</div>
                <div className="feature">BEST<br />CONTRIBUTOR</div>
              </div>
            </section>

            {/* Education Sector */}
            <section
              className="card education reveal-card"
              id="education"
              data-sector="education"
              aria-label="Education Sector"
              ref={(el) => { if (el) cardsRef.current.set(4, el); }}
            >
              <Image src="/sectors/education.png" alt="Education Sector" width={400} height={300} />
              <p>
                The Education Sector <span className="accent">supports learning</span>
                {' '}through <span className="accent">regular workshops, indoor classes, and distribution of educational materials</span>,
                {' '}while promoting awareness in rural areas and recognizing top contributors each month.
              </p>
              <div className="features">
                <div className="feature">REGULAR<br />WORKSHOPS</div>
                <div className="feature">RESOURCE<br />DISTRIBUTION</div>
                <div className="feature">CLASS<br />SESSIONS</div>
                <div className="feature">AWARENESS<br />PROGRAMS</div>
                <div className="feature">BEST<br />CONTRIBUTORS</div>
              </div>
            </section>

            {/* Charity Sector */}
            <section
              className="card charity reveal-card"
              id="charity"
              data-sector="charity"
              aria-label="Charity Sector"
              ref={(el) => { if (el) cardsRef.current.set(5, el); }}
            >
              <Image src="/sectors/charity.png" alt="Charity Sector" width={400} height={300} />
              <p>
                The Charity Sector <span className="accent">supports the underprivileged</span>
                {' '}through <span className="accent">regular fundraising, relief distribution, special outdoor events during festivals, and essential services</span>
                {' '}like healthcare, clothing, and food, while recognizing top contributors each month.
              </p>
              <div className="features">
                <div className="feature">FUNDRAISING<br />DRIVES</div>
                <div className="feature">RELIEF<br />DISTRIBUTION</div>
                <div className="feature">CHARITY<br />ACTIVITIES</div>
                <div className="feature">SPECIAL<br />EVENTS</div>
                <div className="feature">BEST<br />CONTRIBUTOR</div>
              </div>
            </section>

            {/* Medical Sector */}
            <section
              className="card medical reveal-card"
              id="medical"
              data-sector="medical"
              aria-label="Medical Sector"
              ref={(el) => { if (el) cardsRef.current.set(6, el); }}
            >
              <Image src="/sectors/medical.png" alt="Medical Sector" width={400} height={300} />
              <p>
                The Medical Sector <span className="accent">promotes health awareness</span>
                {' '}through <span className="accent">regular posts and seminars, organizes free health camps, distributes medical supplies, offers special sessions</span>
                {' '}with healthcare professionals, and honors top contributors each month.
              </p>
              <div className="features">
                <div className="feature">HEALTH<br />AWARENESS</div>
                <div className="feature">HEALTH<br />CAMPS</div>
                <div className="feature">HEALTH<br />SUPPLIES</div>
                <div className="feature">MEDICAL<br />SESSIONS</div>
                <div className="feature">BEST<br />CONTRIBUTOR</div>
              </div>
            </section>

            {/* Clubs Sector */}
            <section
              className="card clubs reveal-card"
              id="clubs"
              data-sector="clubs"
              aria-label="Clubs Sector"
              ref={(el) => { if (el) cardsRef.current.set(7, el); }}
            >
              <div className="club-group club-group--memers">
                <div className="club-title">ASAD<br />MEMERS CLUB</div>
                <div className="club-arrow club-arrow--red">-&gt;</div>
                <div className="club-points">
                  <span className="club-point club-point--red">MEME CREATION</span>
                  <span className="club-point club-point--red">MEME COMPETITION</span>
                  <span className="club-point club-point--red">HUMOR EVENT</span>
                </div>
              </div>
              <hr className="club-divider" />
              <div className="club-group club-group--sports">
                <div className="club-title">ASAD<br />SPORTS CLUB</div>
                <div className="club-arrow club-arrow--blue">-&gt;</div>
                <div className="club-points">
                  <span className="club-point club-point--blue">SPORTS EVENTS</span>
                  <span className="club-point club-point--blue">FITNESS CAMP</span>
                  <span className="club-point club-point--blue">TEAM MANAGEMENT</span>
                </div>
              </div>
              <hr className="club-divider" />
              <div className="club-group club-group--english">
                <div className="club-title">ASAD ENGLISH<br />LANGUAGE CLUB</div>
                <div className="club-arrow club-arrow--yellow">-&gt;</div>
                <div className="club-points">
                  <span className="club-point club-point--yellow">ENGLISH SPEAKING</span>
                  <span className="club-point club-point--yellow">SPEECH DEBATE</span>
                  <span className="club-point club-point--yellow">TRANSLATION &amp; WRITING</span>
                </div>
              </div>
            </section>
          </section>

          {/* Sidebar navigation */}
          <aside className="sector-list" aria-label="Sector list">
            <h2>Sectors</h2>
            {sectors.map((sector) => (
              <button
                key={sector.id}
                className={`sector-button ${activeSector === sector.id ? 'is-active' : ''}`}
                type="button"
                data-sector={sector.id}
                onClick={() => scrollToSector(sector.id)}
              >
                {sector.name}
              </button>
            ))}
          </aside>
        </div>
      </main>

      {/* Back to top button */}
      <button
        className={`back-to-top ${showBackToTop ? 'is-visible' : ''}`}
        type="button"
        aria-label="Back to top"
        onClick={scrollToTop}
      >
        &uarr;
      </button>

      <Footer />
    </div>
  );
}
