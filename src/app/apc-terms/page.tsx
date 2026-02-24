import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'APC Terms & Policy | ASAD',
  description: 'Asadian Performance Credit (APC) Program Terms and Policy',
};

export default function APCTermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-16 pt-28">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-8 py-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {/* APC coin — float animation, full colour */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/creditlogo.svg" alt="APC" className="w-10 h-10 flex-shrink-0" style={{ animation: 'apc-coin-float 3s ease-in-out infinite' }} />
                  <h1 className="text-3xl font-semibold text-gray-900">
                    APC Terms &amp; Policy
                  </h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Asadian Performance Credit (APC) Program &mdash; Effective Date: February 2026
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-[#0b2545] hover:underline"
              >
                ← Back to Dashboard
              </Link>
            </div>

            <div className="mt-8 sm:mt-10 lg:flex lg:gap-8">
              {/* Side nav */}
              <nav className="hidden lg:block w-56 shrink-0">
                <ul className="sticky top-28 space-y-2 text-sm text-gray-600">
                  <li><a href="#nature" className="hover:text-gray-900">1. Nature of the Program</a></li>
                  <li><a href="#credits" className="hover:text-gray-900">2. Status of Credits</a></li>
                  <li><a href="#allocation" className="hover:text-gray-900">3. Credit Allocation</a></li>
                  <li><a href="#eligibility" className="hover:text-gray-900">4. Incentive Eligibility</a></li>
                  <li><a href="#payment" className="hover:text-gray-900">5. Incentive Payment</a></li>
                  <li><a href="#relationship" className="hover:text-gray-900">6. No Financial Relationship</a></li>
                  <li><a href="#taxes" className="hover:text-gray-900">7. Taxes</a></li>
                  <li><a href="#misuse" className="hover:text-gray-900">8. Misuse and Fraud</a></li>
                  <li><a href="#modification" className="hover:text-gray-900">9. Modification</a></li>
                  <li><a href="#law" className="hover:text-gray-900">10. Governing Law</a></li>
                </ul>
              </nav>

              {/* Content */}
              <article className="max-w-none lg:flex-1 space-y-6 text-gray-700 leading-relaxed text-sm">
                <p>
                  This APC (Asadian Performance Credit) Program (&ldquo;Program&rdquo;) is an internal
                  performance recognition system administered by <strong>Amar Somoy, Amar Desh (&ldquo;Organization&rdquo;)</strong>.
                  This Policy governs participation in the Program. By participating, you acknowledge and agree
                  to be bound by this Policy.
                </p>

                {/* Section 1 */}
                <section id="nature" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">1. Nature of the Program</h3>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>The Program is an internal performance recognition system.</li>
                    <li>
                      It is <strong>not</strong> a financial service, digital wallet, stored-value system,
                      deposit scheme, or digital currency.
                    </li>
                    <li>The Program is not open to the public and is limited to approved participants.</li>
                    <li>
                      Nothing in this Program creates any regulated financial activity under the laws
                      of Bangladesh.
                    </li>
                  </ul>
                </section>

                {/* Section 2 */}
                <section id="credits" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">2. Status of Credits</h3>
                  <p className="mb-2">&ldquo;Credits&rdquo; are internal performance points only. Credits:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Have <strong>no monetary value</strong></li>
                    <li>Are not money, property, or assets</li>
                    <li>Are not transferable or tradeable</li>
                    <li>Cannot be withdrawn or redeemed for cash</li>
                    <li>Do not create any debt or payment obligation</li>
                  </ul>
                  <p className="mt-2">Credits are used solely to measure participation and contribution.</p>
                </section>

                {/* Section 3 */}
                <section id="allocation" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">3. Credit Allocation</h3>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Credits may be assigned at the sole discretion of the Organization.</li>
                    <li>
                      The Organization may modify, adjust, cancel, or remove Credits at any time,
                      including in cases of misconduct, fraud, error, or policy violation.
                    </li>
                    <li>Displayed Credit balances are informational only and may be corrected.</li>
                  </ul>
                </section>

                {/* Section 4 */}
                <section id="eligibility" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    4. Incentive Eligibility (Discretionary)
                  </h3>
                  <p className="mb-2">
                    Accumulating Credits may make a participant <em>eligible for consideration</em> of a
                    discretionary incentive. Current eligibility structure:
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                    <ul className="list-disc ml-5 space-y-1">
                      <li>
                        <strong>10,000 Credits</strong> → Eligible for consideration of{' '}
                        <strong>2,000 BDT</strong>
                      </li>
                      <li>
                        Each additional <strong>5,000 Credits</strong> → Eligible for consideration of{' '}
                        <strong>1,000 BDT</strong>
                      </li>
                    </ul>
                    <p className="text-xs text-blue-700 mt-2 font-medium">
                      Example: 17,000 Credits → Eligible BDT: 3,000 &bull; Credits deducted: 15,000 &bull; Remaining: 2,000
                    </p>
                  </div>
                  <p className="mb-1">Eligibility does <strong>not</strong> guarantee payment. Incentives are subject to:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Administrative approval</li>
                    <li>Budget availability</li>
                    <li>Compliance and conduct review</li>
                  </ul>
                  <p className="mt-2">
                    The Organization may approve, deny, modify, or defer any incentive at its sole
                    discretion.
                  </p>
                </section>

                {/* Section 5 */}
                <section id="payment" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">5. Incentive Payment Process</h3>
                  <p className="mb-2">Approved incentives are paid directly via licensed channels such as:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>bKash</li>
                    <li>Nagad</li>
                    <li>Bank transfer</li>
                  </ul>
                  <p className="mt-3">The Organization:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Does not hold participant funds</li>
                    <li>Does not maintain withdrawable balances</li>
                    <li>Does not operate a wallet or stored-value system</li>
                  </ul>
                  <p className="mt-2">
                    Incentive payments are discretionary organizational payments and may be processed
                    monthly or as determined by the Organization.
                  </p>
                </section>

                {/* Section 6 */}
                <section id="relationship" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    6. No Employment or Financial Relationship
                  </h3>
                  <p>
                    Participation does not create employment, partnership, agency, or financial service
                    relationships. Incentives do not constitute salary or wages unless separately agreed
                    in writing.
                  </p>
                </section>

                {/* Section 7 */}
                <section id="taxes" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">7. Taxes</h3>
                  <p>
                    Participants are responsible for any applicable taxes. The Organization may deduct
                    taxes if required by law.
                  </p>
                </section>

                {/* Section 8 */}
                <section id="misuse" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">8. Misuse and Fraud</h3>
                  <p>
                    The Organization may suspend or terminate participation for fraud, manipulation,
                    misuse, or policy violations. Credits may be cancelled and incentives revoked.
                  </p>
                </section>

                {/* Section 9 */}
                <section id="modification" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">9. Modification or Termination</h3>
                  <p>
                    The Organization may modify or terminate the Program at any time. Participants have
                    no vested rights to future incentives.
                  </p>
                </section>

                {/* Section 10 */}
                <section id="law" className="scroll-mt-28">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">10. Governing Law</h3>
                  <p>
                    This Policy is governed by the laws of Bangladesh. Disputes shall fall under the
                    jurisdiction of the courts of Dhaka.
                  </p>
                </section>

                {/* Acknowledgement box */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mt-4">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">Acknowledgment</h4>
                  <p className="text-sm text-amber-800">By participating, you acknowledge that:</p>
                  <ul className="list-disc ml-5 mt-1 space-y-1 text-sm text-amber-800">
                    <li>Credits have no monetary value</li>
                    <li>Incentives are discretionary</li>
                    <li>No financial product or wallet is being offered</li>
                    <li>No entitlement to payment is created</li>
                  </ul>
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
