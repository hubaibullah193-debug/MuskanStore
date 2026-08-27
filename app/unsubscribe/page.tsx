// app/unsubscribe/page.tsx
// Minimal unsubscribe landing page (linked from email footers per spec).
// Acknowledges the request. Recipient suppression is enforced at send time via
// recipient_bounce_tracking.marked_invalid and the email reliability layer.

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-sm p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Unsubscribe request received
        </h1>
        <p className="text-text-secondary mb-4">
          {email ? (
            <>
              We&apos;ve noted the request for <strong>{email}</strong>. You will
              no longer receive promotional order emails from Muskan Care Center.
            </>
          ) : (
            <>We&apos;ve noted your request. You will no longer receive promotional order emails from Muskan Care Center.</>
          )}
        </p>
        <p className="text-sm text-text-tertiary mb-6">
          Transactional emails (order confirmations, shipping, refunds) are
          required and may still be sent.
        </p>
        <Button href="/">
          Back to Home
        </Button>
      </div>
    </div>
  );
}
