import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-12 pt-28">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-sm text-neutral-600">Last updated: January 2026</p>

        <section className="mt-8 prose">
        <h2>Introduction</h2>
        <p>
          Amar Somoy, Amar Desh (ASAD) respects your privacy. This Privacy Policy
          explains what personal data we collect, how we use it, who we share it with, and your
          rights.
        </p>

        <h2>1. Data We Collect</h2>
        <p>We collect information needed to operate the service, including:</p>
        <ul>
          <li>Contact information: name, email, phone number.</li>
          <li>Application data: institute, semester, application timestamps, interview dates, and status.</li>
          <li>Account data: password hashes (securely stored), profile photo, bio.</li>
          <li>Payment details: transaction IDs ("trx IDs"), payment method, and optional proof images.</li>
          <li>User content: posts, task submissions, messages, and uploaded files.</li>
          <li>Usage data: logs, IP addresses, device/browser metadata, and cookies.</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <p>We use personal data to:</p>
        <ul>
          <li>Process applications, schedule interviews, and manage volunteer status.</li>
          <li>Verify payments and donation submissions using provided trx IDs and proofs.</li>
          <li>Run member features such as tasks, posts, messaging, and leaderboards.</li>
          <li>Send notifications, confirmations, and administrative communications.</li>
          <li>Protect the platform, detect fraud, and comply with legal obligations.</li>
        </ul>

        <h2>3. Legal Bases</h2>
        <p>Where required by law, we process personal data on one or more of these bases: consent, performance of a contract (to provide services), legal compliance, or legitimate interests (operating and improving the platform).</p>

        <h2>4. Sharing & Disclosure</h2>
        <p>We may share personal data with:</p>
        <ul>
          <li>ASAD administrators and authorized secretaries for application reviews, approvals, and campaign management.</li>
          <li>Service providers (hosting, email, analytics) who process data under contract and only as necessary.</li>
          <li>Legal authorities when required by law or to protect rights, property, or safety.</li>
        </ul>

        <h2>5. Uploads, Images & Proofs</h2>
        <p>Uploaded files (profile photos, payment proofs) are stored in our file storage or a cloud storage provider. Do not upload sensitive personal documents unless specifically requested. We recommend removing or redacting unnecessary sensitive information before uploading.</p>

        <h2>6. Cookies & Tracking</h2>
        <p>
          We use cookies and similar technologies for site functionality, analytics, and
          performance. You can manage cookie preferences in your browser. Third-party services
          used for analytics may also set cookies.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We retain personal data for as long as necessary to provide services, for legal
          compliance, or for legitimate business purposes. Application records, donation
          receipts and accounting-related data may be kept for longer to satisfy financial
          recordkeeping requirements.
        </p>

        <h2>8. Security</h2>
        <p>We implement reasonable security measures such as encryption in transit, hashed passwords, and role-based access controls. Despite these measures, no system is completely secure. Report suspected breaches or security concerns to amarsomoyamardesh.it@gmail.com.</p>

        <h2>9. Your Rights</h2>
        <p>
          Depending on applicable law, you may have the right to access, correct, port, or
          delete your personal data, and to object to or restrict certain processing. To
          exercise rights, contact us at amarsomoyamardesh.it@gmail.com. We will respond as
          required by law.
        </p>

        <h2>10. Children's Privacy</h2>
        <p>
          Our services are not intended for children under 13. We do not knowingly collect
          personal data from children under 13. If you believe we have collected such data,
          contact us and we will take steps to delete it.
        </p>

        <h2>11. International Transfers</h2>
        <p>
          Data may be processed and stored in locations outside your country. When we do so,
          we take steps to protect personal data consistent with this policy and applicable
          law.
        </p>

        <h2>12. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy. We will post the updated policy and a
          "last updated" date. Continued use after changes constitutes acceptance.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions, data requests or concerns: amarsomoyamardesh.it@gmail.com
        </p>

        <p>
          <Link href="/terms">Read our Terms of Service</Link>
        </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
