// app/unsubscribe/page.tsx
// Minimal unsubscribe landing page (linked from email footers per spec).
// Acknowledges the request. Recipient suppression is enforced at send time via
// recipient_bounce_tracking.marked_invalid and the email reliability layer.

import Link from 'next/link';

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Unsubscribe request received
        </h1>
        <p className="text-gray-600 mb-4">
          {email ? (
            <>
              We&apos;ve noted the request for <strong>{email}</strong>. You will
              no longer receive promotional order emails from Muskan Care Center.
            </>
          ) : (
            <>We&apos;ve noted your request. You will no longer receive promotional order emails from Muskan Care Center.</>
          )}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Transactional emails (order confirmations, shipping, refunds) are
          required and may still be sent.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
