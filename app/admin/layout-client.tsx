'use client';

/**
 * Admin Layout Client Component
 * Sidebar navigation with logout functionality
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/server/actions/auth';

interface AdminLayoutClientProps {
  user: { id: string; email: string; name?: string; role: string } | null;
  children: React.ReactNode;
}

export default function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/orders', label: 'Orders', icon: '📦' },
    { href: '/admin/refunds', label: 'Refunds', icon: '💰' },
    { href: '/admin/shipments', label: 'Shipments', icon: '🚚' },
    { href: '/admin/products', label: 'Products', icon: '🛍️' },
    { href: '/admin/bundles', label: 'Bundles', icon: '🎁' },
    { href: '/admin/inventory', label: 'Inventory', icon: '📈' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const result = await logoutAction();
      if (result.success) {
        router.push('/auth/login');
      }
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full text-left font-bold text-lg hover:text-gray-300"
          >
            {sidebarOpen ? 'Admin' : '⚙️'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-700 space-y-3">
          {sidebarOpen && user && (
            <div className="text-sm text-gray-300 truncate">
              <div className="font-semibold truncate">{user.name || 'Admin'}</div>
              <div className="text-gray-500 text-xs truncate">{user.email}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-600 bg-red-700/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {sidebarOpen ? (loggingOut ? 'Logging out...' : 'Logout') : '🚪'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
