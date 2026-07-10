import type { Metadata } from "next";
import { LegalShell, H2, P, UL } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — NamziLabs",
  description: "How NamziLabs collects, uses, stores and protects your data.",
  robots: { index: true, follow: true },
};

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@namzilabs.co";
const UPDATED = "July 10, 2026";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={UPDATED}>
      <P>
        This Privacy Policy explains how NamziLabs (“we”, “us”, “our”) collects,
        uses, stores, shares and protects information in connection with NamziLabs
        (the “Service”), a unified data-tracking dashboard that pulls data from
        the tools you connect — such as Google Sheets, Close CRM, Calendly,
        SendBlue, Instantly and inbound webhooks — into one place. By using the
        Service you agree to this Policy.
      </P>

      <H2>Information we collect</H2>
      <P>
        We collect only what we need to operate the Service for you:
      </P>
      <UL>
        <li>
          <b>Account &amp; access data.</b> The Service is protected by a password
          you configure. We store a signed session cookie to keep you logged in.
        </li>
        <li>
          <b>Integration credentials.</b> API keys, access tokens and OAuth
          refresh tokens for the tools you connect. These are encrypted at rest
          (see “How we protect your data”).
        </li>
        <li>
          <b>Data from connected sources.</b> Records and metrics we pull from the
          tools you connect — for example spreadsheet rows, CRM leads and
          opportunities, bookings, messages and campaign statistics — used to
          compute the metrics shown on your dashboard.
        </li>
        <li>
          <b>Google user data.</b> If you connect Google, we use Google OAuth to
          request <b>read-only</b> access to (a) your Google Drive file
          metadata, solely to let you browse and select which spreadsheet to
          connect, and (b) the contents of the specific Google Sheet(s) you
          choose, solely to read the rows and columns needed to calculate your
          metrics. We do not request write access, and we do not access files you
          have not selected.
        </li>
      </UL>

      <H2>How we use information</H2>
      <UL>
        <li>To operate the Service and display your unified dashboard.</li>
        <li>To calculate the metrics and trends you configure.</li>
        <li>To keep data current through scheduled syncs and inbound webhooks.</li>
        <li>To secure the Service, prevent abuse and troubleshoot issues.</li>
      </UL>
      <P>
        We do <b>not</b> use your data for advertising, and we do <b>not</b> use
        Google user data to train generalized artificial-intelligence or machine-
        learning models.
      </P>

      <H2>Google API Services — Limited Use</H2>
      <P>
        NamziLabs&apos;s use and transfer of information received from Google APIs
        will adhere to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          className="text-brand-soft hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including its Limited Use requirements. Specifically, data obtained from
        Google APIs is used only to provide and improve user-facing features of
        NamziLabs that are prominent in the interface; is not transferred to others
        except as necessary to provide those features, to comply with applicable
        law, or as part of a merger or acquisition; is not used or transferred for
        advertising; and is not used to train generalized AI/ML models. Humans do
        not read this data unless we have your consent for specific messages, it
        is necessary for security or to comply with the law, or the data has been
        aggregated and anonymized.
      </P>

      <H2>How we share information</H2>
      <P>
        We do <b>not</b> sell your data. We do not share Google user data with
        third parties except as required to operate the Service, namely:
      </P>
      <UL>
        <li>
          <b>Infrastructure providers</b> that host the application and database
          on our behalf and process data only under our instructions.
        </li>
        <li>
          <b>At your direction</b> — the tools you choose to connect and the
          destinations you configure.
        </li>
        <li>
          <b>Legal reasons</b> — where required by law, legal process, or to
          protect the rights, safety and security of users and the public.
        </li>
      </UL>

      <H2>How we protect your data</H2>
      <UL>
        <li>
          Integration credentials and OAuth tokens are encrypted at rest using
          AES-256-GCM with a server-side key (<code>CREDENTIALS_SECRET</code>).
        </li>
        <li>All traffic is served over HTTPS/TLS.</li>
        <li>
          Access to the dashboard is gated behind authentication, and inbound
          webhook endpoints use unguessable per-source tokens.
        </li>
      </UL>
      <P>
        No method of transmission or storage is 100% secure, but we work to
        protect your information using industry-standard safeguards.
      </P>

      <H2>Data retention &amp; deletion</H2>
      <P>
        You stay in control of your data:
      </P>
      <UL>
        <li>
          <b>Disconnect any integration</b> at any time from the Integrations
          page. Deleting an integration removes its stored credentials/tokens and
          the records and metrics we pulled for it.
        </li>
        <li>
          <b>Revoke Google access</b> directly at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="text-brand-soft hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          .
        </li>
        <li>
          <b>Request full deletion</b> of your account and associated data by
          contacting us at the address below.
        </li>
      </UL>

      <H2>Your rights</H2>
      <P>
        Depending on where you live, you may have rights to access, correct,
        export or delete your personal information, and to object to or restrict
        certain processing. To exercise these rights, contact us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-brand-soft hover:underline">
          {CONTACT}
        </a>
        .
      </P>

      <H2>Children</H2>
      <P>
        NamziLabs is a business tool not directed to children and is not intended for
        anyone under 16. We do not knowingly collect data from children.
      </P>

      <H2>Changes to this Policy</H2>
      <P>
        We may update this Policy from time to time. When we do, we will revise
        the “Last updated” date above and, where appropriate, provide additional
        notice.
      </P>

      <H2>Contact us</H2>
      <P>
        Questions about this Policy or your data? Email us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-brand-soft hover:underline">
          {CONTACT}
        </a>
        .
      </P>
    </LegalShell>
  );
}
