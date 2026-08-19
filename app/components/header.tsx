'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';

export function Header() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading: authLoading, logout } = useAuth();
  const { itemCount } = useCart();

  const handleLogout = async () => {
    try {
      await logout();
      setIsMenuOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-gray-900">Muskan Care</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link href="/products" className="text-gray-700 hover:text-gray-900">
              Products
            </Link>
            <Link href="/cart" data-testid="cart-link" className="text-gray-700 hover:text-gray-900 relative">
              Cart
              {itemCount > 0 && (
                <span data-testid="cart-badge" className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            <Link href="/account" className="text-gray-700 hover:text-gray-900">
              Account
            </Link>
            <Link href="/orders" className="text-gray-700 hover:text-gray-900">
              Orders
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {!authLoading && user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    className="text-sm text-gray-700 hover:text-gray-900"
                  >
                    Admin
                  </Link>
                )}
                <span className="text-sm text-gray-700">{user.name || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              </>
            ) : !authLoading ? (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-lg px-4 py-2 text-white"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    transition: 'background-color 200ms cubic-bezier(0.33, 1, 0.68, 1)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
                >
                  Sign Up
                </Link>
              </>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isMenuOpen
                    ? 'M6 18L18 6M6 6l12 12'
                    : 'M4 6h16M4 12h16M4 18h16'
                }
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="border-t border-gray-200 md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              <Link
                href="/products"
                onClick={closeMobileMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Products
              </Link>
              <Link
                href="/cart"
                onClick={closeMobileMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Cart {itemCount > 0 && `(${itemCount})`}
              </Link>
              <Link
                href="/account"
                onClick={closeMobileMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Account
              </Link>
              <Link
                href="/orders"
                onClick={closeMobileMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Orders
              </Link>
              {!authLoading && user ? (
                <>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin/dashboard"
                      onClick={closeMobileMenu}
                      className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : !authLoading ? (
                <>
                  <hr className="my-2" />
                  <Link
                    href="/auth/login"
                    onClick={closeMobileMenu}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={closeMobileMenu}
                    className="block rounded-md px-3 py-2 text-base font-medium text-white"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      transition: 'background-color 200ms cubic-bezier(0.33, 1, 0.68, 1)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
                  >
                    Sign Up
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
