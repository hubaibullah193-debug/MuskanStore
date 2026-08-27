import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-paper-2">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* About */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">About</h3>
            <p className="text-sm text-secondary">
              Muskan Care Center is your trusted source for personal hygiene products.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="text-sm text-secondary hover:text-foreground">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?category=skincare" className="text-sm text-secondary hover:text-foreground">
                  Skincare
                </Link>
              </li>
              <li>
                <Link href="/products?category=personal" className="text-sm text-secondary hover:text-foreground">
                  Personal Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/account" className="text-sm text-secondary hover:text-foreground">
                  My Account
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-sm text-secondary hover:text-foreground">
                  Order History
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-sm text-secondary hover:text-foreground">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-sm text-secondary hover:text-foreground">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-sm text-secondary hover:text-foreground">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/shipping#returns" className="text-sm text-secondary hover:text-foreground">
                  Returns
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-sm text-secondary">
              &copy; {new Date().getFullYear()} Muskan Care Center. All rights reserved.
            </p>
            <div className="mt-4 flex space-x-6 md:mt-0">
              <Link href="/privacy-policy" className="text-sm text-secondary hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/shipping#returns" className="text-sm text-secondary hover:text-foreground">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
