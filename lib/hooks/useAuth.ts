'use client';

/**
 * useAuth Hook
 * Manages authenticated user state and session.
 *
 * The session result is cached at module scope for a short TTL so that multiple
 * components mounted on the same page (e.g. header + user menu) share a single
 * server round-trip instead of each issuing their own.
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

interface CachedSession {
  user: User | null;
  ts: number;
}

const SESSION_TTL = 30_000;
let sessionCache: CachedSession | null = null;
let inflight: Promise<User | null> | null = null;

async function fetchSession(): Promise<User | null> {
  const now = Date.now();
  if (sessionCache && now - sessionCache.ts < SESSION_TTL) {
    return sessionCache.user;
  }
  if (!inflight) {
    inflight = getCurrentSessionAction()
      .then((session) => {
        const user = session?.user ?? null;
        sessionCache = { user, ts: Date.now() };
        return user;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(sessionCache?.user ?? null);
  const [loading, setLoading] = useState(sessionCache ? false : true);

  useEffect(() => {
    let active = true;
    fetchSession()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch((error) => {
        console.error('Failed to fetch session:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    try {
      await logoutAction();
      sessionCache = { user: null, ts: Date.now() };
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return { user, loading, logout };
}
