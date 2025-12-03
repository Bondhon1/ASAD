import { Hero } from '@/components/sections/Hero';
import { StatsStrip } from '@/components/sections/StatsStrip';
import { AboutSection } from '@/components/sections/AboutSection';
import { SectorGrid } from '@/components/sections/SectorGrid';
import { VolunteerJourney } from '@/components/sections/VolunteerJourney';
import { ActivitiesShowcase } from '@/components/sections/ActivitiesShowcase';
import { ProjectHighlight } from '@/components/sections/ProjectHighlight';
import { JoinUs } from '@/components/sections/JoinUs';
import { Partners } from '@/components/sections/Partners';
import { NoticeBoard } from '@/components/sections/NoticeBoard';
import { VolunteerDirectory } from '@/components/sections/VolunteerDirectory';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
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
} from '@/content/homepage';

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-24 lg:pt-28">
        <Hero {...heroContent} />
        <StatsStrip items={stats} />
        <AboutSection content={aboutContent} />
        <SectorGrid sectors={sectors} />
        <VolunteerJourney steps={journeySteps} />
        <ActivitiesShowcase cards={activities} />
        <ProjectHighlight project={projectAlokdhara} />
        <NoticeBoard notices={notices} />
        <VolunteerDirectory content={volunteerDirectory} />
        <JoinUs options={joinOptions} />
        <Partners items={partners} />
      </main>
      <Footer />
      <ThemeSwitcher />
    </>
  );
}
