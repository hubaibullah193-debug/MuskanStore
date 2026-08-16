'use client';

/**
 * useAuth Hook
 * Manages authenticated user state and session
 */

import { useEffect, useState } from 'react';
import { getCurrentSessionAction, logoutAction } from '@/app/auth/actions';

export interface User {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  role: 'customer' | 'admin';
  emailVerified: boolean;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getCurrentSessionAction();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  const logout = async () => {
    try {
      await logoutAction();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return { user, loading, logout };
}
