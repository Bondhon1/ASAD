import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-16 pt-28">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">Terms of Service</h1>
                <p className="mt-2 text-sm text-gray-500">Last updated: January 2026</p>
              </div>
            </div>

            <div className="mt-8 sm:mt-10 lg:flex lg:gap-8">
              <nav className="hidden lg:block w-56 shrink-0">
                <ul className="sticky top-28 space-y-2 text-sm text-gray-600">
                  <li><a href="#services" className="hover:text-gray-900">Services</a></li>
                  <li><a href="#eligibility" className="hover:text-gray-900">Eligibility</a></li>
                  <li><a href="#accounts" className="hover:text-gray-900">Accounts & Security</a></li>
                  <li><a href="#payments" className="hover:text-gray-900">Payments</a></li>
                  <li><a href="#conduct" className="hover:text-gray-900">Content & Conduct</a></li>
                  <li><a href="#termination" className="hover:text-gray-900">Termination</a></li>
                </ul>
              </nav>

              <article className="prose prose-neutral max-w-none lg:flex-1">
                <p>
                  These Terms of Service ("Terms") govern your use of the website and services
                  provided by Amar Somoy, Amar Desh (ASAD). By accessing or using our website or
                  services you agree to these Terms. If you do not agree, do not use the services.
                </p>

                <section id="services">
                  <h3>Services</h3>
                  <p>ASAD provides a public website and a member portal for volunteers and administrators. Key features include:</p>
                  <ul>
                    <li>Volunteer applications, interview scheduling and status tracking.</li>
                    <li>Official upgrades (payments, verification and ID issuance).</li>
                    <li>Tasks, submissions, points and ranking systems.</li>
                    <li>Donation campaigns, event pages and messaging features.</li>
                  </ul>
                </section>

                <section id="eligibility">
                  <h3>Eligibility</h3>
                  <p>You must be at least 13 years old to use public content. Member features may require additional verification. By registering you confirm the information you provide is accurate.</p>
                </section>

                <section id="accounts">
                  <h3>Accounts &amp; Security</h3>
                  <p>Keep your credentials secure. Notify us immediately of unauthorized access. We are not liable for losses from compromised accounts when credentials are not kept secure.</p>
                </section>

                <section id="payments">
                  <h3>Payments &amp; Transaction IDs</h3>
                  <p>Payments for some actions are processed off-platform (e.g., bKash, Nagad). You must provide transaction IDs and optional proof images; these are verified manually. We are not responsible for third-party transfer failures — keep receipts.</p>
                </section>

                <section id="conduct">
                  <h3>User Content &amp; Conduct</h3>
                  <p>You are responsible for the content you post. Do not post illegal, infringing, defamatory or hateful material. We may remove content and suspend or terminate accounts for violations.</p>
                </section>

                <section id="termination">
                  <h3>Termination</h3>
                  <p>We may suspend or terminate accounts for violations or operational reasons. Upon termination some content or features may be disabled or removed.</p>
                </section>

                <section>
                  <h3>Other Terms</h3>
                  <p>Intellectual property, disclaimers, indemnification and governing law are set out in the full Terms above. These Terms are governed by the laws of Bangladesh unless otherwise required by law.</p>
                </section>

                <div className="mt-6">
                  <p>Questions or requests: <a className="text-blue-600" href="mailto:amarsomoyamardesh.it@gmail.com">amarsomoyamardesh.it@gmail.com</a></p>
                  <p className="mt-3"><Link href="/privacy" className="text-sm text-blue-600 hover:underline">Read our Privacy Policy</Link></p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
