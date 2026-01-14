import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-12 pt-28">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-sm text-neutral-600">Last updated: January 2026</p>

        <section className="mt-8 prose">
        <p>
          These Terms of Service ("Terms") govern your use of the website and services
          provided by Amar Somoy, Amar Desh (ASAD). By accessing
          or using our website, mobile site, or services you agree to these Terms. If
          you do not agree, do not use the services.
        </p>

        <h2>1. Services</h2>
        <p>ASAD provides a public website and a member portal for volunteers, administrators, and the public.</p>
        <ul>
          <li>Volunteer applications and interview scheduling.</li>
          <li>Official volunteer upgrades (payment, verification, ID issuance).</li>
          <li>Task creation, submission reviews, and an automated points & ranking system.</li>
          <li>Donation campaigns with admin approval and reporting.</li>
          <li>Event pages, posts, galleries, and private messaging features.</li>
          <li>Admin tools for reviewing applications, submissions, and donations.</li>
        </ul>

        <h2>2. Eligibility</h2>
        <p>You must be at least 13 years old to access public content. Access to member-only features may require additional verification such as an interview or fee payment.</p>
        <p>By registering you represent that the information you submit is accurate and that you are authorized to provide it.</p>

        <h2>3. Accounts, Security & Credentials</h2>
        <p>
          When you create an account you must provide accurate information. Keep your password
          secure and notify us promptly of any unauthorized use. We are not responsible for
          losses caused by unauthorized access when account credentials are compromised.
        </p>

        <h2>4. Payments, Fees & Transaction IDs</h2>
        <p>Some actions require payments (application fee, official conversion fee, donations). For the MVP these payments are submitted manually via third‑party mobile providers (for example, bKash or Nagad).</p>
        <p>When you submit a payment you will provide a transaction ID ("trx ID") and may upload a proof image. Submission of a trx ID does not guarantee acceptance — all payments are subject to manual verification by ASAD administrators.</p>
        <p>Refunds, cancellations, and disputes are handled on a case‑by‑case basis. We are not responsible for failed external transfers or disputes with payment providers; please retain receipts and follow the guidance shown on the relevant page.</p>

        <h2>5. User Content & Conduct</h2>
        <p>You are solely responsible for content you post or submit (profiles, posts, task submissions, messages, images).</p>
        <p>You must not post illegal, defamatory, infringing, hateful, or sexually explicit material. ASAD may remove content that violates these Terms and may suspend or terminate accounts for violations.</p>

        <h2>6. Task Submissions, Approvals & Points</h2>
        <p>
          Tasks created by secretaries or admins may award or deduct points based on approved
          submissions. Approval decisions are made by authorized reviewers; ASAD is not liable
          for point allocation disputes beyond our internal review processes. Ranks and points
          are subject to the rules published by ASAD and may be changed by administrators.
        </p>

        <h2>7. Donations</h2>
        <p>
          Donations submitted through the site are recorded with the provided trx ID and proof
          and must be approved by an admin to be marked complete. Donation campaigns have
          deadlines and may be closed or archived. Donation receipts and reporting follow
          administrative procedures; we may provide confirmation emails after manual approval.
        </p>

        <h2>8. Intellectual Property</h2>
        <p>
          All content, trademarks, logos and code on the site are our property or used with
          permission. You may not reproduce or redistribute our content without express consent.
        </p>

        <h2>9. Disclaimers & Limitation of Liability</h2>
        <p>
          The site and services are provided "as is". We disclaim all warranties to the fullest
          extent permitted by law. ASAD and its affiliates are not liable for indirect,
          incidental, special, punitive or consequential damages arising from your use of the
          site, including disputes over payments processed off-platform.
        </p>

        <h2>10. Indemnification</h2>
        <p>
          You agree to indemnify and hold ASAD harmless from claims, losses, liabilities,
          damages, and expenses (including legal fees) arising from your breach of these Terms
          or your user content.
        </p>

        <h2>11. Termination</h2>
        <p>
          We may suspend or terminate access for users who violate these Terms or for operational
          reasons. Upon termination certain content or features may be disabled or removed.
        </p>

        <h2>12. Changes to Terms</h2>
        <p>
          We may modify these Terms; we will post updates and a "last updated" date. Continued
          use after changes constitutes acceptance.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by the laws of Bangladesh (unless otherwise required by law).
          Disputes will be handled under applicable law and venue.
        </p>

        <h2>14. Contact</h2>
        <p>
          For questions about these Terms or to reach our admin team, email: amarsomoyamardesh.it@gmail.com
        </p>

        <p>
          <Link href="/privacy">Read our Privacy Policy</Link>
        </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
