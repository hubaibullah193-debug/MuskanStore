import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Request a password reset link for your Muskan Care Center account.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/auth/forgot-password' },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
