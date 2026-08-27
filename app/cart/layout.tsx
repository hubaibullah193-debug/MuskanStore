import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shopping Cart',
  description: 'Review the items in your Muskan Care Center cart and proceed to secure checkout.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/cart' },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
