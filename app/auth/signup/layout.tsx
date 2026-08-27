import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a Muskan Care Center account to track orders and enjoy faster checkout.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/auth/signup' },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
