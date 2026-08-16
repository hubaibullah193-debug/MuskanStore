'use client';

/**
 * User Menu Component
 * Displays user info or login/signup links
 */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

export function UserMenu() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">{user.name || user.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/login"
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Sign In
      </Link>
      <span className="text-gray-300">|</span>
      <Link
        href="/auth/signup"
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Sign Up
      </Link>
    </div>
  );
}
