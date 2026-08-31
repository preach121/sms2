import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>Last updated: 30 August 2026.</p>
      <p>
        SMS2 collects the account information you submit (name, email, optional phone), wallet
        and order records, deposit references, and technical logs needed to operate the service.
      </p>
      <h2 className="pt-4 font-display text-lg font-semibold text-fg">How we use data</h2>
      <p>
        Data is used to authenticate you, process deposits and purchases, obtain numbers on your
        behalf, prevent fraud, and keep audit logs. We do not sell personal data.
      </p>
      <h2 className="pt-4 font-display text-lg font-semibold text-fg">Upstream processing</h2>
      <p>
        When you buy a number, SMS2 sends country and service identifiers to its number suppliers.
        Incoming SMS content is stored on your order so you can retrieve the code.
      </p>
      <h2 className="pt-4 font-display text-lg font-semibold text-fg">Retention</h2>
      <p>
        Wallet transactions, orders, and audit logs are kept for accounting and security. You may
        request account closure; some records may be retained where the law requires it.
      </p>
    </LegalPage>
  );
}
