import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/acceptable-use")({ component: Aup });

function Aup() {
  return (
    <LegalPage title="Acceptable Use Policy">
      <p>Last updated: 30 August 2026.</p>
      <p>
        SMS2 is intended for legitimate verification, application testing, and privacy-preserving
        uses where you have the right to receive the message.
      </p>
      <h2 className="pt-4 font-display text-lg font-semibold text-fg">Prohibited</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Fraud, scams, or financial crime</li>
        <li>Impersonation of another person or organisation</li>
        <li>Unauthorised access to third-party accounts or systems</li>
        <li>Spam, bulk abuse, or platform-policy evasion at scale</li>
        <li>Harassment, child exploitation, or other unlawful activity</li>
      </ul>
      <p>
        Violations may result in immediate suspension, forfeiture of wallet balance tied to abuse,
        and referral to law enforcement where required.
      </p>
    </LegalPage>
  );
}
