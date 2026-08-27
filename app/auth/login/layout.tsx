import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Muskan Care Center account to view orders and manage your profile.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/auth/login' },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
