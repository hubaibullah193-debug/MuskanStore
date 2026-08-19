import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

          <div className="prose max-w-none text-gray-700">
            <p>
              Last updated: August 2026
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Information We Collect</h2>
            <ul>
              <li>
                <strong>Personal Data:</strong> When you place an order or create an account, we may collect your name, email address, postal address, phone number, and payment information.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you access and use our Service, including the type of device you use, your IP address, browser type, and access times.
              </li>
              <li>
                <strong>
                  Cookies: We use cookies to enable certain features of our Service, to store your preferences, and to track usage.
                </li>
              <li>
                <strong>Cookies: We use cookies to enable certain features of our Service, to store your preferences, and to track usage.</strong>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">How We Use Your Information</h2>
            <p>
              We use the information we collect to: operate and maintain our Service, improve our Service, process transactions and send you order confirmations, monitor the usage of our Service, detect, prevent, and address technical issues, and send you updates or promotional communications.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Cookies</h2>
            <p>
              We use cookies to familiarize us with your preferences and to provide you with a better experience. If you decline cookies, you may not be able to use some portions of our Service.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Security</h2>
            <p>
              We strive to use commercially acceptable means to protect your personal information. But remember that no method of transmission over the Internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Links to Other Sites</h2>
            <p>
              Our Service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the privacy policy of every site you visit.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, you can contact us:
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