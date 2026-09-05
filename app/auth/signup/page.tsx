'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Public signup is not available - admins are provisioned via
    // `npm run provision-admin <email>` (service_role key)
    // Regular customers are redirected to products
    router.push('/products');
  }, [router]);

  // Return a minimal render to avoid hydration issues
  // (Admin signup not available via public flow)
  return null;
}