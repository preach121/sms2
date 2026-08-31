import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>Last updated: 30 August 2026.</p>
      <p>
        SMS2 is a reseller marketplace for temporary SMS verification numbers. By creating an
        account you agree to these terms.
      </p>
      <h2 className="pt-4 font-display text-lg font-semibold text-fg">Accounts and wallet</h2>
      <p>
        You must provide accurate details. Wallet deposits via Telecel Mobile Money are credited
        only after SMS2 verifies the payment. Purchases deduct the displayed customer price, which
        is the live wholesale price multiplied by the current SMS2 markup.
      </p>
      <h2 className="pt-4 font-display text-lg font-semibold text-fg">Numbers and SMS</h2>
      <p>
        Numbers are temporary and may expire. If the upstream provider cannot assign a number,
        your wallet is not permanently charged. SMS2 does not guarantee delivery of any particular
        third-party code.
      </p>
      <h2 className="pt-4 font-display text-lg font-semibold text-fg">Acceptable use</h2>
      <p>
        Use is limited to legitimate verification, testing, and privacy-preserving purposes you are
        authorised to perform. Fraud, impersonation, unauthorised account access, spam, and other
        unlawful activity are prohibited. We may suspend accounts and refuse refunds for abuse.
      </p>
      <h2 className="pt-4 font-display text-lg font-semibold text-fg">Liability</h2>
      <p>
        SMS2 is provided as available. We are not liable for upstream outages, third-party
        platform decisions, or losses arising from prohibited use.
      </p>
    </LegalPage>
  );
}
