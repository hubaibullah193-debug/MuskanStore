import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>

          <div className="prose max-w-none text-gray-700">
            <p>
              Last updated: August 2026
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Acceptance of Terms</h2>
            <p>
              By accessing our website at muskan-care.com, you accept these terms of service
              ("Terms"), all amendments, and disclaimers herein. If you do not accept these
              Terms, you may not access or use our Service.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Use of Our Service</h2>
            <p>
              The Service and original content, features, and functionality are owned by
              Muskan Care Center and are protected by international copyright, trademark,
              patent, trade secret and other laws. The Service is intended for personal use.
              You may not reproduce, distribute, modify, create derivative works of, publicly
              display, publicly perform, republish, download, store, or transmit any of the
              material on our Service without our express written permission.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Orders</h2>
            <p>
              When placing an order through our Service, you warrant that you are at least
              18 years of age. You agree to provide accurate, complete, and up-to-date
              information for your order and account. You agree to pay the price of your
              selected items and any applicable taxes.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Returns and Refunds</h2>
            <p>
              We accept returns within 30 days of purchase for unopened, unused products in
              their original packaging. Refunds will be processed to your original method of
              payment within 5-7 business days after we receive the returned item.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Intellectual Property</h2>
            <p>
              All content included on our Service, such as text, graphics, logos, images,
              and software, is the property of Muskan Care Center or its content suppliers
              and is protected by applicable intellectual property laws.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Muskan Care Center shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages,
              including without limitation lost profits, data, or other intangible losses,
              resulting from your access to or use of the Service.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of
              Pakistan, without regard to its conflict of law provisions.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul>
              <li>Email: support@muskancare.com</li>
              <li>Phone: +92 300 1234567</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}