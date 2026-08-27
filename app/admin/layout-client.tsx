'use client';

/**
 * Admin Layout Client Component
 * Responsive sidebar navigation with logout functionality
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/app/auth/actions';

interface AdminLayoutClientProps {
  user: { id: string; email: string; name?: string; role: string } | null;
  children: React.ReactNode;
}

export default function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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

  const sidebarContent = (expanded: boolean) => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <button
          onClick={() => expanded ? setDesktopExpanded(!desktopExpanded) : setMobileOpen(false)}
          className="font-bold text-lg hover:text-gray-300"
        >
          {expanded ? 'Admin' : '⚙️'}
        </button>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-gray-400 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
                 ? 'bg-accent text-accent-foreground'
                 : 'text-gray-300 hover:bg-gray-800'
             }`}
          >
            <span className="text-xl">{item.icon}</span>
            {expanded && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-700 space-y-3">
        {expanded && user && (
          <div className="text-sm text-gray-300 truncate">
            <div className="font-semibold truncate">{user.name || 'Admin'}</div>
            <div className="text-gray-500 text-xs truncate">{user.email}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full px-4 py-2 text-sm text-error hover:text-white hover:bg-error bg-[color-mix(in_oklch,var(--color-error)_14%,transparent)] rounded-lg transition-colors disabled:opacity-50"
        >
          {expanded ? (loggingOut ? 'Logging out...' : 'Logout') : '🚪'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-paper">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex ${
          desktopExpanded ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex-col flex-shrink-0`}
      >
        {sidebarContent(desktopExpanded)}
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar Drawer */}
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col z-50">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-gray-900 text-white px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-300 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold">Admin</span>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
