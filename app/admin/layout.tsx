/**
 * Admin Layout
 * Server component that verifies admin access
 * Provides navigation sidebar
 */

import { redirect } from 'next/navigation';
import { verifyAdminAccess, getCurrentUser } from '@/server/actions/auth';
import AdminLayoutClient from './layout-client';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify admin access
  const adminAccess = await verifyAdminAccess();
  if (!adminAccess) {
    redirect('/auth/login?redirectUrl=/admin/dashboard');
  }

  // Get current user for display
  const user = await getCurrentUser();

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
