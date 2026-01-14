import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-16 pt-28">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">Privacy Policy</h1>
                <p className="mt-2 text-sm text-gray-500">Last updated: January 2026</p>
              </div>
            </div>

            <div className="mt-8 sm:mt-10 lg:flex lg:gap-8">
              <nav className="hidden lg:block w-56 shrink-0">
                <ul className="sticky top-28 space-y-2 text-sm text-gray-600">
                  <li><a href="#intro" className="hover:text-gray-900">Introduction</a></li>
                  <li><a href="#data" className="hover:text-gray-900">Data We Collect</a></li>
                  <li><a href="#use" className="hover:text-gray-900">How We Use Your Data</a></li>
                  <li><a href="#sharing" className="hover:text-gray-900">Sharing & Disclosure</a></li>
                  <li><a href="#security" className="hover:text-gray-900">Security</a></li>
                  <li><a href="#rights" className="hover:text-gray-900">Your Rights</a></li>
                  <li><a href="#contact" className="hover:text-gray-900">Contact</a></li>
                </ul>
              </nav>

              <article className="prose prose-neutral max-w-none lg:flex-1">
                <section id="intro">
                  <h2>Introduction</h2>
                  <p>
                    Amar Somoy, Amar Desh (ASAD) respects your privacy. This Privacy Policy
                    explains what personal data we collect, how we use it, who we share it with,
                    and the choices you have about your information.
                  </p>
                </section>

                <section id="data">
                  <h3>Data We Collect</h3>
                  <p>We collect the information necessary to run the platform and provide services, including:</p>
                  <ul>
                    <li>Contact details: name, email, and phone number.</li>
                    <li>Account information: profile, credentials (securely stored), preferences.</li>
                    <li>Application data: institute, semester, application timestamps and status.</li>
                    <li>Payments: transaction IDs (trx IDs), payment method and optional proof images.</li>
                    <li>User content: posts, task submissions, messages and uploaded files.</li>
                    <li>Usage data: logs, IPs, device/browser metadata and cookies.</li>
                  </ul>
                </section>

                <section id="use">
                  <h3>How We Use Your Data</h3>
                  <p>We use data to deliver and improve services, for example:</p>
                  <ul>
                    <li>Process applications, verify payments and schedule interviews.</li>
                    <li>Enable member features (tasks, messaging, leaderboards).</li>
                    <li>Send important notifications and administrative messages.</li>
                    <li>Detect and prevent abuse and comply with legal obligations.</li>
                  </ul>
                </section>

                <section id="sharing">
                  <h3>Sharing &amp; Disclosure</h3>
                  <p>We only share personal data when necessary:</p>
                  <ul>
                    <li>With ASAD administrators for review and verification.</li>
                    <li>With service providers (hosting, email, analytics) under contract.</li>
                    <li>When required by law or to protect rights and safety.</li>
                  </ul>
                </section>

                <section id="security">
                  <h3>Security</h3>
                  <p>
                    We follow standard security practices (encryption in transit, hashed passwords,
                    access controls). While we work to protect your data, no system is perfect — report
                    concerns to <a className="text-blue-600" href="mailto:amarsomoyamardesh.it@gmail.com">amarsomoyamardesh.it@gmail.com</a>.
                  </p>
                </section>

                <section id="rights">
                  <h3>Your Rights</h3>
                  <p>
                    Depending on applicable law, you may request access, correction, deletion or portability
                    of your personal data. To exercise these rights contact us at the email below. We will
                    respond as required by law.
                  </p>
                </section>

                <section id="contact">
                  <h3>Contact</h3>
                  <p>If you have questions or requests about this policy, email us at <a className="text-blue-600" href="mailto:amarsomoyamardesh.it@gmail.com">amarsomoyamardesh.it@gmail.com</a>.</p>
                </section>

                <div className="mt-6">
                  <Link href="/terms" className="text-sm text-blue-600 hover:underline">Read our Terms of Service</Link>
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
