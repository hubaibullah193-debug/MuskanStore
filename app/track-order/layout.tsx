import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Track Your Order',
  description: `Track your Muskan Care Center order status by entering your email and tracking code.`,
  alternates: { canonical: '/track-order' },
  openGraph: {
    title: `Track Your Order | ${SITE_NAME}`,
    description: 'Track your order status by entering your email and tracking code.',
  },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
