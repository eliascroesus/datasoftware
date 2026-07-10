import type { Metadata } from "next";
import { LegalShell, H2, P, UL } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — NamziLabs",
  description: "The terms that govern your use of NamziLabs.",
  robots: { index: true, follow: true },
};

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@namzilabs.co";
const UPDATED = "July 10, 2026";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated={UPDATED}>
      <P>
        These Terms of Service (“Terms”) govern your access to and use of NamziLabs
        (the “Service”), operated by NamziLabs (“we”, “us”, “our”). By accessing
        or using the Service, you agree to these Terms. If you do not agree, do
        not use the Service.
      </P>

      <H2>1. The Service</H2>
      <P>
        NamziLabs is a unified data-tracking dashboard that connects to third-party
        tools you authorize — such as Google Sheets, Close CRM, Calendly,
        SendBlue, Instantly and inbound webhooks — and consolidates their data
        into metrics and dashboards you configure.
      </P>

      <H2>2. Eligibility &amp; accounts</H2>
      <UL>
        <li>You must be at least 16 years old to use the Service.</li>
        <li>
          You are responsible for maintaining the confidentiality of your login
          credentials and for all activity that occurs under your account.
        </li>
        <li>You must provide accurate information and keep it up to date.</li>
      </UL>

      <H2>3. Your data &amp; connected integrations</H2>
      <UL>
        <li>
          <b>You own your data.</b> As between you and us, you retain all rights
          to the data you connect and the data we pull on your behalf.
        </li>
        <li>
          <b>License to operate.</b> You grant us a limited license to access,
          process and store that data solely to provide and maintain the Service
          for you, as described in our{" "}
          <a href="/privacy" className="text-brand-soft hover:underline">
            Privacy Policy
          </a>
          .
        </li>
        <li>
          <b>Authorization.</b> You represent that you have the right to connect
          each account and to authorize us to access it on your behalf, and that
          doing so does not violate any third party&apos;s terms or rights.
        </li>
        <li>
          <b>Third-party terms.</b> Your use of connected services (e.g. Google,
          Close, Calendly, SendBlue, Instantly) remains subject to those
          providers&apos; own terms and policies.
        </li>
      </UL>

      <H2>4. Acceptable use</H2>
      <P>You agree not to:</P>
      <UL>
        <li>Use the Service for any unlawful, harmful or fraudulent purpose.</li>
        <li>
          Attempt to gain unauthorized access to the Service, other accounts, or
          our systems or networks.
        </li>
        <li>
          Interfere with or disrupt the integrity or performance of the Service.
        </li>
        <li>
          Reverse engineer or attempt to extract source code except as permitted
          by law.
        </li>
        <li>Use the Service to store or transmit malicious code.</li>
      </UL>

      <H2>5. Intellectual property</H2>
      <P>
        The Service, including its software, design and content (excluding your
        data), is owned by NamziLabs and protected by intellectual-property laws.
        These Terms do not grant you any right to our trademarks or branding.
      </P>

      <H2>6. Third-party services</H2>
      <P>
        The Service integrates with third-party products. We are not responsible
        for those products, their availability, or their handling of your data.
        Your relationship with each provider is governed by your agreement with
        them.
      </P>

      <H2>7. Disclaimers</H2>
      <P>
        The Service is provided “as is” and “as available” without warranties of
        any kind, whether express or implied, including but not limited to
        warranties of merchantability, fitness for a particular purpose,
        accuracy, and non-infringement. We do not warrant that the Service will be
        uninterrupted, error-free, or that data pulled from third parties will be
        complete or accurate.
      </P>

      <H2>8. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, NamziLabs and its affiliates will
        not be liable for any indirect, incidental, special, consequential or
        punitive damages, or any loss of profits, revenue, data or goodwill,
        arising out of or related to your use of the Service. Our total liability
        for any claim relating to the Service will not exceed the greater of the
        amount you paid us in the twelve months before the claim, or USD $100.
      </P>

      <H2>9. Indemnification</H2>
      <P>
        You agree to indemnify and hold harmless NamziLabs from any claims,
        losses or expenses arising from your misuse of the Service, your data, or
        your violation of these Terms or applicable law.
      </P>

      <H2>10. Termination</H2>
      <P>
        You may stop using the Service and delete your integrations at any time.
        We may suspend or terminate access if you violate these Terms or if
        necessary to protect the Service or its users. Upon termination, the
        rights granted to you under these Terms will end.
      </P>

      <H2>11. Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time. Material changes will be
        reflected by updating the “Last updated” date above. Your continued use of
        the Service after changes take effect constitutes acceptance.
      </P>

      <H2>12. Governing law</H2>
      <P>
        These Terms are governed by the laws applicable at NamziLabs&apos;
        principal place of business, without regard to conflict-of-laws
        principles. Disputes will be resolved in the courts of that jurisdiction.
      </P>

      <H2>13. Contact</H2>
      <P>
        Questions about these Terms? Email us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-brand-soft hover:underline">
          {CONTACT}
        </a>
        .
      </P>
    </LegalShell>
  );
}
