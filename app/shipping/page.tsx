import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Info & Returns | Muskan Care',
  description: 'Shipping policies, delivery timeframes, and return/refund information for Muskan Care Center.',
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping Info & Returns</h1>

        {/* Shipping Info */}
        <section className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Shipping Policy</h2>

          <div className="space-y-6 text-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Timeframes</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Lahore:</strong> 1-2 business days</li>
                <li><strong>Other major cities (Karachi, Islamabad, Faisalabad, Rawalpindi):</strong> 2-3 business days</li>
                <li><strong>Other areas:</strong> 3-5 business days</li>
              </ul>
              <p className="mt-2 text-sm text-gray-600">
                Orders placed before 2:00 PM PKT are processed the same day. Orders placed after 2:00 PM or on weekends/holidays are processed the next business day.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Shipping Methods</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Standard Delivery:</strong> Rs 300 flat rate across Pakistan</li>
                <li><strong>Cash on Delivery (COD):</strong> Available for all areas</li>
                <li><strong>Online Payment:</strong> JazzCash, Easypaisa, or bank transfer</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Tracking</h3>
              <p>
                Once your order is shipped, you will receive a tracking code via email.
                You can track your order at any time using our{' '}
                <Link href="/track-order" className="underline" style={{ color: 'var(--color-accent)' }}>
                  Track Order
                </Link>{' '}
                page.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Important Notes</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>We currently deliver within Pakistan only</li>
                <li>Please ensure your delivery address and phone number are accurate</li>
                <li>Our delivery partner will contact you before delivery</li>
                <li>If you are unavailable at the time of delivery, a second attempt will be made</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Returns & Refunds */}
        <section id="returns" className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Returns & Refunds</h2>

          <div className="space-y-6 text-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Return Eligibility</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Items must be returned within <strong>7 days</strong> of delivery</li>
                <li>Items must be unused, unopened, and in original packaging</li>
                <li>Opened or used personal hygiene products cannot be returned for hygiene reasons</li>
                <li>Damaged or defective items are eligible for full refund or replacement</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Request a Return</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to your <Link href="/account" className="underline" style={{ color: 'var(--color-accent)' }}>Account</Link> or <Link href="/orders" className="underline" style={{ color: 'var(--color-accent)' }}>Order History</Link></li>
                <li>Find the order containing the item you want to return</li>
                <li>Click &quot;Request Refund&quot; and provide a reason</li>
                <li>Our team will review your request within 2 business days</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Refund Process</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Once approved, refunds are processed within 5-7 business days</li>
                <li>Refunds are credited to the original payment method</li>
                <li>For COD orders, refunds are sent via JazzCash/Easypaisa or bank transfer</li>
                <li>You will receive email notifications at each step of the refund process</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Non-Returnable Items</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Opened or used personal care products</li>
                <li>Products without original packaging</li>
                <li>Items marked as &quot;Final Sale&quot; at time of purchase</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Damaged or Defective Items</h3>
              <p>
                If you receive a damaged or defective item, please contact us within 48 hours of delivery.
                Include photos of the damage and your order number. We will arrange a replacement or full refund.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions about shipping or returns, our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:support@muskancare.com"
              className="inline-block px-6 py-2 text-white rounded-lg text-center"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Email Support
            </a>
            <Link
              href="/track-order"
              className="inline-block px-6 py-2 text-gray-900 bg-gray-100 rounded-lg text-center hover:bg-gray-200"
            >
              Track Your Order
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
