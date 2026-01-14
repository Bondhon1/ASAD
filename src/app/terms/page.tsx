import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-4 text-sm text-neutral-600">Last updated: January 2026</p>

      <section className="mt-8 prose">
        <p>
          These Terms of Service ("Terms") govern your use of the website and services
          provided by Amar Somoy, Amar Desh ("ASAD", "we", "us", "our"). By accessing
          or using our website, mobile site, or services you agree to these Terms. If
          you do not agree, do not use the services.
        </p>

        <h2>1. Services</h2>
        <p>
          ASAD provides a public website and a member portal for volunteers, administrators,
          and the public. Features include volunteer applications, interview scheduling,
          official volunteer upgrades, a task and ranking system, donation campaigns,
          events, posts, and messaging features. Admins and secretaries may create tasks,
          approve submissions, and manage donation campaigns.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old to access public content. Becoming a registered
          volunteer or using member features may require additional eligibility and verification
          (e.g., interview, payment). By registering you represent that the information you
          submit is accurate and that you have authority to submit it.
        </p>

        <h2>3. Accounts, Security & Credentials</h2>
        <p>
          When you create an account you must provide accurate information. Keep your password
          secure and notify us promptly of any unauthorized use. We are not responsible for
          losses caused by unauthorized access when account credentials are compromised.
        </p>

        <h2>4. Payments, Fees & Transaction IDs</h2>
        <p>
          Certain flows require payments (application fee, official volunteer conversion,
          donations). For our MVP these are paid manually via third-party mobile providers
          (e.g., bKash, Nagad). You will provide a transaction ID ("trx ID") and may upload
          a proof image. Submission of a trx ID does not guarantee acceptance — payments
          are subject to manual verification by admins.
        </p>
        <p>
          Refunds, cancellations and disputes are handled case-by-case. We are not responsible
          for failed external transfers or disputes with payment providers; keep receipts and
          follow the guidance on the donation or application page.
        </p>

        <h2>5. User Content & Conduct</h2>
        <p>
          You are solely responsible for the content you post, upload, or submit through the
          site (profiles, posts, task submissions, messages, images). You agree not to post
          illegal, libelous, infringing, hateful, or sexually explicit content. We may remove
          content that violates these Terms and suspend or terminate accounts.
        </p>

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
  );
}
