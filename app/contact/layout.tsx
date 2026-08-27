import type { Metadata } from 'next';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with the ${SITE_NAME} support team for orders, shipping, and product questions. We typically respond within 1-2 business days.`,
  alternates: { canonical: '/contact' },
  openGraph: {
    title: `Contact Us | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
