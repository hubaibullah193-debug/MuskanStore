import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} collects, uses, and protects your personal information. Read our privacy policy for details on data, cookies, and security.`,
  alternates: { canonical: '/privacy-policy' },
  openGraph: {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
};

/* eslint-disable react/no-unescaped-entities */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <article className="bg-card border border-border rounded-lg shadow-sm p-8 sm:p-10">
          <h1 className="font-display text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
          <p className="text-text-tertiary text-sm mb-6">Last updated: August 2026</p>

          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground">Information We Collect</h2>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>
                <strong>Personal Data:</strong> When you place an order or create an account, we may collect your name, email address, postal address, phone number, and payment information.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you access and use our Service, including the type of device you use, your IP address, browser type, and access times.
              </li>
              <li>
                <strong>Cookies: We use cookies to enable certain features of our Service, to store your preferences, and to track usage.</strong>
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground mt-8">How We Use Your Information</h2>
            <p className="text-text-secondary">
              We use the information we collect to: operate and maintain our Service, improve our Service, process transactions and send you order confirmations, monitor the usage of our Service, detect, prevent, and address technical issues, and send you updates or promotional communications.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Cookies</h2>
            <p className="text-text-secondary">
              We use cookies to familiarize us with your preferences and to provide you with a better experience. If you decline cookies, you may not be able to use some portions of our Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Security</h2>
            <p className="text-text-secondary">
              We strive to use commercially acceptable means to protect your personal information. But remember that no method of transmission over the Internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Links to Other Sites</h2>
            <p className="text-text-secondary">
              Our Service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the privacy policy of every site you visit.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Changes to This Privacy Policy</h2>
            <p className="text-text-secondary">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Contact Us</h2>
            <p className="text-text-secondary">
              If you have any questions about this Privacy Policy, you can contact us:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>Email: support@muskancare.com</li>
              <li>Phone: +92 300 1234567</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
