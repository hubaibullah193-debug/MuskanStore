'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Only admins/owners can access the login page
    // Non-admin users are redirected to products
    router.push('/products');
  }, [router]);

  // Return a minimal render to avoid hydration issues
  // (Login form only for admin/owner - see middleware protection)
  return null;
}