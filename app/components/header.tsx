'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { Button } from '@/app/components/ui/button';

export function Header() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading: authLoading, logout } = useAuth();
  const { itemCount } = useCart();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  // Close the mobile menu on Escape and return focus to the toggle button so
  // keyboard users are not trapped.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
      <nav aria-label="Primary" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="font-display text-xl font-bold text-foreground">Muskan Care</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            <Link href="/products" className="text-secondary transition-colors hover:text-foreground">
              Products
            </Link>
            <Link href="/cart" data-testid="cart-link" className="relative text-secondary transition-colors hover:text-foreground">
              Cart
              {itemCount > 0 && (
                <span data-testid="cart-badge" className="absolute -top-2 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            <Link href="/account" className="text-secondary transition-colors hover:text-foreground">
              Account
            </Link>
            <Link href="/orders" className="text-secondary transition-colors hover:text-foreground">
              Orders
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden items-center space-x-4 md:flex">
            {!authLoading && user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    className="text-sm text-secondary transition-colors hover:text-foreground"
                  >
                    Admin
                  </Link>
                )}
                <span className="text-sm text-secondary">{user.name || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-secondary transition-colors hover:text-foreground"
                >
                  Logout
                </button>
              </>
            ) : !authLoading ? (
              <>
                <Button href="/auth/login" variant="ghost" size="sm">
                  Sign In
                </Button>
                <Button href="/auth/signup" variant="primary" size="sm">
                  Sign Up
                </Button>
              </>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <button
            ref={menuButtonRef}
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-paper-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
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
          <div
            id="mobile-menu"
            role="navigation"
            aria-label="Mobile navigation"
            className="border-t border-border md:hidden"
          >
            <div className="space-y-1 px-2 pb-3 pt-2">
              <Link
                href="/products"
                onClick={closeMobileMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-secondary hover:bg-paper-2 hover:text-foreground"
              >
                Products
              </Link>
              <Link
                href="/cart"
                onClick={closeMobileMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-secondary hover:bg-paper-2 hover:text-foreground"
              >
                Cart {itemCount > 0 && `(${itemCount})`}
              </Link>
              <Link
                href="/account"
                onClick={closeMobileMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-secondary hover:bg-paper-2 hover:text-foreground"
              >
                Account
              </Link>
              <Link
                href="/orders"
                onClick={closeMobileMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-secondary hover:bg-paper-2 hover:text-foreground"
              >
                Orders
              </Link>
              {!authLoading && user ? (
                <>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin/dashboard"
                      onClick={closeMobileMenu}
                      className="block rounded-md px-3 py-2 text-base font-medium text-secondary hover:bg-paper-2 hover:text-foreground"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-secondary hover:bg-paper-2 hover:text-foreground"
                  >
                    Logout
                  </button>
                </>
              ) : !authLoading ? (
                <>
                  <hr className="my-2 border-border" />
                  <Link
                    href="/auth/login"
                    onClick={closeMobileMenu}
                    className="block rounded-md px-3 py-2 text-base font-medium text-secondary hover:bg-paper-2 hover:text-foreground"
                  >
                    Sign In
                  </Link>
                  <Button
                    href="/auth/signup"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={closeMobileMenu}
                  >
                    Sign Up
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
