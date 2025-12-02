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
    <main>
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
  );
}
