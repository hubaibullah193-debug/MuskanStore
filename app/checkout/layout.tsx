import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your Muskan Care Center order with secure checkout and multiple payment options.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/checkout' },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
